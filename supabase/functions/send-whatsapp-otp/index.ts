import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(p: string): string {
  // Keep leading + and digits only
  const trimmed = p.trim().replace(/[^\d+]/g, "");
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WA_TOKEN || !WA_PHONE_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get profile + check verified
    const { data: profile } = await admin
      .from("profiles")
      .select("phone, phone_verified")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.phone) {
      return new Response(JSON.stringify({ error: "No phone on file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.phone_verified) {
      return new Response(JSON.stringify({ ok: true, alreadyVerified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 1 send per 60s
    const { data: recent } = await admin
      .from("phone_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const ageMs = Date.now() - new Date(recent.created_at).getTime();
      if (ageMs < 60_000) {
        return new Response(
          JSON.stringify({ error: `Please wait ${Math.ceil((60_000 - ageMs) / 1000)}s before requesting another code` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const phone = normalizePhone(profile.phone);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await sha256(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store hashed OTP
    const { error: insErr } = await admin.from("phone_verifications").insert({
      user_id: userId,
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });
    if (insErr) throw insErr;

    // Send via WhatsApp Cloud API (authentication template)
    const waUrl = `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`;
    const waBody = {
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: "verify_otp",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    };

    const waRes = await fetch(waUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waBody),
    });
    const waData = await waRes.json();

    if (!waRes.ok) {
      console.error("WhatsApp send failed:", JSON.stringify(waData));
      // Try without button component (some templates have no button)
      const fallbackBody = {
        messaging_product: "whatsapp",
        to: phone.replace(/^\+/, ""),
        type: "template",
        template: {
          name: "verify_otp",
          language: { code: "en_US" },
          components: [
            { type: "body", parameters: [{ type: "text", text: otp }] },
          ],
        },
      };
      const fbRes = await fetch(waUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackBody),
      });
      const fbData = await fbRes.json();
      if (!fbRes.ok) {
        console.error("WhatsApp fallback also failed:", JSON.stringify(fbData));
        return new Response(
          JSON.stringify({
            error: "Failed to send WhatsApp message",
            details: fbData?.error?.message ?? waData?.error?.message ?? "Unknown",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-whatsapp-otp error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
