import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface WelcomeScreenProps {
  title: string;
  description: string;
  questionCount: number;
  onBegin: () => void;
}

export default function WelcomeScreen({ title, description, questionCount, onBegin }: WelcomeScreenProps) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-lg w-full px-4 text-center"
    >
      <div className="glass-card p-10 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
        <p className="text-sm text-muted-foreground">
          {questionCount} question{questionCount !== 1 ? "s" : ""} • Timed recording
        </p>
        <button onClick={onBegin} className="glow-button w-full text-lg py-4" aria-label="Begin interview">
          Begin Interview
        </button>
      </div>
    </motion.div>
  );
}
