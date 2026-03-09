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
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:32px;background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="color:#fff;font-size:22px;margin:0 0 20px;">You're Invited 🎉</h1>
    <p style="color:#d0d0d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi ${candidateName},
    </p>
    <p style="color:#d0d0d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Thank you for your interest! We're BoomEvents and we'd love to learn more about you.
    </p>
    <p style="color:#d0d0d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
      We'd like to invite you to answer a few short video questions for the <strong style="color:#fff;">${templateTitle}</strong> role. It's a one-way video interview — you'll see each question on screen and can record your responses at your own pace. No need to schedule anything.
    </p>
    ${deadlineStr ? `<p style="color:#ff9f43;font-size:14px;margin:0 0 24px;padding:10px 14px;background:rgba(255,159,67,0.08);border-radius:8px;">⏰ Please complete by <strong>${deadlineStr}</strong></p>` : ""}
    <a href="${interviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
      Start My Interview
    </a>
    <p style="color:#777;font-size:13px;line-height:1.5;margin:24px 0 0;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="color:#8b8bff;">${interviewUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;" />
    <p style="color:#555;font-size:12px;margin:0;">
      You received this because you were invited to interview. If you believe this was sent in error, you can ignore this email.
    </p>
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
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:32px;background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="color:#fff;font-size:22px;margin:0 0 20px;">Friendly Reminder 👋</h1>
    <p style="color:#d0d0d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi ${candidateName},
    </p>
    <p style="color:#d0d0d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Just a quick reminder that your video interview for <strong style="color:#fff;">${templateTitle}</strong> is still waiting for you. It only takes a few minutes!
    </p>
    ${deadlineStr ? `<p style="color:#ff9f43;font-size:14px;margin:0 0 24px;padding:10px 14px;background:rgba(255,159,67,0.08);border-radius:8px;">⏰ Deadline: <strong>${deadlineStr}</strong></p>` : ""}
    <a href="${interviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
      Complete My Interview
    </a>
    <p style="color:#777;font-size:13px;line-height:1.5;margin:24px 0 0;">
      If the button doesn't work, copy and paste this link:<br/>
      <span style="color:#8b8bff;">${interviewUrl}</span>
    </p>
  </div>
</body>
</html>`;
}
