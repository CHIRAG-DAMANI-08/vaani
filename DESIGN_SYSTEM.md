# Vaani Dashboard Design System

**Version:** 1.0
**Last Updated:** 2026-07-23
**Scope:** Dashboard, Settings, Channels pages (protected area)

---

## 1. Design Philosophy

**Glass Morphism + Editorial Minimalism** — The dashboard uses layered glass panels (backdrop-blur, semi-transparent whites) over a vibrant animated mesh background. Typography is editorial (Syne for headlines, DM Sans for UI labels, JetBrains Mono for data). Color is used semantically: saffron/orange for primary actions, teal for translation, blue for STT, green for live/success, red for errors.

**Motion as Communication** — Every state change has purposeful animation: pipeline stages shimmer when active, live indicators pulse, cards lift on hover, content fades/slides in. Reduced-motion is respected.

---

## 2. Color System

### 2.1 Core Palette (CSS Custom Properties)

```css
:root {
  /* Background / Surface */
  --background: #F5F5F0;           /* Page base (warm off-white) */
  --card-bg: #FFFFFF;              /* Pure white cards */
  --card-border: #E8E8E4;          /* Subtle card borders */
  --muted: #6B6B6B;                /* Muted text */
  --section-bg: #EEEEF0;           /* Section backgrounds */

  /* Dashboard Shell */
  --dash-sidebar: #FAFAF8;         /* Sidebar background */
  --dash-sidebar-border: #EDEDEA;  /* Sidebar border */

  /* Typography */
  --text-primary: #1A1A1F;         /* Headlines, primary text */
  --text-secondary: #5A5854;       /* Secondary text */
  --text-tertiary: #9A9690;        /* Tertiary / placeholder */
  --text-muted: #9A9690;           /* Same as tertiary */

  /* Brand Accents */
  --accent-saffron: #F5821F;       /* PRIMARY — CTAs, active states, brand */
  --accent-teal: #0D9E89;          /* Translation stage, secondary actions */
  --accent-amber: #E86F2A;         /* TTS stage, warnings */
  --accent-blue: #1E6FD9;          /* STT stage, info */
  --accent-green: #7CB342;         /* Success (legacy) */
  --accent-red: #EF4444;           /* Errors, danger */

  /* Status */
  --status-live: #22C55E;          /* Live indicator (green-500) */
  --status-error: #EF4444;         /* Error state */
  --status-ready: #A1A1AA;         /* Neutral ready */

  /* Pipeline Stage Colors (semantic) */
  --stage-stt: #1E6FD9;            /* Speech-to-Text — blue */
  --stage-translate: #0D9E89;      /* Translation — teal */
  --stage-tts: #F5821F;            /* Text-to-Speech — saffron */
  --stage-stream: #22C55E;         /* Output Stream — green */

  /* Language Accents (used on channel cards) */
  --lang-hindi: #F5821F;
  --lang-tamil: #1E6FD9;
  --lang-telugu: #0D9E89;
  --lang-kannada: #E86F2A;

  /* Shared Dimensions */
  --dash-nav-h: 60px;              /* Mobile tab bar height */
  --dash-sidebar-w: 220px;         /* Desktop sidebar width (actual: 280px) */
}
```

### 2.2 Semantic Color Usage

| Context | Color | Usage |
|---------|-------|-------|
| Primary CTA | `--accent-saffron` | Go Live, Save, Validate, Test Pipeline |
| Secondary Action | `--accent-teal` | Update key, Connect OBS |
| Danger | `--accent-red` | Remove key, Disconnect, Delete channel |
| Live/Active | `--status-live` | Streaming badges, pulse rings |
| Success | `#10B981` (green-500) | Saved states, active toggles |
| Warning | `--accent-amber` / `#F59E0B` | Rate limits, buffer warnings |
| Info | `--accent-blue` / `#3B82F6` | Server URL, chunks/sec |

### 2.3 Glass Surface System

Three tiers of glass morphism, used consistently:

```css
/* Glass 1 — Panel (main containers, sidebar) */
.glass-panel {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.04);
  border-radius: 28px;
}

/* Glass 2 — Card (sections, channel cards, stat cards) */
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(28px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
  border-radius: 24px;
}

/* Glass 3 — Modal (dialogs, preflight, confirmations) */
.glass-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  border-radius: 32px;
}
```

### 2.4 Background Mesh (DashboardShell)

Three animated gradient orbs floating behind the glass layout:

```css
/* Orb 1 — Warm saffron/amber */
background: linear-gradient(135deg, #F9AB7F 0%, #F5CE98 100%);
width: 80vw; height: 80vh; left: -10%; top: -10%;
animation: float-slow 20s ease-in-out infinite;

/* Orb 2 — Purple/pink */
background: linear-gradient(135deg, #A78BFA 0%, #FDA4AF 100%);
width: 70vw; height: 70vh; right: -5%; bottom: -10%;
animation: float-slow 25s ease-in-out infinite reverse;

/* Orb 3 — Teal/blue */
background: linear-gradient(135deg, #6EE7B7 0%, #3B82F6 100%);
width: 60vw; height: 60vh; left: 30%; top: 40%;
animation: float-slow 30s ease-in-out infinite;
```

---

## 3. Typography

### 3.1 Font Stack (Loaded via `next/font` in `layout.tsx`)

```css
--font-sans: var(--font-inter);      /* Body fallback */
--font-serif: var(--font-playfair);  /* Not used in dashboard */
--font-syne: var(--font-syne);       /* HEADLINES — Display, bold, distinctive */
--font-dm-sans: var(--font-dm-sans); /* UI LABELS — Compact, uppercase, tracking-wide */
--font-jetbrains: var(--font-jetbrains); /* MONO — API keys, code, metrics */
```

### 3.2 Type Scale

| Element | Font | Size | Weight | Tracking | Color |
|---------|------|------|--------|----------|-------|
| Page H1 (Dashboard/Settings/Channels) | Syne | 32–36px | Bold | Tight | `--text-primary` |
| Section H2 | Syne | 16–20px | Bold | Tight | `--text-primary` |
| Section subtitle | DM Sans | 12–14px | Regular | Normal | `--text-tertiary` |
| Nav labels | DM Sans | 11px | Bold | 0.15–0.2em uppercase | `--text-tertiary` |
| Card titles | Syne | 18–22px | Bold | Tight | `--text-primary` |
| Card subtitles | DM Sans | 13–14px | Medium | Normal | `--text-secondary` |
| Body text | DM Sans | 13–14px | Regular | Normal | `--text-secondary` |
| Small labels / badges | DM Sans | 11–12px | Bold | 0.1em uppercase | Contextual |
| Data / metrics | Syne | 20–28px | Bold | Tight | `--text-primary` |
| Mono (keys, RMS, URLs) | JetBrains | 13–14px | Regular | Normal | `--text-primary` |

### 3.3 Gradient Text (Brand)

```css
.text-gradient {
  background: linear-gradient(90deg, #1A1A1F 0%, #F5821F 60%, #1E6FD9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 4. Spacing & Layout System

### 4.1 Base Unit

**4px (0.25rem)** — All spacing, radii, and dimensions are multiples of 4px.

### 4.2 Border Radius Scale

| Radius | Value | Usage |
|--------|-------|-------|
| `--radius-sm` | 8px | Pills, badges, small inputs |
| `--radius-md` | 10px | Buttons, form inputs |
| `--radius-lg` | 12px | Selects, larger pills |
| `--radius-xl` | 14px | Secondary buttons |
| `--radius-2xl` | 16px | Primary inputs, section cards |
| `--radius-3xl` | 18px | Nav items |
| `--radius-4xl` | 24px | Glass cards |
| `--radius-5xl` | 28px | Glass panels, main sections |
| `--radius-6xl` | 32px | Glass modals, PipelineMonitor |

### 4.3 Layout Grid (DashboardShell)

```
┌─────────────────────────────────────────────────────────────┐
│  Viewport (100dvh)                                          │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │  Sidebar     │  │  Main Panel (glass-panel)          │  │
│  │  280px fixed │  │  ┌──────────────────────────────┐  │  │
│  │              │  │  │  Header (80-100px)           │  │  │
│  │  • Logo      │  │  │  • Mobile hamburger          │  │  │
│  │  • Nav       │  │  │  • Status pill               │  │  │
│  │  • Stream    │  │  │  • User avatar               │  │  │
│  │    Action    │  │  └──────────────────────────────┘  │  │
│  │              │  │  ┌──────────────────────────────┐  │  │
│  │              │  │  │  Main Content (flex-1)       │  │  │
│  │              │  │  │  • Scrollable (overflow-y)   │  │  │
│  │              │  │  │  • Padding: 16-40px          │  │  │
│  │              │  │  └──────────────────────────────┘  │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                             │
│  Mobile: Bottom tab bar (72px) + Floating Preflight FAB    │
└─────────────────────────────────────────────────────────────┘
```

**Responsive Breakpoints:**
- `< 1024px` (lg): Sidebar hidden, mobile tab bar shown
- `≥ 1024px`: Sidebar visible, tab bar hidden

### 4.4 Content Max-Widths

| Page | Max Width |
|------|-----------|
| Dashboard | Full (grid-based) |
| Settings | `max-w-7xl` (~1280px) |
| Channels | `max-w-[900px]` |

---

## 5. Component Library

### 5.1 Buttons

```css
/* Primary — Saffron gradient */
.btn-primary {
  background: linear-gradient(135deg, #F5821F, #E8690A);
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,130,31,0.35); }
.btn-primary:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(245,130,31,0.2); }

/* Secondary — Outlined neutral */
.btn-secondary {
  background: transparent;
  color: #5A5854;
  border: 1px solid rgba(0,0,0,0.1);
  padding: 12px 24px;
  border-radius: 10px;
  transition: all 150ms ease;
}
.btn-secondary:hover { border-color: rgba(0,0,0,0.18); color: #1A1A1F; background: rgba(0,0,0,0.03); }

/* Danger — Red outlined */
.btn-danger {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #EF4444;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 150ms ease;
}
.btn-danger:hover { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.3); }

/* Ghost — Used in nav, toolbar */
.btn-ghost {
  background: transparent;
  color: #5A5854;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 150ms ease;
}
.btn-ghost:hover { background: rgba(0,0,0,0.04); color: #1A1A1F; }
```

**Button Heights:** 40px (sm), 44px (md), 48px (lg) — consistent vertical rhythm.

### 5.2 Inputs

```css
.glass-input {
  background: rgba(245, 245, 245, 0.6);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  color: #1A1A1F;
  padding: 12px 16px;
  width: 100%;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.glass-input:focus {
  border-color: rgba(245,130,31,0.5);
  box-shadow: 0 0 0 3px rgba(245,130,31,0.1), 0 0 0 1px rgba(245,130,31,0.3) inset;
}
```

**Input with trailing icon (eye, copy):**
- Icon button: `absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg`
- Input: `pr-12` padding for icon space

### 5.3 Select / Dropdown

```css
select {
  background: rgba(245, 245, 245, 0.8);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 12px;
  padding: 12px 16px;
  font-family: var(--font-dm-sans);
  font-size: 14px;
  color: #374151;
  transition: all 150ms ease;
}
select:hover { background: white; }
select:focus { outline: none; ring: 2px rgba(245,130,31,0.2); }
```

### 5.4 Toggle Switch (Custom)

```css
/* Track */
w-[40px] h-[22px] rounded-full relative transition-colors duration-200
  bg-green-500 (enabled) / bg-gray-200 (disabled)

/* Thumb */
absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm
  transition-transform duration-200
  left-[20px] (enabled) / left-[2px] (disabled)
```

### 5.5 Status Badges / Pills

```css
/* Base */
.inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[11-13px] font-bold

/* Variants */
- Live: bg-green-500 text-white + pulse ring animation
- Ready: bg-gray-100 text-gray-500
- Error: bg-red-500 text-white
- Setup: transparent text-gray-400 border-dashed
- Active channel: bg-green-500/10 text-green-500
- Paused: bg-gray-100 text-gray-500
```

### 5.6 Cards (Section Containers)

**Standard Section Card:**
```tsx
<section className="bg-white/80 backdrop-blur-xl border border-white
  shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-[12px] bg-[accent/10] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[accent]" />
      </div>
      <div>
        <h2 className="text-[16px] font-syne font-bold text-gray-900">Title</h2>
        <p className="text-[12px] font-dm-sans text-gray-400">Description</p>
      </div>
    </div>
    {/* Optional action link */}
  </div>
  <div className="px-8 py-6">{/* Content */}</div>
</section>
```

**Channel Card (Channels page):**
```tsx
<div className="bg-white/80 backdrop-blur-xl border border-white
  shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden
  transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
  {/* Language icon: w-12 h-12 rounded-[16px] with color wash */}
  {/* Header: script name + language name + status badge */}
  {/* Body: RTMP details or setup/edit form */}
</div>
```

**Stat Card (SessionStats):**
```tsx
<div className="bg-white/80 backdrop-blur-xl border border-white
  shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] p-6 flex flex-col justify-center
  relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]
  transition-all duration-300">
  {/* Background icon: absolute -right-4 -top-4 w-24 h-24 opacity-[0.03] */}
  {/* Icon header: w-10 h-10 rounded-[12px] bg-[color-mix(accent 10%, white)] */}
  {/* Label: text-[12px] font-dm-sans font-bold uppercase tracking-[0.1em] text-gray-500 */}
  {/* Value: text-[28px] font-syne font-bold text-gray-900 */}
</div>
```

### 5.7 Pipeline Stage Pill (PipelineMonitor)

```tsx
<div className="flex-1 w-full md:w-auto min-h-[90px] rounded-[24px] flex items-center p-4 gap-4
  transition-all duration-300 relative overflow-hidden
  bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-white (active)
  bg-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-white (done)
  bg-red-50 border border-red-100 (error)
  bg-gray-50 border border-gray-100 (idle)">

  {/* Active shimmer overlay */}
  {isActive && (
    <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
      style={{ background: `linear-gradient(90deg, transparent, ${stage.color}, transparent)`,
               backgroundSize: "200% 100%",
               animation: "stage-shimmer 2s ease-in-out infinite" }} />
  )}

  {/* Icon node */}
  <div className="w-[48px] h-[48px] shrink-0 rounded-[16px] shadow-sm flex items-center justify-center
    font-syne font-bold text-[14px] text-white"
    style={{ background: stage.color, boxShadow: `0 8px 16px color-mix(in srgb, ${stage.color} 30%, transparent)` }} />

  {/* Label + value */}
  <div className="flex flex-col">
    <span className="text-[13px] font-dm-sans font-bold tracking-wide text-[stage.color]">{stage.label}</span>
    <span className="text-[20px] font-syne font-bold text-gray-900 animate-pulse (if active)">{stage.value}</span>
  </div>
</div>
```

**Connector between stages:**
```tsx
<div className="hidden md:flex items-center justify-center w-6 lg:w-10 shrink-0">
  <div className="w-full h-[3px] relative rounded-full"
    style={{ backgroundColor: `color-mix(in srgb, ${stage.color} 40%, transparent)` }}>
    {isActive && <div className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-white animate-[slide-right_1s_linear_infinite]" />}
  </div>
</div>
```

### 5.8 Live Transcript Line

```tsx
<p className="font-jetbrains text-[13.5px] leading-[1.8] tracking-tight
  bg-white p-3 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-50
  transition-all duration-300
  animate-[fade-slide-up_300ms_ease-out_forwards] ring-1 ring-saffron/10 (latest)
  style={{ color: isLatest ? '#111827' : `rgba(17,24,39,${0.35 + fadeLevel * 0.5})` }}">
  {line}
</p>
```

### 5.9 Audio Meter (Sidebar)

```tsx
/* Level bar */
<div className="relative h-[6px] w-full rounded-full bg-gray-100 overflow-hidden">
  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-150 ease-out"
    style={{ width: `${normalizedRms}%`, backgroundColor: vad.color,
             boxShadow: normalizedRms > 30 ? `0 0 8px ${vad.color}40` : "none" }} />
  {/* Peak markers at 25%, 50%, 75% */}
</div>

/* VAD badge */
<span className="inline-flex items-center gap-1 text-[11px] font-dm-sans font-semibold px-2 py-0.5 rounded-md"
  style={{ backgroundColor: `${vad.color}15`, color: vad.color }}>
  {vad.emoji} {vad.label}
</span>

/* Buffer bar */
<div className="h-[3px] w-full rounded-full bg-gray-100 overflow-hidden">
  <div className="h-full rounded-full transition-all duration-300"
    style={{ width: `${bufferPercent}%`,
             backgroundColor: bufferPercent >= 80 ? "#10B981" : bufferPercent >= 40 ? "#F59E0B" : "#9CA3AF" }} />
</div>
```

### 5.10 Modals / Dialogs

**Structure:**
```tsx
{/* Overlay */}
<div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" />

{/* Panel */}
<div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
  w-full max-w-[420px] bg-white/95 backdrop-blur-xl border border-white
  shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] p-8 animate-[fade-slide-down_200ms_ease]">
  <div className="flex items-start justify-between mb-4">
    <h3 className="text-[20px] font-syne font-bold text-gray-900">Title</h3>
    <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X /></button>
  </div>
  <p className="text-[14px] font-dm-sans text-gray-500 leading-[1.6] mb-4">Description</p>
  <div className="flex justify-end gap-3">
    <button className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100">Cancel</button>
    <button className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-red-500 text-white hover:bg-red-600">Confirm</button>
  </div>
</div>
```

---

## 6. Motion & Transitions

### 6.1 Keyframe Animations (globals.css)

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-slide-down {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes live-pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

@keyframes stage-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes slide-right {
  from { transform: translateX(-100%); }
  to { transform: translateX(300%); }
}

@keyframes float-slow {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(2%, 2%) scale(1.01); }
  50% { transform: translate(-1%, 3%) scale(0.99); }
  75% { transform: translate(3%, -1%) scale(1.01); }
}
```

### 6.2 Transition Durations

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover lift (cards, buttons) | 150–300ms | `ease-out` / `ease-in-out` |
| Color/background changes | 150ms | `ease` |
| Transform (scale, translate) | 150–200ms | `ease-out` |
| Modal enter | 150ms | `ease-out` (fade-slide-down) |
| Modal exit | 100ms | `ease-in` (fade-in reverse) |
| Panel expand/collapse | 200ms | `ease-in-out` |
| Pipeline stage activation | 300ms | `ease-in-out` + shimmer |
| Live pulse | 1.8s | `ease-in-out` (infinite) |
| Stage shimmer | 2s | `linear` (infinite) |
| Connector slide | 1s | `linear` (infinite) |
| Transcript line fade | 300ms | `ease-out` |
| Mobile sheet slide | 200ms | `ease-out` |

### 6.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Page-Specific Layouts

### 7.1 Dashboard (`/dashboard`)

**Grid Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Overview" + "Dashboard" + Total Usage + Export btn    │
├─────────────────────────────────────────────────────────────────┤
│ StatusRow: 4-column grid (1/2/4 cols responsive)               │
│   [Hindi] [Tamil] [Telugu] [Kannada] — or fewer if configured  │
├─────────────────────────────────────────────────────────────────┤
│ PipelineMonitor: Collapsible horizontal stage pipeline         │
│   STT → TRN → TTS → OUT (connectors animate when active)       │
├─────────────────────────────────────────────────────────────────┤
│ TestModePanel: Collapsible offline test section                │
├─────────────────────────────────────────────────────────────────┤
│ Main Grid (5 cols lg):                                         │
│   ┌─────────────────────┐  ┌─────────────────┐                │
│   │ LiveTranscript      │  │ SessionStats    │                │
│   │ (3 cols)            │  │ (2 cols)        │                │
│   │ • Live badge        │  │ • 5 stat cards  │                │
│   │ • Scrollable log    │  │   (2×2 grid)    │                │
│   │ • Fade-old lines    │  │ • Tooltips      │                │
│   └─────────────────────┘  └─────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ PastSessions: Expandable cards (accordion)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Real-time Data Flow:**
- WebSocket (`/ws/relay`) → `obsRelayManager` subscriptions
- `subscribeStreaming` → `isStreaming` state
- `subscribeSnapshot` → `stats` (cost, chunks, latency, languages)
- `subscribePipelineUpdates` → stage status/values
- `subscribeAudioLevel` → RMS, ZCR, VAD, buffer
- `subscribeRTMP` → per-channel RTMP status

### 7.2 Settings (`/settings`)

**Layout:** Two-column grid (`lg:grid-cols-2`)

**Left Column:**
1. **Sarvam API Key Section** — 3 states: Connected (view), Not connected (add), Edit/Add mode
   - Key masked display (JetBrains Mono)
   - Show/hide toggle
   - Update / Remove actions with confirm dialog
   - Rate limit countdown display
2. **OBS Connection Section** — Configured / Not configured / Edit mode
   - Live connection status badge (polling 10s)
   - Test connection before save (OBS WebSocket)
   - Disconnect confirmation dialog

**Right Column:**
1. **StreamSettingsSection**
   - Server URL (copyable, mono)
   - Stream Key (copyable, blurred until hover)
   - Translation Source: `<select>` — mic_only / desktop_only / mixed
   - OBS Guide modal link
2. **TTSSettingsSection**
   - Speaker: `<select>` — 8 voices
   - Pace: `<input type="range">` 0.5–2.0× (accent thumb)
   - Source Language: `<select>` — Auto + 10 languages
   - Persisted to localStorage + synced to server via WebSocket

### 7.3 Channels (`/channels`)

**Layout:** `max-w-[900px]` centered, 2-column grid (`md:grid-cols-2`)

**Channel Card States:**

| State | UI |
|-------|-----|
| **Not Configured** | Dashed border "Configure channel" button → opens edit form |
| **Configured (View)** | RTMP URL display (mono), "Key saved" badge, Toggle switch, Edit/Delete icons |
| **Editing** | RTMP URL input, Stream Key input (show/hide), Help link, Save/Cancel |
| **Delete Confirm** | Inline red panel "Remove this channel?" with Remove/Cancel |

**Language Icon:**
```tsx
<div className="w-12 h-12 rounded-[16px] bg-white shadow-sm relative overflow-hidden">
  <div className="absolute inset-0 opacity-10 blur-md" style={{ backgroundColor: ch.color }} />
  <span className="text-[20px] font-bold z-10" style={{ color: ch.configured ? ch.color : undefined }}>
    {ch.script.charAt(0)}  // Native script first character
  </span>
</div>
```

**Status Badge Logic:**
```tsx
ch.configured && ch.enabled  → "Active" (green)
ch.configured && !ch.enabled → "Paused" (gray)
!ch.configured               → "Setup" (dashed border)
```

---

## 8. State Management Patterns

### 8.1 Server State (React Query-like via `fetch` + `useEffect`)

```tsx
// Pattern: fetch on mount + subscribe to real-time updates
useEffect(() => {
  fetchInitialData();
  const unsub = subscribeToRealtime((update) => setState(update));
  return () => unsub();
}, []);
```

### 8.2 UI State (Local `useState`)

- Section view/edit/add modes
- Form inputs (controlled)
- Loading/error/success states
- Confirmation dialogs
- Collapsed/expanded panels

### 8.3 Real-time Subscriptions (`obsRelayManager`)

```tsx
import("@/lib/obs-relay-client").then((mod) => {
  unsubFns.push(mod.obsRelayManager.subscribeStreaming(setIsStreaming));
  unsubFns.push(mod.obsRelayManager.subscribeSnapshot(setStats));
  unsubFns.push(mod.obsRelayManager.subscribePipelineUpdates(setStages));
  unsubFns.push(mod.obsRelayManager.subscribeAudioLevel(setLevel));
  unsubFns.push(mod.obsRelayManager.subscribeRTMP(setRtmpStatuses));
  unsubFns.push(mod.obsRelayManager.subscribeErrors(toast.error));
});
// Cleanup in return () => unsubFns.forEach(fn => fn());
```

### 8.4 Persisted Preferences

```tsx
// TTSSettingsSection — localStorage
localStorage.setItem("vaani_tts_speaker", speaker);
localStorage.setItem("vaani_tts_pace", String(pace));
localStorage.setItem("vaani_source_lang", sourceLang);
```

---

## 9. Accessibility

- **Focus visible:** Custom ring `0 0 0 2px #FFFFFF, 0 0 0 4px #F5821F`
- **Semantic HTML:** `<section>`, `<header>`, `<main>`, `<nav>`, `<button>`, `<label>`
- **ARIA:** Tooltips via custom `Tooltip` component, live regions for status
- **Color contrast:** All text meets WCAG AA on glass surfaces
- **Reduced motion:** Respected via media query
- **Keyboard:** All interactive elements reachable, `tabIndex={-1}` on decorative icon buttons

---

## 10. Implementation Notes for AI Consumers

### 10.1 Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS v4 (CSS-first config in `globals.css`)
- **Auth:** Clerk (server + client components)
- **Real-time:** Custom WebSocket (`/ws/relay`) + `obsRelayClient` (singleton manager)
- **Icons:** Lucide React
- **Toasts:** Sonner
- **Fonts:** `next/font` (Syne, DM Sans, JetBrains Mono, Inter, Playfair)

### 10.2 File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── DashboardShell.tsx          # Layout shell + sidebar + mobile nav
│   │   ├── layout.tsx                  # Auth protection wrapper
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Server component (fetches sessions)
│   │   │   ├── StatusRow.tsx           # Channel status cards (client)
│   │   │   ├── PipelineMonitor.tsx     # Pipeline stages (client)
│   │   │   ├── LiveTranscript.tsx      # Transcript log (client)
│   │   │   ├── SessionStats.tsx        # 5 stat cards (client)
│   │   │   ├── AudioMeter.tsx          # Sidebar audio meter (client)
│   │   │   └── PastSessions.tsx        # Expandable history (client)
│   │   ├── settings/
│   │   │   ├── page.tsx                # Settings orchestrator (client)
│   │   │   ├── StreamSettingsSection.tsx
│   │   │   ├── TTSSettingsSection.tsx
│   │   │   └── OBSConnectionSection.tsx
│   │   ├── channels/
│   │   │   └── page.tsx                # Channel management (client)
│   │   └── components/
│   │       ├── TestModePanel.tsx       # Offline pipeline test
│   │       ├── PreflightModal.tsx      # Go Live readiness check
│   │       ├── OnboardingWizard.tsx    # First-run setup
│   │       └── Tooltip.tsx             # Accessible tooltip
│   ├── api/
│   │   ├── channels/                   # CRUD for language channels
│   │   ├── key/                        # Sarvam API key management
│   │   ├── obs/                        # OBS WebSocket credentials
│   │   ├── test-pipeline/              # Offline STT→Translate→TTS test
│   │   └── sessions/                   # Session history + export
│   └── lib/
│       ├── obs-relay-client.ts         # WebSocket manager (singleton)
│       ├── sarvam-pipeline.ts          # STT/Translate/TTS API calls
│       ├── rtmp-streamer.ts            # FFmpeg RTMP output
│       ├── stream-session.ts           # In-memory session state
│       ├── language-registry.ts        # Language definitions + colors
│       ├── encryption.ts               # AES-256-GCM for secrets
│       └── models/                     # Mongoose models
```

### 10.3 Key Patterns to Replicate

1. **Glass panel wrapper** — All main containers use `.glass-panel` or `.glass-card`
2. **Section header pattern** — Icon (colored bg) + Title (Syne) + Subtitle (DM Sans) + Action link
3. **State-driven forms** — View/Edit/Add modes with inline validation
4. **Real-time via singleton** — `obsRelayManager` subscribes once, multiple components subscribe to it
5. **Optimistic UI** — Toggle switches update immediately, sync in background
6. **Confirmation dialogs** — Portal-mounted modals with backdrop blur
7. **Copy-to-clipboard** — Blurred text reveals on hover, check icon on success
8. **Collapsible panels** — `TestModePanel`, `PipelineMonitor` use height/opacity animation

### 10.4 Custom Tailwind Classes (in globals.css)

```css
/* Scrollbar */
.minimal-scrollbar::-webkit-scrollbar { width: 4px; }
.minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
.minimal-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

/* Focus */
:focus-visible { outline: none; box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #F5821F; }

/* Animations */
.animate-[fade-in_150ms_ease]
.animate-[fade-slide-up_200ms_ease-out]
.animate-[fade-slide-down_200ms_ease-out]
.animate-[fade-slide-up_300ms_ease-out_forwards]
.animate-[live-pulse_1.8s_ease-in-out_infinite]
.animate-[stage-shimmer_2s_ease-in-out_infinite]
.animate-[slide-right_1s_linear_infinite]
.animate-[float-slow_20s_ease-in-out_infinite]
```

---

## 11. Quick Reference: Color Variables by Component

| Component | Primary Color | Secondary | Accent |
|-----------|--------------|-----------|--------|
| Dashboard Shell | `--accent-saffron` (FAB, active nav) | `--accent-teal` | `--status-live` |
| StatusRow | Per-language (`--lang-*`) | `--status-live` | `--status-ready` |
| PipelineMonitor | `--stage-stt`/`translate`/`tts`/`stream` | — | — |
| LiveTranscript | `--accent-saffron` (latest ring) | `#10B981` (live) | — |
| SessionStats | Per-stat (`#3B82F6`, `#F5821F`, `#10B981`, `#8B5CF6`, `#EF4444`) | — | — |
| Settings (Key) | `--accent-saffron` | `#10B981` (success) | `#EF4444` (danger) |
| Settings (OBS) | `#3B82F6` | `#10B981` | `#EF4444` |
| StreamSettings | `#3B82F6` | `#F5821F` (copy) | — |
| TTSSettings | `#8B5CF6` | `#F5821F` (slider) | — |
| Channels | Per-language (`--lang-*`) | `#10B981` (active) | `#EF4444` (delete) |
| TestModePanel | `#F59E0B` (amber) | `#F5821F` (run) | `#EF4444` (error) |

---

## 12. Responsive Behavior Summary

| Breakpoint | Sidebar | Tab Bar | Grid Columns | Padding |
|------------|---------|---------|--------------|---------|
| `< 640px` (mobile) | Hidden | Visible (bottom) | 1 col | 16px |
| `640–1023px` (tablet) | Hidden | Visible (bottom) | 1–2 cols | 24px |
| `≥ 1024px` (desktop) | Visible (280px) | Hidden | 2–5 cols | 24–40px |

---

*End of Design System Document*