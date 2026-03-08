import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { User, Mail, Upload } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SubmissionCard, { Submission } from "@/components/submissions/SubmissionCard";
import SubmissionDetail from "@/components/submissions/SubmissionDetail";
import SubmissionFilters from "@/components/submissions/SubmissionFilters";
import { Answer } from "@/components/submissions/AnswerCard";
import InviteCandidateDialog from "@/components/InviteCandidateDialog";
import BulkInviteDialog from "@/components/BulkInviteDialog";

export default function SubmissionsReview() {
  const [searchParams] = useSearchParams();
  const templateFilter = searchParams.get("template");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [activeTemplateFilter, setActiveTemplateFilter] = useState(templateFilter || "all");

  // Bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  // Invite dialogs
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  useEffect(() => {
    loadSubmissions();
    loadTemplates();
  }, [templateFilter]);

  const loadSubmissions = async () => {
    let query = supabase
      .from("submissions")
      .select("*, interview_templates(title)")
      .order("created_at", { ascending: false });

    if (templateFilter) query = query.eq("template_id", templateFilter);

    const { data } = await query;
    if (data) {
      setSubmissions(
        data.map((s: any) => ({
          ...s,
          template_title: s.interview_templates?.title || "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("interview_templates")
      .select("id, title")
      .eq("is_deleted", false)
      .order("title");
    if (data) setTemplates(data);
  };

  const loadAnswers = async (sub: Submission) => {
    setSelected(sub);
    const { data } = await supabase
      .from("submission_answers")
      .select("*, questions(question_text)")
      .eq("submission_id", sub.id);

    if (data) {
      setAnswers(
        data.map((a: any) => ({
          id: a.id,
          question_text: a.questions?.question_text || "Question",
          video_url: a.video_url,
          rating: a.rating,
        }))
      );
    }
  };

  const updateStatus = async (subId: string, status: string) => {
    await supabase.from("submissions").update({ status }).eq("id", subId);
    setSubmissions((prev) => prev.map((s) => (s.id === subId ? { ...s, status } : s)));
    if (selected?.id === subId) setSelected((prev) => prev ? { ...prev, status } : null);
    toast.success(`Status updated to ${status}`);
  };

  const rateAnswer = useCallback(async (answerId: string, rating: number) => {
    await supabase.from("submission_answers").update({ rating } as any).eq("id", answerId);
    setAnswers((prev) => {
      const updated = prev.map((a) => (a.id === answerId ? { ...a, rating } : a));
      // Recalculate overall
      const rated = updated.filter((a) => a.rating != null);
      if (rated.length > 0 && selected) {
        const avg = rated.reduce((sum, a) => sum + (a.rating || 0), 0) / rated.length;
        const rounded = Math.round(avg * 10) / 10;
        supabase.from("submissions").update({ overall_rating: rounded } as any).eq("id", selected.id);
        setSubmissions((prev) => prev.map((s) => s.id === selected.id ? { ...s, overall_rating: rounded } : s));
        setSelected((prev) => prev ? { ...prev, overall_rating: rounded } : null);
      }
      return updated;
    });
    toast.success("Rating saved");
  }, [selected]);

  const updateNotes = useCallback(async (notes: string) => {
    if (!selected) return;
    await supabase.from("submissions").update({ reviewer_notes: notes } as any).eq("id", selected.id);
    setSubmissions((prev) => prev.map((s) => s.id === selected.id ? { ...s, reviewer_notes: notes } : s));
    setSelected((prev) => prev ? { ...prev, reviewer_notes: notes } : null);
    toast.success("Notes saved");
  }, [selected]);

  const bulkAction = async (status: string) => {
    const ids = Array.from(bulkSelected);
    for (const id of ids) {
      await supabase.from("submissions").update({ status }).eq("id", id);
    }
    setSubmissions((prev) => prev.map((s) => bulkSelected.has(s.id) ? { ...s, status } : s));
    setBulkSelected(new Set());
    toast.success(`${ids.length} submissions updated to ${status}`);
  };

  const exportCsv = () => {
    const rows = [["Name", "Email", "Template", "Status", "Rating", "Date"]];
    for (const s of filtered) {
      rows.push([
        s.applicant_name,
        s.applicant_email,
        s.template_title,
        s.status,
        s.overall_rating?.toFixed(1) || "",
        new Date(s.created_at).toLocaleDateString(),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtering & sorting
  const filtered = useMemo(() => {
    let result = [...submissions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.applicant_name.toLowerCase().includes(q) ||
          s.applicant_email.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (activeTemplateFilter !== "all") {
      result = result.filter((s) => s.template_id === activeTemplateFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "rating-desc":
          return (b.overall_rating || 0) - (a.overall_rating || 0);
        case "rating-asc":
          return (a.overall_rating || 0) - (b.overall_rating || 0);
        case "name-asc":
          return a.applicant_name.localeCompare(b.applicant_name);
        default: // date-desc
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [submissions, search, statusFilter, sortBy, activeTemplateFilter]);

  const toggleBulkItem = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Submissions</h1>
            <p className="mt-1 text-muted-foreground">
              Review applicant video interviews
              {submissions.length > 0 && (
                <span className="ml-2 text-xs">({filtered.length} of {submissions.length})</span>
              )}
            </p>
          </div>
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" /> Invite
              </button>
              <button
                onClick={() => setBulkInviteOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Bulk Invite
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* List column */}
          <div className="space-y-4">
            <SubmissionFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              templateFilter={activeTemplateFilter}
              onTemplateFilterChange={setActiveTemplateFilter}
              templates={templates}
              bulkMode={bulkMode}
              onBulkToggle={() => {
                setBulkMode(!bulkMode);
                setBulkSelected(new Set());
              }}
              selectedCount={bulkSelected.size}
              onBulkAction={bulkAction}
              onExport={exportCsv}
            />

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filtered.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">No submissions found.</p>
                </div>
              ) : (
                filtered.map((sub, i) => (
                  <div key={sub.id} className="flex items-start gap-2">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(sub.id)}
                        onChange={() => toggleBulkItem(sub.id)}
                        className="mt-5 h-4 w-4 rounded border-border accent-primary"
                      />
                    )}
                    <div className="flex-1">
                      <SubmissionCard
                        sub={sub}
                        index={i}
                        isSelected={selected?.id === sub.id}
                        onClick={() => loadAnswers(sub)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail column */}
          <div>
            {selected ? (
              <SubmissionDetail
                key={selected.id}
                submission={selected}
                answers={answers}
                onStatusChange={(s) => updateStatus(selected.id, s)}
                onRate={rateAnswer}
                onNotesChange={updateNotes}
              />
            ) : (
              <div className="glass-card p-12 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a submission to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {templates.length > 0 && (
        <>
          <InviteCandidateDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            templateId={activeTemplateFilter !== "all" ? activeTemplateFilter : templates[0].id}
            templateTitle={
              activeTemplateFilter !== "all"
                ? templates.find((t) => t.id === activeTemplateFilter)?.title || templates[0].title
                : templates[0].title
            }
            onInvited={loadSubmissions}
          />
          <BulkInviteDialog
            open={bulkInviteOpen}
            onOpenChange={setBulkInviteOpen}
            templateId={activeTemplateFilter !== "all" ? activeTemplateFilter : templates[0].id}
            templateTitle={
              activeTemplateFilter !== "all"
                ? templates.find((t) => t.id === activeTemplateFilter)?.title || templates[0].title
                : templates[0].title
            }
            onInvited={loadSubmissions}
          />
        </>
      )}
    </AdminLayout>
  );
}
