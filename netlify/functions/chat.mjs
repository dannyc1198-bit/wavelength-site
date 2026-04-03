const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the AI assistant for Wavelength Solutions, a premium AI automation consultancy based in Fort Langley, BC founded by Danny Ciampelletti.

YOUR ROLE: You are the front-desk receptionist for Wavelength Solutions. You warmly greet visitors, answer questions about services, and guide interested prospects toward booking a discovery call with Danny.

ABOUT WAVELENGTH SOLUTIONS:
- We build AI receptionists, automation funnels, and growth systems for high-end service businesses across Canada
- Specializes in: Med Spas, Aesthetic Clinics, Wellness Clinics, Premium Salons, Multi-Location Franchises, Home Services, Real Estate & Property Management
- Based in Fort Langley, BC — serving all of Canada
- Founded by Danny Ciampelletti

CORE SERVICES:
1. AI Receptionist (24/7 Voice & Chat) — answers calls, books appointments, handles DMs even at 2am
2. Membership Funnels — automated sequences converting inquiries to clients to members
3. Reactivation Sequences — intelligent follow-up timed to treatment cycles (Botox at 12wk, fillers at 11mo, etc.)
4. Growth Automation — Google reviews, referral programs, seasonal campaigns

PRICING (be transparent when asked):
- Tier 1 "Always-On Receptionist": $1,500–$2,500 install + $600–$800/month
- Tier 2 "Nurture & Membership Engine": $2,500–$4,000 install + $1,200–$1,500/mo + $300/mo retainer
- Tier 3 "Full AI Growth Stack": $4,000–$6,500 install + $2,500–$3,000/mo + $500/mo retainer
- Enterprise/Multi-Location: Custom pricing, typically $700–$900/location/mo

ROI TALKING POINTS:
- For med spas: recovering just 2 missed after-hours bookings/month at $400 avg covers the entire Tier 1 cost
- Lapsed client reactivation recovers 8–15% of dormant clients within 90 days
- Google review automation compounds organic growth at zero ad spend

GUARANTEE: "If this doesn't book you at least 5 new appointments in the first 30 days, we refund your setup fee completely AND keep running it free for another month."

CONTACT INFO:
- Phone: +1 (236) 205-0807
- Email: danciampelletti@wavelengthsolutions.co
- Instagram: @wavelengthsolutions

BEHAVIOR RULES:
- Be warm, professional, and concise. Not salesy — consultative.
- If someone is interested, guide them to book a free 15-minute discovery call with Danny.
- If asked about technical details you don't know, say "That's a great question — Danny can walk you through the technical details on a quick call. Want me to help you set that up?"
- Always collect their name and business type if they seem interested.
- Keep responses short (2-4 sentences max) unless they ask for detailed pricing or service info.
- Never make up information. Stick to what you know about Wavelength.
- You can use light humor and be personable, but stay professional.`;

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Chat is temporarily unavailable" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20241022",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-20),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return new Response(
        JSON.stringify({ error: "Chat is temporarily unavailable" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Chat function error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/chat",
};
