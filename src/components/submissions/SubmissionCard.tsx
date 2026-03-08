import { motion } from "framer-motion";
import { User, Calendar, Star } from "lucide-react";

export interface Submission {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  created_at: string;
  template_title: string;
  template_id: string;
  reviewer_notes: string | null;
  overall_rating: number | null;
}

export const statusColors: Record<string, string> = {
  invited: "bg-accent/10 text-accent/70",
  started: "bg-accent/20 text-accent",
  new: "bg-accent/20 text-accent",
  in_review: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]",
  reviewed: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]",
  shortlisted: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  on_hold: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/20 text-destructive",
  expired: "bg-muted text-muted-foreground/50",
};

export const statusLabels: Record<string, string> = {
  invited: "Invited",
  started: "Started",
  new: "New",
  in_review: "In Review",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  on_hold: "On Hold",
  rejected: "Rejected",
  expired: "Expired",
};

export const statusOptions = ["invited", "started", "new", "in_review", "reviewed", "shortlisted", "on_hold", "rejected"];

interface Props {
  sub: Submission;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function SubmissionCard({ sub, index, isSelected, onClick }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={`w-full text-left glass-card-hover p-4 ${
        isSelected ? "ring-1 ring-primary/50" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{sub.applicant_name}</p>
            <p className="text-xs text-muted-foreground">{sub.applicant_email}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sub.status] || ""}`}>
          {statusLabels[sub.status] || sub.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{sub.template_title}</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(sub.created_at).toLocaleDateString()}
        </span>
        {sub.overall_rating != null && (
          <span className="flex items-center gap-0.5 text-[hsl(var(--warning))]">
            <Star className="h-3 w-3 fill-current" />
            {sub.overall_rating.toFixed(1)}
          </span>
        )}
      </div>
    </motion.button>
  );
}
