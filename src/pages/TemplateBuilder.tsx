import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Clock, Video } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  prep_time_seconds: number;
  recording_duration_seconds: number;
  _isNew?: boolean; // client-only flag
}

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [retakesAllowed, setRetakesAllowed] = useState(1);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [dbQuestionIds, setDbQuestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isNew && id) loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    const { data: template } = await supabase
      .from("interview_templates")
      .select("*")
      .eq("id", id!)
      .maybeSingle();

    if (template) {
      setTitle(template.title);
      setDescription(template.description || "");
      setIsActive(template.is_active);
      setRetakesAllowed(template.retakes_allowed ?? 1);
      setRedirectUrl(template.redirect_url || "");
    }

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("template_id", id!)
      .eq("is_deleted", false)
      .order("order_index");

    if (qs) {
      setQuestions(qs);
      setDbQuestionIds(new Set(qs.map((q) => q.id)));
    }
    setLoading(false);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: "",
        order_index: questions.length,
        prep_time_seconds: 30,
        recording_duration_seconds: 120,
        _isNew: true,
      },
    ]);
  };

  const updateQuestion = (qId: string, field: keyof Question, value: string | number) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a template title");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let templateId = id;

      if (isNew) {
        const { data, error } = await supabase
          .from("interview_templates")
          .insert({ title, description, is_active: isActive, admin_id: user.id, retakes_allowed: retakesAllowed, redirect_url: redirectUrl || null })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      } else {
        const { error } = await supabase
          .from("interview_templates")
          .update({ title, description, is_active: isActive, retakes_allowed: retakesAllowed, redirect_url: redirectUrl || null })
          .eq("id", id!);
        if (error) throw error;
      }

      // Upsert strategy for questions
      const currentQuestionIds = new Set(questions.map((q) => q.id));
      const removedIds = [...dbQuestionIds].filter((dbId) => !currentQuestionIds.has(dbId));

      // Handle removed questions
      for (const removedId of removedIds) {
        // Check if this question has linked answers
        const { count } = await supabase
          .from("submission_answers")
          .select("id", { count: "exact", head: true })
          .eq("question_id", removedId);

        if (count && count > 0) {
          // Soft-delete: has linked answers
          await supabase
            .from("questions")
            .update({ is_deleted: true })
            .eq("id", removedId);
        } else {
          // Hard delete: no linked answers
          await supabase.from("questions").delete().eq("id", removedId);
        }
      }

      // Update existing and insert new questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const row = {
          template_id: templateId!,
          question_text: q.question_text,
          order_index: i,
          prep_time_seconds: q.prep_time_seconds,
          recording_duration_seconds: q.recording_duration_seconds,
        };

        if (q._isNew || !dbQuestionIds.has(q.id)) {
          // Insert new question
          const { error } = await supabase.from("questions").insert(row);
          if (error) throw error;
        } else {
          // Update existing question
          const { error } = await supabase
            .from("questions")
            .update(row)
            .eq("id", q.id);
          if (error) throw error;
        }
      }

      toast.success("Template saved!");
      navigate("/admin/templates");
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin/templates")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">
              {isNew ? "New Template" : "Edit Template"}
            </h1>
            <p className="text-sm text-muted-foreground">Configure your interview questions</p>
          </div>
        </div>

        {/* Template Info */}
        <div className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Developer Interview"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this interview..."
              className="bg-secondary/50 border-border/50 resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="is-active" />
            <Label htmlFor="is-active">Active (accepting submissions)</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retakes">Retakes Allowed</Label>
              <select
                id="retakes"
                value={retakesAllowed}
                onChange={(e) => setRetakesAllowed(parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={0}>No retakes</option>
                <option value={1}>1 retake</option>
                <option value={2}>2 retakes</option>
                <option value={3}>3 retakes</option>
                <option value={-1}>Unlimited</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirect-url">Redirect URL (optional)</Label>
              <Input
                id="redirect-url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yoursite.com/thanks"
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Questions</h2>
            <button onClick={addQuestion} className="glow-button flex items-center gap-2 text-sm !py-2 !px-4">
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>

          <Reorder.Group
            axis="y"
            values={questions}
            onReorder={(newOrder) => setQuestions(newOrder.map((q, i) => ({ ...q, order_index: i })))}
            className="space-y-3"
          >
            {questions.map((q, i) => (
              <Reorder.Item key={q.id} value={q}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Question {i + 1}
                        </span>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Textarea
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                        placeholder="Enter your question..."
                        className="bg-secondary/50 border-border/50 resize-none"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Prep Time (sec)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={q.prep_time_seconds}
                            onChange={(e) => updateQuestion(q.id, "prep_time_seconds", parseInt(e.target.value) || 0)}
                            className="bg-secondary/50 border-border/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Video className="h-3 w-3" /> Recording Duration (sec)
                          </Label>
                          <Input
                            type="number"
                            min={10}
                            value={q.recording_duration_seconds}
                            onChange={(e) => updateQuestion(q.id, "recording_duration_seconds", parseInt(e.target.value) || 60)}
                            className="bg-secondary/50 border-border/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {questions.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No questions yet. Add your first question above.</p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="glow-button flex items-center gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
