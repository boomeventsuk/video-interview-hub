import { supabase } from "@/integrations/supabase/client";

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  submissionId?: string;
  templateId?: string;
  templateType: "invite" | "reminder" | "share" | "team_invite";
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: options,
  });

  if (error) return { success: false, error: error.message };
  return data;
}

export function buildInviteEmailHtml({
  candidateName,
  templateTitle,
  interviewUrl,
  deadline,
}: {
  candidateName: string;
  templateTitle: string;
  interviewUrl: string;
  deadline?: string | null;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:32px;background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">You're Invited to Interview</h1>
    <p style="color:#a0a0b0;font-size:14px;margin:0 0 24px;">Hi ${candidateName},</p>
    <p style="color:#a0a0b0;font-size:14px;line-height:1.6;margin:0 0 16px;">
      You've been invited to complete a video interview for <strong style="color:#fff;">${templateTitle}</strong>.
    </p>
    <p style="color:#a0a0b0;font-size:14px;line-height:1.6;margin:0 0 24px;">
      This is a one-way video interview. You'll be presented with questions and given time to record your responses at your own pace.
    </p>
    ${deadline ? `<p style="color:#ff6b6b;font-size:13px;margin:0 0 24px;">Please complete by: ${new Date(deadline).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
    <a href="${interviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
      Start Interview
    </a>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">If the button doesn't work, copy this link: ${interviewUrl}</p>
  </div>
</body>
</html>`;
}

export function buildReminderEmailHtml({
  candidateName,
  templateTitle,
  interviewUrl,
  deadline,
}: {
  candidateName: string;
  templateTitle: string;
  interviewUrl: string;
  deadline?: string | null;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:32px;background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Friendly Reminder</h1>
    <p style="color:#a0a0b0;font-size:14px;margin:0 0 24px;">Hi ${candidateName},</p>
    <p style="color:#a0a0b0;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Just a reminder that your video interview for <strong style="color:#fff;">${templateTitle}</strong> is still pending.
    </p>
    ${deadline ? `<p style="color:#ff6b6b;font-size:13px;margin:0 0 24px;">Deadline: ${new Date(deadline).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
    <a href="${interviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
      Complete Interview
    </a>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">If the button doesn't work, copy this link: ${interviewUrl}</p>
  </div>
</body>
</html>`;
}
