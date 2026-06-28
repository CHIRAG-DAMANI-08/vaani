# Vaani — System Architecture

```mermaid
graph TB
    subgraph Client["🌐 Browser (Next.js Client)"]
        LP["Landing Page\n/"]
        AUTH["Auth Pages\n/sign-in /sign-up /sso-callback"]
        DASH["Dashboard\n/dashboard"]
        CHAN["Channels\n/channels"]
        SET["Settings\n/settings"]

        DASH_SHELL["DashboardShell\n(obs-relay-client, PreflightModal,\nOnboardingWizard)"]
        OBS_UI["OBS WebSocket\n(obs-websocket-js)"]
    end

    subgraph Server["⚙️ Node.js Server (server.ts)"]
        NEXT["Next.js HTTP Handler"]
        WS["WebSocket Server\n/ws/relay"]
        NMS["Node Media Server\nRTMP :1935"]
        RTMP_STREAMER["RTMPStreamer\n(FFmpeg tee → YouTube/Twitch)"]
        AUDIO_EXTRACT["Audio Extraction\n(FFmpeg → PCM → VAD → WAV)"]
        PIPELINE_QUEUE["Pipeline Queue\n(per-user serial, max 10)"]
    end

    subgraph APIS["API Routes"]
        API_CHAN["/api/channels\nGET · POST · DELETE"]
        API_KEY["/api/key\nDELETE · POST(validate/update)"]
        API_KEY_STATUS["/api/key/status · /api/key/status"]
        API_OBS["/api/obs/credentials\nPOST · DELETE"]
        API_OBS_ST["/api/obs/status"]
        API_SESS["/api/sessions\nGET · export"]
        API_CSRF["/api/csrf"]
        API_TEST["/api/test-pipeline"]
        API_HEALTH["/api/health"]
    end

    subgraph Lib["📦 Core Libraries"]
        SARBAM["sarvam-pipeline\nSTT → Translate → TTS"]
        LANG["language-registry\n8 languages"]
        ENC["encryption\nAES-256-GCM"]
        CSRF["csrf\ndouble-submit"]
        RL["rate-limit"]
        MONGO["mongodb\n(mongoose connect)"]
        SESSION["stream-session\n(per-user state)"]
        RELAY["obs-relay-client\n(browser-side WS)"]
    end

    subgraph Ext["🔌 External Services"]
        CLERK["Clerk Auth"]
        SARVAM_API["Sarvam AI API\nSTT · Translate · TTS"]
        YT["YouTube RTMP"]
        TW["Twitch RTMP"]
        OBS["OBS Studio"]
    end

    subgraph DB["🗄️ MongoDB"]
        USERS["users\n clerkId, sarvamKeyEnc,\nobsPasswordEnc"]
        CHANNELS["channels\n clerkId, languageId,\nrtmpKey(encrypted)"]
        SESSIONS["sessions\nstats · transcript · cost"]
        WAITLIST["waitlist_entries"]
    end

    OBS -->|"RTMP stream"| NMS
    DASH_SHELL -->|"initRelay (JWT)"| WS
    WS -->|"audio levels · session · pipeline"| DASH_SHELL
    SET -->|"CRUD"| API_KEY
    SET -->|"CRUD"| API_OBS
    CHAN -->|"CRUD"| API_CHAN
    DASH -->|"GET"| API_OBS_ST
    DASH -->|"GET"| API_KEY_STATUS
    DASH -->|"GET"| API_SESS

    LP -->|"joinWaitlist\n(server action)"| WAITLIST
    RELAY -->|"connect\n(localhost:8080)"| OBS

    NMS -->|"postPublish\n(userId = streamKey)"| NMS
    NMS -->|"handleGoLive"| RTMP_STREAMER
    NMS -->|"startAudioExtraction"| AUDIO_EXTRACT

    AUDIO_EXTRACT -->|"PCM → VAD → WAV → base64"| PIPELINE_QUEUE
    PIPELINE_QUEUE -->|"processAudioChunk"| PIPELINE_QUEUE
    PIPELINE_QUEUE -->|"drainPipelineQueue"| SARBAM
    SARBAM -->|"runPipeline\nSTT → TTS per lang"| RTMP_STREAMER
    RTMP_STREAMER -->|"FFmpeg tee"| YT
    RTMP_STREAMER -->|"FFmpeg tee"| TW

    SARBAM -->|"REST"| SARVAM_API
    API_KEY -->|"validateSarvamKey"| SARVAM_API

    API_CHAN -->|"encryptKey / decryptKey"| ENC
    API_KEY -->|"encryptKey"| ENC
    API_OBS -->|"encryptKey"| ENC
    API_TEST -->|"decryptKey"| ENC

    API_CSRF -->|"token"| API_KEY
    API_CSRF -->|"validate"| API_CHAN
    API_CSRF -->|"validate"| API_OBS
    API_CSRF -->|"validate"| API_TEST
    API_CSRF -->|"validate"| API_SESS

    API_KEY -->|"checkRateLimit"| RL
    API_OBS -->|"checkRateLimit"| RL

    API_CHAN --> MONGO
    API_KEY --> MONGO
    API_OBS --> MONGO
    API_SESS --> MONGO
    SESSION --> MONGO
    API_TEST --> MONGO

    MONGO --> USERS
    MONGO --> CHANNELS
    MONGO --> SESSIONS
    MONGO --> WAITLIST

    WS -->|"JWT verify"| CLERK
    DASH -->|"useUser / auth"| CLERK
    CHAN -->|"auth"| CLERK
    SET -->|"auth"| CLERK
    AUTH -->|"Clerk UI"| CLERK
    LP -->{"ClerkProvider"}| CLERK

    SARBAM --> LANG
    API_CHAN --> LANG
    SESSION -->|"sessionManager"| WS
    API_KEY_STATUS -->|"sarvamKeyEnc"| USERS
    API_OBS_ST -->|"obsHost/Port"| USERS

    style Client fill:#E8F4FD,stroke:#1E6FD9,color:#000
    style Server fill:#FFF3E0,stroke:#F5821F,color:#000
    style APIS fill:#F3E5F5,stroke:#7B1FA2,color:#000
    style Lib fill:#E8F5E9,stroke:#2E7D32,color:#000
    style Ext fill:#FFEBEE,stroke:#C62828,color:#000
    style DB fill:#ECEFF1,stroke:#455A64,color:#000
```

## Component Map

```mermaid
graph LR
    subgraph Frontend["Frontend Pages & Components"]
        direction TB
        P["/ — Marketing\n· HeroSection · Features\n· PlatformStack · Security\n· SamvaadDemo · CTA"]
        A["(auth)/ — Sign-in/up\n· Clerk OAuth + MFA"]
        DS["(dashboard)/DashboardShell"]
        D["(dashboard)/ — Overview\nStatusRow · PipelineMonitor\nLiveTranscript · SessionStats"]
        C["(dashboard)/ — Channels\nChannel cards · Edit/Delete/Toggle"]
        S["(dashboard)/ — Settings\nKey mgmt · OBS creds\nTTS settings"]
        NF["/not-found.tsx"]
        ERR["/error.tsx"]
    end

    subgraph Marketing["Marketing Components"]
        NAV["Navbar"]
        HERO["HeroSection"]
        FEAT["FeaturesSection"]
        PLAT["PlatformStack"]
        SEC["SecuritySection"]
        SAM["SamvaadDemo"]
        TEST["TestimonialsSection"]
        CTA["CTABanner"]
        FOOTER["Footer"]
        WAITL["WaitlistModal"]
    end

    subgraph Dash["Dashboard Components"]
        PREF["PreflightModal"]
        ONB["OnboardingWizard"]
        AUD["AudioMeter"]
        SKEL["Skeleton Loaders"]
    end

    P --> NAV & HERO & FEAT & PLAT & SEC & SAM & TEST & CTA & FOOTER & WAITL
    DS --> D & C & S & PREF & ONB & AUD
    DS --> SKEL

    style Frontend fill:#FFF8E1,stroke:#F5821F,color:#000
    style Marketing fill:#FFF3E0,stroke:#F5821F,color:#000
    style Dash fill:#FFF3E0,stroke:#F5821F,color:#000
```

## Audio Pipeline Flow

```mermaid
sequenceDiagram
    participant OBS as OBS Studio
    participant NMS as Node Media Server
    participant FF as FFmpeg
    participant VAD as VAD + WAV
    participant PQ as Pipeline Queue
    participant SP as sarvam-pipeline
    participant ST as Sarvam STT
    participant TR as Sarvam Translate
    participant TT as Sarvam TTS
    participant RS as RTMPStreamer
    participant YT as YouTube/Twitch

    OBS->>NMS: RTMP stream (userId)
    NMS->>FF: handleGoLive → startAudioExtraction
    FF->>VAD: PCM 16kHz mono chunks
    VAD->>VAD: RMS + ZCR → filter silence
    VAD->>PQ: base64 WAV chunk
    PQ->>PQ: enqueue (drop oldest if >10)
    PQ->>SP: drainPipelineQueue → serial
    SP->>ST: STT (saarika:v2.5)
    ST-->>SP: transcript + language
    SP->>TR: Translate per target lang (parallel)
    TR-->>SP: translated text
    SP->>TT: TTS per lang (bulbul:v3)
    TT-->>SP: audioBase64 per lang
    SP->>RS: pushAudio (stereo mix)
    RS->>YT: FFmpeg tee (RTMP)
    RS->>TW: FFmpeg tee (RTMP)
```

## WebSocket Protocol

```mermaid
sequenceDiagram
    participant DS as Dashboard Browser
    participant WS as /ws/relay
    participant SV as server.ts

    DS->>WS: connect + JWT (subprotocol)
    WS->>SV: verifyToken (Clerk)
    SV-->>DS: OBS_CREDENTIALS
    SV-->>DS: PING (every 30s)
    DS->>SV: PONG

    DS->>SV: OBS_CONNECTED / DISCONNECTED
    DS->>SV: SET_TRANSLATION_SOURCE
    DS->>SV: SET_TTS_SETTINGS
    DS->>SV: STOP_STREAM

    SV->>DS: SESSION_STARTED / STOPPED
    SV->>DS: SESSION_SNAPSHOT (every 1s)
    SV->>DS: PIPELINE_STAGE_UPDATE / RESULT / ERROR
    SV->>DS: RTMP_ERROR / AUDIO_LEVEL
```

## Auth & API Security Flow

```mermaid
flowchart TD
    REQ["API Request"] --> CSRF{Mutation?}
    CSRF -->|POST/DELETE/PUT| VAL["validateCSRF\n(x-csrf-token header\n== __vaani_csrf cookie)"]
    VAL -->|FAIL| R403["403 Forbidden"]
    VAL -->|PASS| AUTH{Protected Route?}
    CSRF -->|GET| AUTH
    AUTH -->|Yes| JWT["Clerk useUser / auth\n(JWT from cookie)"]
    AUTH -->|No| RL["Rate Limit\n(per-IP or per-user pool)"]
    JWT -->|Unauth| R401["401 Unauthorized"]
    JWT -->|Auth| RL
    RL -->|Exceeded| R429["429 Too Many Requests\nRetry-After header"]
    RL -->|OK| HANDLER["Route Handler\n→ validate input\n→ sanitize key\n→ DB query\n→ respond"]
```

## Data Model Relations

```mermaid
erDiagram
    USERS ||--o{ CHANNELS : owns
    USERS ||--o{ SESSIONS : has
    USERS {
        string clerkId PK
        string sarvamKeyEnc
        string sarvamKeyLast4
        string obsHost
        int obsPort
        string obsPasswordEnc
        boolean onboardingComplete
    }
    CHANNELS {
        string clerkId FK
        string languageId "enum: hi, ta, te, bn, kn, ml, gu, pa"
        string languageName
        string script
        string rtmpKey "encrypted"
        string rtmpUrl
        boolean enabled
    }
    SESSIONS {
        string clerkId FK
        date startedAt
        date endedAt
        int durationMs
        string[] activeLanguages
        int chunksProcessed
        float estimatedCostINR
        string[] transcript
    }
    WAITLIST_ENTRIES {
        string email PK
        string name
        string source
        string status "pending|invited|converted"
    }
```
