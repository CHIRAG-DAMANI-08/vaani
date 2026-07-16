"use client";

/**
 * Landing Page Content
 * All text, headings, and data for the landing page in one place.
 * Edit this file to update the landing page content.
 */

// Navigation
export const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "For creators", href: "#for-creators" },
];

// Hero Section
export const heroHeadings = {
  main: "Speak one language.\nReach every audience.",
  subtitle: "Vaani lets live streamers broadcast in Hindi, Tamil, Telugu, and Kannada simultaneously — in real time — from a single OBS setup.",
};

// Features Section
export const features = [
  {
    title: "Multilingual streaming",
    description: "Simultaneous stream in Hindi, Tamil, Telugu, and Kannada",
  },
  {
    title: "Natural-sounding voices",
    description: "Indian voices with 25+ voice options",
  },
  {
    title: "Zero OBS changes",
    description: "One button starts all language channels without modifying your setup",
  },
];

// Platform Stack / How It Works
export const platformSections = [
  {
    title: "1. Stream normally on OBS",
    description:
      "Nothing changes for your English channel. Just start your stream as you normally would, using your existing setup.",
    tags: ["OBS", "Streaming", "Zero Changes"],
    gradientTop: "#f97316",
    gradientBottom: "#c4b5fd",
    diamonds: 1,
  },
  {
    title: "2. Vaani Listens & Translates",
    description:
      "Vaani listens in real time, translates your speech, and generates natural-sounding voice in each regional language.",
    tags: ["Translation", "TTS", "Real-Time"],
    gradientTop: "#f97316",
    gradientBottom: "#bbc5e4",
    diamonds: 2,
  },
  {
    title: "3. Auto-Live on YouTube",
    description:
      "Separate YouTube channels go live automatically for each language, reaching millions of new viewers instantly.",
    tags: ["YouTube", "Multilingual", "Live"],
    gradientTop: "#f97316",
    gradientBottom: "#a3c4a8",
    diamonds: 3,
  },
];

// Security Section
export const securityBadges = [
  { imgSrc: "/iso.svg", label: "ISO:27001" },
  { imgSrc: "/aipaa.svg", label: "AICPA SOC 2" },
  { imgSrc: "/idr.svg", label: "India Data Residency" },
];

export const securityHeadings = {
  title: "Creator-first reliability.\nBuilt in from day one.",
};

// Deployment / Pricing Section
export const deployments = [
  {
    imgSrc: "/built-for-01.png",
    title: "Free to start",
    description: "Just connect your Sarvam API key",
  },
  {
    imgSrc: "/built-for-02.png",
    title: "Pay Sarvam directly",
    description: "For AI compute (~₹12–18/hr per language)",
  },
  {
    imgSrc: "/built-for-03.png",
    title: "Vaani subscription",
    description: "Subscription pricing coming soon",
  },
];

// Testimonials / FAQ Section
export const faqs = [
  {
    q: "Does this affect my main English stream?",
    a: "No. Your OBS setup and English channel are completely untouched.",
  },
  {
    q: "Do I need separate YouTube channels?",
    a: "Yes — one per language. Vaani guides you through setting them up.",
  },
  {
    q: "How much does it cost?",
    a: "You pay Sarvam AI directly at their standard rates (~₹12–18/hr per language). Vaani's own subscription pricing is coming soon.",
  },
  {
    q: "Is there a delay on language channels?",
    a: "About 4–8 seconds. Invisible to viewers who only watch their language.",
  },
  {
    q: "What if one channel crashes mid-stream?",
    a: "Other channels keep running. You get an alert on your dashboard.",
  },
];

// Samvaad Demo Section
export const demos = [
  {
    label: "Hindi Stream",
    gradient:
      "radial-gradient(circle, rgba(180,140,220,0.8) 0%, rgba(140,120,200,0.6) 40%, rgba(100,100,180,0.4) 70%, transparent 100%)",
    borderColor: "rgba(180,140,220,0.6)",
    btnBg: "bg-purple-200/60",
  },
  {
    label: "Tamil Stream",
    gradient:
      "radial-gradient(circle, rgba(244,162,97,0.8) 0%, rgba(230,140,60,0.6) 40%, rgba(200,120,40,0.4) 70%, transparent 100%)",
    borderColor: "rgba(244,162,97,0.6)",
    btnBg: "bg-orange-200/60",
  },
  {
    label: "Telugu Stream",
    gradient:
      "radial-gradient(circle, rgba(140,200,100,0.7) 0%, rgba(120,180,80,0.5) 40%, rgba(100,160,60,0.3) 70%, transparent 100%)",
    borderColor: "rgba(140,200,100,0.5)",
    btnBg: "bg-green-200/60",
  },
];

// Research Section
export const articles = [
  {
    tag: "TECH",
    title: "Powered by IndicConformer",
    date: "IIT Madras - Speech Recognition",
    gradient: "linear-gradient(135deg, #6a8a30 0%, #8aaa40 50%, #7a9a30 100%)",
    label: "Indic\nConformer",
    href: "#",
  },
  {
    tag: "TECH",
    title: "IndicTrans2",
    date: "Translation across all 22 Indian languages",
    gradient:
      "linear-gradient(135deg, #e8a040 0%, #f0b860 50%, #d89030 100%)",
    label: "Indic\nTrans2",
    href: "#",
  },
  {
    tag: "TECH",
    title: "Sarvam Bulbul V3",
    date: "Natural Indian voice synthesis",
    gradient:
      "linear-gradient(135deg, #e09040 0%, #f0a050 50%, #d08030 100%)",
    label: "Bulbul\nV3",
    href: "#",
  },
];

// Logo Marquee
export const marqueeItems = [
  "4 Languages Output",
  "500M+ Regional Viewers",
  "~5s Translation Latency",
  "₹0 To Get Started",
  "Simultaneous Broadcasting",
  "Zero OBS Changes",
];

// Footer
export const footerSections = [
  {
    title: "Products",
    links: [
      { label: "Vaani Broadcaster", href: "#" },
      { label: "Live Dashboard", href: "#" },
      { label: "Channel Sync", href: "#" },
    ],
  },
  {
    title: "Tech",
    links: [
      { label: "IndicConformer", href: "#" },
      { label: "IndicTrans2", href: "#" },
      { label: "Sarvam Bulbul V3", href: "#" },
      { label: "Connect your APIs", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "#" },
      { label: "Blogs", href: "#" },
      { label: "Discord", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Terms of service", href: "#" },
      { label: "Privacy policy", href: "#" },
    ],
  },
  {
    title: "Socials",
    links: [
      { label: "LinkedIn", href: "#" },
      { label: "X", href: "#" },
      { label: "YouTube", href: "#" },
    ],
  },
];

// CTABanner
export const ctaContent = {
  heading: "Stream once. Reach everyone\nwith Vaani.",
  buttonText: "Join the waitlist",
};

// Waitlist Modal
export const waitlistContent = {
  title: "Join the Waitlist",
  description:
    "Get early access to our real-time multilingual streaming engine. We're prioritizing creators based on their signup date.",
  emailPlaceholder: "creator@youtube.com",
  namePlaceholder: "Your name",
  nameOptional: "(Optional)",
  successTitle: "You're on the list!",
  successDescription:
    "Keep an eye on <strong>{email}</strong>. We'll send you an invite as soon as Vaani opens up for your language.",
  buttonText: "Join the waitlist",
  closeButtonText: "Close window",
  errorText: "Something went wrong. Please check your connection and try again.",
  duplicateText: "This email is already on the waitlist. We'll notify you when it's your turn!",
  termsText: "By joining, you agree to our Terms of Service and Privacy Policy. We won't spam you.",
};