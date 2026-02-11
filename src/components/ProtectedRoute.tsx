import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { checkIsAdmin } from "@/lib/supabase-helpers";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      checkIsAdmin().then(setIsAdmin);
    } else if (!authLoading) {
      setIsAdmin(false);
    }
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have admin access. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
