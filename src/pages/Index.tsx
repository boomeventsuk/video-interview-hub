import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Video, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen mesh-gradient overflow-hidden">
      <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-accent/8 blur-3xl animate-float" style={{ animationDelay: "4s" }} />

      <header className="relative z-10 flex items-center justify-between p-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">InterviewPro</span>
        </div>
        <Link
          to="/login"
          className="rounded-lg border border-border/50 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Admin Login
        </Link>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl space-y-6"
        >
          <h1 className="font-display text-5xl font-bold leading-tight lg:text-6xl">
            The Future of{" "}
            <span className="gradient-text">Video Interviews</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Create stunning one-way video interviews, share a link, and review candidates at your own pace. Fast, elegant, effortless.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/login" className="glow-button flex items-center gap-2 text-lg py-4 px-8">
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-24 grid max-w-4xl gap-6 sm:grid-cols-3"
        >
          {[
            { icon: Video, title: "Record Anywhere", desc: "Candidates record from any device with a camera" },
            { icon: Shield, title: "Secure & Private", desc: "Enterprise-grade security for all video data" },
            { icon: Zap, title: "Lightning Fast", desc: "Review interviews 10x faster than live calls" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className="glass-card-hover p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
