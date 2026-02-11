import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Copy, Eye, FileText, Users, Activity } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Template {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  question_count: number;
  submission_count: number;
}

export default function AdminDashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: temps } = await supabase
      .from("interview_templates")
      .select("*, questions(id), submissions(id)")
      .order("created_at", { ascending: false });

    if (temps) {
      const mapped = temps.map((t: any) => ({
        ...t,
        question_count: t.questions?.length || 0,
        submission_count: t.submissions?.length || 0,
      }));
      setTemplates(mapped);
      setTotalSubmissions(mapped.reduce((acc: number, t: Template) => acc + t.submission_count, 0));
    }
    setLoading(false);
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/interview/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Interview link copied!");
  };

  const stats = [
    { label: "Templates", value: templates.length, icon: FileText, color: "text-primary" },
    { label: "Submissions", value: totalSubmissions, icon: Users, color: "text-accent" },
    { label: "Active", value: templates.filter((t) => t.is_active).length, icon: Activity, color: "text-success" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Manage your video interviews</p>
          </div>
          <Link to="/admin/templates/new" className="glow-button flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> New Template
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`font-display text-2xl font-bold stat-glow ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Templates */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Interview Templates</h2>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No templates yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-hover gradient-border p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display font-semibold text-lg leading-tight">{template.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        template.is_active
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>{template.question_count} questions</span>
                    <span>{template.submission_count} submissions</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/templates/${template.id}`}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Eye className="h-3 w-3" /> Edit
                    </Link>
                    <button
                      onClick={() => copyLink(template.id)}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Copy className="h-3 w-3" /> Share
                    </button>
                    <Link
                      to={`/admin/submissions?template=${template.id}`}
                      className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <Users className="h-3 w-3" /> Review
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
