// Lead capture endpoint.
// Receives { name, email, context } from the chat widget after a prospect engages.
// Fires a POST to LEAD_WEBHOOK_URL env var (set this in Netlify → Site settings → Env vars).
// Set LEAD_WEBHOOK_URL to a Make.com or n8n webhook that routes leads to your CRM / email.

const ALLOWED_ORIGINS = new Set([
  "https://wavelengthsolutions.co",
  "https://www.wavelengthsolutions.co",
]);

function getAllowedOrigin(req) {
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (process.env.CONTEXT !== "production" && origin.endsWith(".netlify.app")) return origin;
  return null;
}

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default async (req) => {
  const origin = getAllowedOrigin(req);
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let lead;
  try {
    const body = await req.json();

    const email = typeof body.email === "string"
      ? body.email.slice(0, 200).trim().toLowerCase()
      : "";
    const name = typeof body.name === "string"
      ? body.name.slice(0, 100).trim()
      : "";
    const context = typeof body.context === "string"
      ? body.context.slice(0, 500).trim()
      : "";

    // Basic email format check
    if (!email || !email.includes("@") || !email.includes(".")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    lead = {
      name,
      email,
      context,
      timestamp: new Date().toISOString(),
      source: "website-chat",
    };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  // Always log the lead (visible in Netlify function logs)
  console.log("NEW_LEAD:", JSON.stringify(lead));

  // Fire to webhook if configured (Make.com / n8n / Zapier)
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const wRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!wRes.ok) {
        console.error("Webhook delivery failed:", wRes.status, await wRes.text());
      }
    } catch (err) {
      // Don't fail the request — lead is logged regardless
      console.error("Webhook error:", err.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
};

export const config = {
  path: "/.netlify/functions/lead",
};
