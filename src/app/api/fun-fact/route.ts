import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.text) {
        return NextResponse.json({ fact: data.text });
      }
    }
  } catch (err) {
    console.warn("Fun fact API call failed, using dynamic pool fallback:", err);
  }

  const dynamicFacts = [
    "The first computer mouse was invented in 1964 and made out of wood.",
    "Sound travels approximately 4.3 times faster through water than through air.",
    "A day on Venus is longer than an entire Venusian year.",
    "The world's very first webcam was set up at Cambridge University to monitor a coffee pot.",
    "Honey is the only known natural food that never spoils.",
    "The dot over the lower case letter 'i' is called a tittle.",
  ];

  const randomFact = dynamicFacts[Math.floor(Math.random() * dynamicFacts.length)];
  return NextResponse.json({ fact: randomFact });
}
