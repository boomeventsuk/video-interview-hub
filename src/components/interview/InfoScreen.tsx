import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InfoScreenProps {
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export default function InfoScreen({ name, email, onNameChange, onEmailChange, onSubmit, submitting }: InfoScreenProps) {
  return (
    <motion.div
      key="info"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-md w-full px-4"
    >
      <form
        className="glass-card p-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && email.trim() && !submitting) onSubmit();
        }}
      >
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">Your Information</h2>
          <p className="text-sm text-muted-foreground mt-1">We'll need your name and email to get started</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="candidate-name">Full Name</Label>
            <Input
              id="candidate-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="John Doe"
              className="bg-secondary/50 border-border/50"
              aria-required="true"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidate-email">Email Address</Label>
            <Input
              id="candidate-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="john@example.com"
              className="bg-secondary/50 border-border/50"
              aria-required="true"
              autoComplete="email"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim() || !email.trim() || submitting}
          className="glow-button w-full disabled:opacity-50"
          aria-label="Continue to device setup"
        >
          {submitting ? "Setting up..." : "Continue"}
        </button>
      </form>
    </motion.div>
  );
}
