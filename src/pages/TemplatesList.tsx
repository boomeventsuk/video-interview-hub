import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Copy, Eye, Trash2, FileText, Search, CopyPlus, Play, Calendar,
} from "lucide-react";
import { format, isPast } from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Template {
  id: string;
  title: string;
  description: string;
  department: string | null;
  is_active: boolean;
  deadline: string | null;
  created_at: string;
  question_count: number;
  submission_count: number;
  retakes_allowed: number;
  redirect_url: string | null;
}

export default function TemplatesList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("interview_templates")
      .select("*, questions(id), submissions(id)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (data) {
      setTemplates(
        data.map((t: any) => ({
          ...t,
          question_count: t.questions?.length || 0,
          submission_count: t.submissions?.length || 0,
        }))
      );
    }
    setLoading(false);
  };

  const departments = [...new Set(templates.map((t) => t.department).filter(Boolean))] as string[];

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${id}`);
    toast.success("Interview link copied!");
  };

  const duplicateTemplate = async (template: Template) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newTemplate, error } = await supabase
      .from("interview_templates")
      .insert({
        title: `${template.title} (Copy)`,
        description: template.description,
        department: template.department,
        retakes_allowed: template.retakes_allowed,
        redirect_url: template.redirect_url,
        is_active: false,
        admin_id: user.id,
      })
      .select("id")
      .single();

    if (error || !newTemplate) {
      toast.error("Failed to duplicate template");
      return;
    }

    const { data: questions } = await supabase
      .from("questions")
      .select("question_text, order_index, prep_time_seconds, recording_duration_seconds, description, is_required")
      .eq("template_id", template.id)
      .eq("is_deleted", false)
      .order("order_index");

    if (questions && questions.length > 0) {
      await supabase.from("questions").insert(
        questions.map((q) => ({ ...q, template_id: newTemplate.id }))
      );
    }

    toast.success("Template duplicated!");
    loadTemplates();
  };

  const deleteTemplate = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("interview_templates")
      .update({ is_active: false, is_deleted: true })
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Failed to delete template");
    } else {
      toast.success("Template deleted");
      loadTemplates();
    }
    setDeleteTarget(null);
  };

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "all" || t.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Templates</h1>
            <p className="mt-1 text-muted-foreground">Manage your interview templates</p>
          </div>
          <Link to="/admin/templates/new" className="glow-button flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> New Template
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          {departments.length > 0 && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {search || deptFilter !== "all" ? "No templates match your filters." : "No templates yet. Create your first one!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template, i) => {
              const isExpired = template.deadline && isPast(new Date(template.deadline));
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-hover gradient-border p-6"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-lg leading-tight">{template.title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isExpired && (
                        <span className="rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-xs font-medium">Expired</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          template.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {template.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  {template.department && (
                    <Badge variant="secondary" className="mb-2 text-xs">{template.department}</Badge>
                  )}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>{template.question_count} questions</span>
                    <span>{template.submission_count} submissions</span>
                    {template.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(template.deadline), "MMM d")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/templates/${template.id}`}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Eye className="h-3 w-3" /> Edit
                    </Link>
                    <a
                      href={`/interview/${template.id}?preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Play className="h-3 w-3" /> Preview
                    </a>
                    <button
                      onClick={() => copyLink(template.id)}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Copy className="h-3 w-3" /> Share
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <CopyPlus className="h-3 w-3" /> Duplicate
                    </button>
                    <button
                      onClick={() => setDeleteTarget(template)}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.submission_count > 0
                ? `This template has ${deleteTarget.submission_count} submissions. It will be soft-deleted and can be recovered.`
                : "This will remove the template. It can be recovered later if needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTemplate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
