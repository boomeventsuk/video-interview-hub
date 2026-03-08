import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail, buildInviteEmailHtml } from "@/lib/email";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateTitle: string;
  deadline?: string | null;
  onInvited?: () => void;
}

export default function InviteCandidateDialog({
  open,
  onOpenChange,
  templateId,
  templateTitle,
  deadline,
  onInvited,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter name and email");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create submission with invited status
      const { data: sub, error } = await supabase
        .from("submissions")
        .insert({
          template_id: templateId,
          applicant_name: name,
          applicant_email: email,
          status: "invited",
          invited_by: user?.id,
          invited_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Build invite URL with submission pre-fill
      const interviewUrl = `${window.location.origin}/interview/${templateId}?submission=${(sub as any).id}`;

      await sendEmail({
        to: email,
        toName: name,
        subject: `You're invited to interview for ${templateTitle}`,
        html: buildInviteEmailHtml({
          candidateName: name,
          templateTitle,
          interviewUrl,
          deadline,
        }),
        submissionId: (sub as any).id,
        templateId,
        templateType: "invite",
      });

      toast.success(`Invitation sent to ${email}`);
      setName("");
      setEmail("");
      onOpenChange(false);
      onInvited?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send an interview invitation for <strong>{templateTitle}</strong>
          </p>
          <div className="space-y-2">
            <Label>Candidate Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <Button onClick={handleInvite} disabled={sending} className="w-full">
            {sending ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
