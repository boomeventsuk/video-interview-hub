import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Clock, Video, CalendarIcon, Eye, X, RotateCcw, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoRecorderDialog from "@/components/VideoRecorderDialog";
import InviteCandidateDialog from "@/components/InviteCandidateDialog";
import BulkInviteDialog from "@/components/BulkInviteDialog";

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  prep_time_seconds: number;
  recording_duration_seconds: number;
  description: string;
  is_required: boolean;
  video_prompt_url: string | null;
  _isNew?: boolean;
}

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [retakesAllowed, setRetakesAllowed] = useState(1);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [dbQuestionIds, setDbQuestionIds] = useState<Set<string>>(new Set());
  const [recordingQuestionId, setRecordingQuestionId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

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
      setDepartment(template.department || "");
      setIsActive(template.is_active);
      setRetakesAllowed(template.retakes_allowed ?? 1);
      setRedirectUrl(template.redirect_url || "");
      setDeadline(template.deadline ? new Date(template.deadline) : undefined);
      setIntroVideoUrl(template.intro_video_url || null);
    }

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("template_id", id!)
      .eq("is_deleted", false)
      .order("order_index");

    if (qs) {
      setQuestions(
        qs.map((q) => ({
          ...q,
          description: q.description || "",
          is_required: q.is_required ?? true,
          video_prompt_url: q.video_prompt_url || null,
        }))
      );
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
        description: "",
        is_required: true,
        video_prompt_url: null,
        _isNew: true,
      },
    ]);
  };

  const updateQuestion = (qId: string, field: keyof Question, value: string | number | boolean | null) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, [field]: field === "video_prompt_url" && value === "" ? null : value } : q)));
  };

  const removeQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleIntroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File must be under 100 MB");
      return;
    }
    const templateId = isNew ? "draft" : id;
    const ext = file.name.split(".").pop() || "webm";
    const path = `intros/${templateId}.${ext}`;
    const { data, error } = await supabase.storage.from("interview-videos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Failed to upload intro video");
      return;
    }
    const { data: urlData } = supabase.storage.from("interview-videos").getPublicUrl(path);
    setIntroVideoUrl(urlData.publicUrl);
    toast.success("Intro video uploaded!");
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
      const templateData = {
        title,
        description,
        department: department || null,
        is_active: isActive,
        retakes_allowed: retakesAllowed,
        redirect_url: redirectUrl || null,
        deadline: deadline ? deadline.toISOString() : null,
        intro_video_url: introVideoUrl,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("interview_templates")
          .insert({ ...templateData, admin_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      } else {
        const { error } = await supabase
          .from("interview_templates")
          .update(templateData)
          .eq("id", id!);
        if (error) throw error;
      }

      // Upsert strategy for questions
      const currentQuestionIds = new Set(questions.map((q) => q.id));
      const removedIds = [...dbQuestionIds].filter((dbId) => !currentQuestionIds.has(dbId));

      for (const removedId of removedIds) {
        const { count } = await supabase
          .from("submission_answers")
          .select("id", { count: "exact", head: true })
          .eq("question_id", removedId);

        if (count && count > 0) {
          await supabase.from("questions").update({ is_deleted: true }).eq("id", removedId);
        } else {
          await supabase.from("questions").delete().eq("id", removedId);
        }
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const row = {
          template_id: templateId!,
          question_text: q.question_text,
          order_index: i,
          prep_time_seconds: q.prep_time_seconds,
          recording_duration_seconds: q.recording_duration_seconds,
          description: q.description || null,
          is_required: q.is_required,
          video_prompt_url: q.video_prompt_url,
        };

        if (q._isNew || !dbQuestionIds.has(q.id)) {
          const { error } = await supabase.from("questions").insert(row);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("questions").update(row).eq("id", q.id);
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
        <div className="flex items-center justify-between">
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
          {!isNew && id && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkInviteOpen(true)}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Bulk Invite
              </Button>
              <a
                href={`/interview/${id}?preview=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Eye className="h-3 w-3" /> Preview
              </a>
            </div>
          )}
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
            <Label>Department</Label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering, Marketing, Sales"
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
              <Label>Deadline (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-secondary/50 border-border/50",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "No deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {deadline && (
                    <div className="p-2 border-t border-border">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setDeadline(undefined)}>
                        Clear deadline
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
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

          {/* Intro Video */}
          <div className="space-y-2">
            <Label>Intro Video (optional)</Label>
            {introVideoUrl ? (
              <div className="space-y-2">
                <video src={introVideoUrl} controls className="w-full max-w-sm rounded-lg border border-border" />
                <Button variant="ghost" size="sm" onClick={() => setIntroVideoUrl(null)}>
                  Remove intro video
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer">
                    <Video className="h-4 w-4" /> Upload
                    <input type="file" accept="video/*" className="hidden" onChange={handleIntroVideoUpload} />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecordingQuestionId("__intro__")}
                  >
                    <Video className="h-4 w-4 mr-1" /> Record
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Shown to candidates before they start. Max 100 MB.</p>
              </div>
            )}
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
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            Question {i + 1}
                          </span>
                          {!q.is_required && (
                            <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Optional</span>
                          )}
                        </div>
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
                      <Textarea
                        value={q.description}
                        onChange={(e) => updateQuestion(q.id, "description", e.target.value)}
                        placeholder="Description / hints for the candidate (optional)"
                        className="bg-secondary/50 border-border/50 resize-none text-sm"
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
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={q.is_required}
                          onCheckedChange={(val) => updateQuestion(q.id, "is_required", val)}
                          id={`required-${q.id}`}
                        />
                        <Label htmlFor={`required-${q.id}`} className="text-xs">Required</Label>
                      </div>

                      {/* Video Prompt */}
                      <div className="space-y-2">
                        {q.video_prompt_url ? (
                          <div className="space-y-2">
                            <Label className="text-xs">Video Prompt</Label>
                            <video src={q.video_prompt_url} controls className="w-full max-w-xs rounded-lg border border-border" preload="metadata" />
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setRecordingQuestionId(q.id)}>
                                <RotateCcw className="h-3 w-3 mr-1" /> Re-record
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => updateQuestion(q.id, "video_prompt_url", "")}>
                                <X className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setRecordingQuestionId(q.id)}
                          >
                            <Video className="h-3 w-3 mr-1" /> Record Video Prompt
                          </Button>
                        )}
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

      {/* Video Recorder Dialog for question prompts and intro video */}
      <VideoRecorderDialog
        open={!!recordingQuestionId}
        onOpenChange={(open) => { if (!open) setRecordingQuestionId(null); }}
        storagePath={
          recordingQuestionId === "__intro__"
            ? `intros/${id || "draft"}-recorded.webm`
            : `prompts/${id || "draft"}/${recordingQuestionId || "tmp"}.webm`
        }
        onRecorded={(url) => {
          if (recordingQuestionId === "__intro__") {
            setIntroVideoUrl(url);
          } else if (recordingQuestionId) {
            updateQuestion(recordingQuestionId, "video_prompt_url", url);
          }
          setRecordingQuestionId(null);
        }}
        title={recordingQuestionId === "__intro__" ? "Record Intro Video" : "Record Question Video Prompt"}
      />
    </AdminLayout>
  );
}
