import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Check, X, AlertCircle, Download } from "lucide-react";
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

interface CsvRow {
  firstName: string;
  lastName: string;
  email: string;
  valid: boolean;
}

export default function BulkInviteDialog({
  open,
  onOpenChange,
  templateId,
  templateTitle,
  deadline,
  onInvited,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [done, setDone] = useState(false);

  const downloadTemplate = () => {
    const csv = "first_name,last_name,email\nJane,Smith,jane@example.com\nJohn,Doe,john@example.com\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const result: CsvRow[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 3) {
        // Try 2-col format: "name,email" for backwards compat
        if (parts.length === 2) {
          const lower0 = parts[0].toLowerCase();
          const lower1 = parts[1].toLowerCase();
          if ((lower0 === "name" || lower0 === "first_name") && (lower1 === "email" || lower1 === "last_name")) continue;
          const nameParts = parts[0].split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const email = parts[1];
          const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && firstName.length > 0;
          result.push({ firstName, lastName, email, valid });
        }
        continue;
      }

      // Skip header row
      const h0 = parts[0].toLowerCase();
      const h1 = parts[1].toLowerCase();
      const h2 = parts[2].toLowerCase();
      if ((h0 === "first_name" || h0 === "firstname" || h0 === "first name" || h0 === "name") &&
          (h1 === "last_name" || h1 === "lastname" || h1 === "last name" || h1 === "surname") &&
          (h2 === "email" || h2 === "email address")) continue;

      const firstName = parts[0];
      const lastName = parts[1];
      const email = parts[2];
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && firstName.length > 0;
      result.push({ firstName, lastName, email, valid });
    }
    return result;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
      setDone(false);
      setProgress({ sent: 0, failed: 0, total: 0 });
    };
    reader.readAsText(file);
  };

  const handleSend = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setSending(true);
    setProgress({ sent: 0, failed: 0, total: validRows.length });

    const { data: { user } } = await supabase.auth.getUser();
    let sent = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        const { data: sub, error } = await supabase
          .from("submissions")
          .insert({
            template_id: templateId,
            applicant_name: fullName,
            applicant_email: row.email,
            status: "invited",
            invited_by: user?.id,
            invited_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();

        if (error) throw error;

        const interviewUrl = `${window.location.origin}/interview/${templateId}?submission=${(sub as any).id}`;

        await sendEmail({
          to: row.email,
          toName: fullName,
          subject: `You're invited to interview — ${templateTitle}`,
          html: buildInviteEmailHtml({
            candidateName: row.firstName,
            templateTitle,
            interviewUrl,
            deadline,
          }),
          submissionId: (sub as any).id,
          templateId,
          templateType: "invite",
        });

        sent++;
      } catch {
        failed++;
      }
      setProgress({ sent, failed, total: validRows.length });
    }

    setSending(false);
    setDone(true);
    toast.success(`${sent} invitation${sent !== 1 ? "s" : ""} sent${failed > 0 ? `, ${failed} failed` : ""}`);
    onInvited?.();
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Invite Candidates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with <code className="text-xs bg-secondary px-1 py-0.5 rounded">first_name, last_name, email</code> columns for <strong>{templateTitle}</strong>.
          </p>

          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Upload CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download Template
            </Button>
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-[hsl(var(--success))]">
                  <Check className="h-4 w-4" /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <X className="h-4 w-4" /> {invalidCount} invalid
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {rows.slice(0, 20).map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                      row.valid ? "bg-secondary/50" : "bg-destructive/10"
                    }`}
                  >
                    <span>{row.firstName} {row.lastName}</span>
                    <span className="text-muted-foreground">{row.email}</span>
                    {!row.valid && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
                  </div>
                ))}
                {rows.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">...and {rows.length - 20} more</p>
                )}
              </div>

              {sending && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {progress.sent + progress.failed} / {progress.total} processed
                  </p>
                </div>
              )}

              {done ? (
                <p className="text-sm text-center text-[hsl(var(--success))]">
                  {progress.sent} sent, {progress.failed} failed
                </p>
              ) : (
                <Button onClick={handleSend} disabled={sending || validCount === 0} className="w-full">
                  {sending ? "Sending..." : `Send ${validCount} Invitation${validCount !== 1 ? "s" : ""}`}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
