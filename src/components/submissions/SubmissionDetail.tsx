import { useState } from "react";
import { ChevronDown, FileDown, StickyNote } from "lucide-react";
import { Submission, statusOptions } from "./SubmissionCard";
import { Answer } from "./AnswerCard";
import AnswerCard from "./AnswerCard";

interface Props {
  submission: Submission;
  answers: Answer[];
  onStatusChange: (status: string) => void;
  onRate: (answerId: string, rating: number) => void;
  onNotesChange: (notes: string) => void;
}

export default function SubmissionDetail({
  submission,
  answers,
  onStatusChange,
  onRate,
  onNotesChange,
}: Props) {
  const [notes, setNotes] = useState(submission.reviewer_notes || "");
  const [notesOpen, setNotesOpen] = useState(!!submission.reviewer_notes);

  const handleNotesBlur = () => {
    if (notes !== (submission.reviewer_notes || "")) {
      onNotesChange(notes);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{submission.applicant_name}</h2>
          <p className="text-sm text-muted-foreground">{submission.applicant_email}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={submission.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none rounded-lg bg-secondary px-4 py-2 pr-8 text-sm font-medium text-secondary-foreground border border-border/50 cursor-pointer"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Reviewer Notes */}
      <div>
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="h-4 w-4" />
          {notesOpen ? "Hide notes" : "Add notes"}
        </button>
        {notesOpen && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add private reviewer notes..."
            className="mt-2 w-full rounded-lg bg-secondary/50 border border-border/50 p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            rows={3}
          />
        )}
      </div>

      {/* Answers */}
      <div className="space-y-4">
        {answers.map((ans, i) => (
          <AnswerCard key={ans.id} answer={ans} index={i} onRate={onRate} />
        ))}
        {answers.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No answers recorded.</p>
        )}
      </div>
    </div>
  );
}
