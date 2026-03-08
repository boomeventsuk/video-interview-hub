import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@interviewpro.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  submissionId?: string;
  templateId?: string;
  templateType: "invite" | "reminder" | "share";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: EmailRequest = await req.json();

    // Log the email attempt
    const { data: logEntry } = await supabase
      .from("email_log")
      .insert({
        recipient_email: body.to,
        recipient_name: body.toName || null,
        template_type: body.templateType,
        subject: body.subject,
        status: "pending",
        submission_id: body.submissionId || null,
        template_id: body.templateId || null,
      })
      .select("id")
      .single();

    if (!RESEND_API_KEY) {
      // Dev mode: skip sending, just log
      if (logEntry) {
        await supabase
          .from("email_log")
          .update({ status: "sent", sent_at: new Date().toISOString(), error_message: "DEV_MODE: No Resend API key" })
          .eq("id", logEntry.id);
      }
      return new Response(
        JSON.stringify({ success: true, devMode: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [body.to],
        subject: body.subject,
        html: body.html,
      }),
    });

    const resendData = await res.json();

    if (!res.ok) {
      if (logEntry) {
        await supabase
          .from("email_log")
          .update({ status: "failed", error_message: JSON.stringify(resendData) })
          .eq("id", logEntry.id);
      }
      return new Response(
        JSON.stringify({ success: false, error: resendData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (logEntry) {
      await supabase
        .from("email_log")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", logEntry.id);
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
