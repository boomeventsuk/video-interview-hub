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

function escapeHtml(value: string | null | undefined) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildCompletionNotificationHtml({
  name,
  email,
  templateTitle,
  answers,
}: {
  name: string;
  email: string;
  templateTitle: string;
  answers: Array<{
    video_url: string | null;
    questions?: {
      question_text?: string | null;
      order_index?: number | null;
    } | null;
  }>;
}) {
  const rows = answers
    .sort((a, b) => (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0))
    .map((answer, index) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <strong>Question ${index + 1}</strong><br/>
          <span style="color:#4b5563;">${escapeHtml(answer.questions?.question_text || "")}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          ${answer.video_url ? `<a href="${answer.video_url}" style="color:#2563eb;">Watch video</a>` : `<span style="color:#b91c1c;">No video URL saved</span>`}
        </td>
      </tr>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New Boombastic video interview submitted</h1>
    <p style="margin:0 0 20px;color:#4b5563;">A candidate has completed the ${escapeHtml(templateTitle)} interview.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Name</td><td style="padding:6px 0;color:#111827;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111827;">${escapeHtml(email)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;">
      ${rows}
    </table>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: EmailRequest = await req.json();
    let html = body.html;

    if (body.templateType === "share" && body.submissionId) {
      const { data: submission } = await supabase
        .from("submissions")
        .select("applicant_name, applicant_email, interview_templates(title)")
        .eq("id", body.submissionId)
        .maybeSingle();

      const { data: answers } = await supabase
        .from("submission_answers")
        .select("video_url, questions(question_text, order_index)")
        .eq("submission_id", body.submissionId);

      if (submission && answers && answers.length > 0) {
        html = buildCompletionNotificationHtml({
          name: (submission as any).applicant_name,
          email: (submission as any).applicant_email,
          templateTitle: (submission as any).interview_templates?.title || "video interview",
          answers: answers as any,
        });
      }
    }

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
        html,
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
