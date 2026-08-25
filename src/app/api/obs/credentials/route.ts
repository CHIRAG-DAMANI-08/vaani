import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { rateLimit } from "@/lib/rate-limit";
import { validateCSRF } from "@/lib/csrf";
import { encryptValue } from "@/lib/encryption";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Rate Limiting (5 per 15 min per PRD)
  const rateLimitResult = rateLimit(`${userId}:obs-mutate`, { 
    maxRequests: 5, 
    windowMs: 15 * 60 * 1000 
  });
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: Math.ceil(rateLimitResult.remainingMs / 1000) },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimitResult.remainingMs / 1000).toString() } }
    );
  }

  // CSRF validation
  const csrfValid = await validateCSRF(request, userId);
  if (!csrfValid) {
    return NextResponse.json({ error: "FORBIDDEN", message: "CSRF token mismatch." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const hostRaw = body.host;
  const portRaw = body.port;
  const passwordRaw = body.password !== undefined ? body.password : "";

  // 1. Validate Host
  if (typeof hostRaw !== "string") {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { host: "Host must be a string." } }, { status: 400 });
  }
  const host = hostRaw.trim();
  if (host.length < 1 || host.length > 253) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { host: "Host must be between 1 and 253 characters." } }, { status: 400 });
  }
  if (host.includes("://") || host.includes("/")) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { host: "Host must not contain protocol (://) or paths." } }, { status: 400 });
  }
  const hostRegex = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-\.]{0,251}[a-zA-Z0-9])$/;
  if (!hostRegex.test(host)) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { host: "Invalid hostname or IP address format." } }, { status: 400 });
  }

  // 2. Validate Port
  const port = typeof portRaw === "string" ? parseInt(portRaw, 10) : portRaw;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { port: "Port must be an integer between 1024 and 65535." } }, { status: 400 });
  }

  // 3. Validate Password
  if (typeof passwordRaw !== "string") {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { password: "Password must be a string." } }, { status: 400 });
  }
  const password = passwordRaw.trim();
  if (password.length > 200) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { password: "Password maximum length is 200 characters." } }, { status: 400 });
  }
  if (password.includes("\x00")) {
    return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { password: "Password cannot contain null bytes." } }, { status: 400 });
  }
  if (password.length > 0) {
    const passwordAllowlist = /^[a-zA-Z0-9!@#\$%\^&\*\-_=\+]+$/;
    if (!passwordAllowlist.test(password)) {
      return NextResponse.json({ error: "OBS_CREDENTIALS_INVALID", fields: { password: "Password contains unsupported characters." } }, { status: 400 });
    }
  }

  try {
    const obsPasswordEnc = password.length > 0 ? encryptValue(password) : null;

    await connectToDatabase();
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        obsHost: host,
        obsPort: port,
        obsPasswordEnc,
        obsCredentialsUpdatedAt: new Date()
      },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[obs/credentials] POST error for ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Rate Limiting (10 per 1 hour per PRD)
  const rateLimitResult = rateLimit(`${userId}:obs-delete`, { 
    maxRequests: 10, 
    windowMs: 60 * 60 * 1000 
  });
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: Math.ceil(rateLimitResult.remainingMs / 1000) },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimitResult.remainingMs / 1000).toString() } }
    );
  }

  // CSRF validation
  const csrfValid = await validateCSRF(request, userId);
  if (!csrfValid) {
    return NextResponse.json({ error: "FORBIDDEN", message: "CSRF token mismatch." }, { status: 403 });
  }

  try {
    await connectToDatabase();
    
    // Check if exists
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.obsHost === null) {
        return NextResponse.json({ error: "CREDENTIALS_NOT_FOUND" }, { status: 404 });
    }

    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        obsHost: null,
        obsPort: null,
        obsPasswordEnc: null,
        obsCredentialsUpdatedAt: null
      }
    );

    // Close any active relay connections from the global scope (by telling the relay to close, though we don't have a direct hook here easily into WSS). 
    // We can signal the client via a response and the client will close it, OR we just let the client close it.
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[obs/credentials] DELETE error for ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
