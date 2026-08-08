# Deploying Vaani to Oracle Cloud (DuckDNS domain)

One VM runs **everything**: the Next.js dashboard + WebSocket relay (port 3000),
the RTMP ingest server (port 1935), and the FFmpeg re-mux to your destinations.
MongoDB stays on **MongoDB Atlas** (already cloud) — you don't install a database.

```
OBS (streamer's PC) ──rtmp://<domain>:1935/live/<clerkId>──▶ Oracle VM
                                                              │  NodeMediaServer (1935)
                                                              │  Next + WS relay (3000)
                                                              │  FFmpeg re-mux (video copy)
                                                              ▼
                                              YouTube / Twitch channels
```

Video is **stream-copied, never re-encoded**, so the VM does little CPU work —
but it *does* upload the full stream once **per destination** (the `tee` muxer).

> **These two production gotchas are already handled in code:**
> 1. The OBS ingest URL was hardcoded to `rtmp://localhost:1935/live`. OBS runs
>    on the *streamer's* PC, so it now derives the host from the dashboard's own
>    hostname (`src/lib/ingest.ts`). In production it shows `rtmp://<domain>:1935/live`.
> 2. The WebSocket relay rejects any origin not in `ALLOWED_ORIGINS` (defaults to
>    `localhost`). **You must set `ALLOWED_ORIGINS`** (step 6) or the dashboard's
>    live updates and "Go Live" won't connect.

---

## 1. Create the Oracle VM

- **Shape:** use the Free Tier **Ampere A1** (ARM, up to 4 OCPU / 24 GB) if it's
  available in your region. The ARM Docker image is fine (`node:20-bookworm-slim`
  and apt `ffmpeg` both support arm64). The AMD `E2.1.Micro` (1 GB RAM) works but
  is tight for the Next.js build — prefer Ampere.
- **Image:** Ubuntu 22.04 or 24.04 LTS.
- **Public IP:** note it. **Reserve it** (Network → IP management → Reserved
  public IPs → attach to the instance) so a reboot doesn't change it. If you
  don't reserve it, the DuckDNS updater in step 2 keeps DNS pointed correctly.

## 2. Point DuckDNS at the VM

1. On the DuckDNS dashboard, set the **A record** for your subdomain to the
   VM's public IP.
2. Install the updater so it re-points if the IP ever changes:
   ```bash
   sudo crontab -l > /tmp/cron 2>/dev/null || true
   echo "*/5 * * * * curl -s \"https://www.duckdns.org/update?domains=<your-subdomain>&token=<your-token>&ip=\" >/dev/null" >> /tmp/cron
   sudo crontab /tmp/cron
   ```
   (Token is on the DuckDNS dashboard. The empty `ip=` makes DuckDNS use the
   VM's egress IP, which equals its public IP.)

## 3. Open the firewall — **two layers**

Oracle has *two* firewalls; both must allow traffic:

**a) Oracle security list (VCN):** your subnet needs ingress rules for
`TCP 22` (SSH, usually present), `TCP 80` + `TCP 443` (web + TLS), and
`TCP 1935` (**RTMP — the one people forget**). Source `0.0.0.0/0`.

**b) OS firewall:** if the image is Oracle Linux, `firewalld` is active —
open the ports (`sudo firewall-cmd --add-port={80,443,1935}/tcp --permanent && sudo firewall-cmd --reload`).
Ubuntu's `ufw` is typically inactive by default; if you enable it, allow the same.

## 4. Clerk (production domain)

1. In the Clerk dashboard, use the **production instance** keys.
2. Add your domain (e.g. `https://<your-subdomain>.duckdns.org`) to Clerk.
   Clerk gives you DNS records (CNAME/TXT) to verify — **add them on DuckDNS**
   (it supports CNAME and TXT records).
3. Set the Clerk redirect URLs (sign-in fallback, etc.) to your production URL.

## 5. HTTPS (Caddy — the lazy option)

DuckDNS domains work with Let's Encrypt HTTP-01, so **Caddy** is one file:

```bash
sudo apt install caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
<your-subdomain>.duckdns.org {
    reverse_proxy localhost:3000
}
EOF
sudo systemctl restart caddy
```

Caddy issues the cert, terminates TLS, and proxies WebSockets automatically.
(If you prefer nginx: `apt install nginx` + `certbot --nginx`.) Keep RTMP on
plain `rtmp://` port 1935 — OBS supports it and NMS would need TLS config for
`rtmps://` (skip for now).

## 6. `.env` on the server

Required vars (the app **exits** if these are missing):

```
CLERK_SECRET_KEY=<production instance secret key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<production instance publishable key>
MONGODB_URI=<your Atlas connection string>
ENCRYPTION_KEY=<64-char hex — same one you use locally>
```

Plus:

```
ALLOWED_ORIGINS=https://<your-subdomain>.duckdns.org   # REQUIRED or WS relay blocks the dashboard
RESEND_API_KEY=<key>                                   # contact/waitlist email (optional)
RESEND_FROM_EMAIL=Vaani <onboarding@resend.dev>        # optional
PORT=3000
NODE_ENV=production
```

## 7. Deploy (Docker Compose — already in the repo)

```bash
# Docker Engine + compose plugin (Ubuntu):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after

cd ~
git clone https://github.com/CHIRAG-DAMANI-08/vaani.git
cd vaani
# write .env (step 6)
docker compose up -d --build
docker compose logs -f
```

Check `http://<your-subdomain>.duckdns.org` — Caddy will redirect to HTTPS.

## 8. OBS (streamer side)

The dashboard's **Stream Settings** and the **Onboarding wizard** now show the
correct server URL automatically: `rtmp://<your-subdomain>.duckdns.org:1935/live`.
In OBS use **Streaming → Custom**:
- **Server:** `rtmp://<your-subdomain>.duckdns.org:1935/live`
- **Stream key:** your Clerk user ID (shown on the same dashboard card)

---

## Problems you'll hit (honest list)

- **Bandwidth:** the VM uploads the stream once per destination channel. At
  ~4.5 Mbps for 1080p, 3 destinations ≈ 13.5 Mbps sustained egress. The free
  tier's 10 TB/month egress is plenty for normal streaming hours; it's per-channel
  that adds up if you fan out widely.
- **Latency:** RTMP itself adds 2–5 s, and translated audio trails the video by
  the pipeline time per 3 s chunk (STT + translate + TTS ≈ 2–8 s typical). This is
  the A/V sync problem from the pipeline work, not a deployment issue — see
  `src/lib/rtmp-streamer.ts` and the sync-schedule work.
- **Stream key == Clerk user ID:** `postPublish` only accepts a stream key that
  maps to a currently-connected dashboard WebSocket, so a random attacker can't
  start a session. But while a victim is actively live, someone who knows their
  Clerk ID could still hijack the publish. The real fix (per-user stream secret,
  surfaced in Stream Settings) is a v1.2 item.
- **Free-tier limits:** the A1 shape and egress are capped; if you exceed them,
  the instance or network may throttle. Reserve the public IP to avoid DNS churn
  on reboot.
