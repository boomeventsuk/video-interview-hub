import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function JoinTeam() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    checkInvite();
  }, [token]);

  const checkInvite = async () => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    const { data: member } = await supabase
      .from("org_members")
      .select("*, organisations(name)")
      .eq("invite_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      setError("This invitation is invalid or has already been used.");
      setLoading(false);
      return;
    }

    const m = member as any;
    if (m.joined_at) {
      setError("This invitation has already been accepted.");
      setLoading(false);
      return;
    }

    setOrgName(m.organisations?.name || "the team");
    setRole(m.role);
    setMemberId(m.id);
    setLoading(false);
  };

  const handleJoin = async () => {
    setJoining(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Store token in localStorage and redirect to login
      localStorage.setItem("pending_team_invite", token!);
      navigate("/login");
      return;
    }

    // Accept the invitation
    const { error: err } = await supabase
      .from("org_members")
      .update({
        user_id: user.id,
        joined_at: new Date().toISOString(),
        invite_token: null,
      } as any)
      .eq("id", memberId);

    if (err) {
      toast.error("Failed to join team");
      setJoining(false);
      return;
    }

    // Also ensure user has admin role in user_roles if they're owner/admin
    if (role === "owner" || role === "admin") {
      await supabase.from("user_roles").upsert({
        user_id: user.id,
        role: "admin",
      } as any, { onConflict: "user_id,role" });
    }

    setJoined(true);
    setJoining(false);
    toast.success("Welcome to the team!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-8 text-center max-w-md space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-[hsl(var(--success))]" />
          <h2 className="font-display text-xl font-bold">Welcome to {orgName}!</h2>
          <p className="text-muted-foreground">You've joined as a {role}.</p>
          <Button onClick={() => navigate("/admin")} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient">
      <div className="glass-card p-8 text-center max-w-md space-y-4">
        <h2 className="font-display text-2xl font-bold">Join {orgName}</h2>
        <p className="text-muted-foreground">
          You've been invited to join as a <strong className="text-foreground">{role}</strong>.
        </p>
        <Button onClick={handleJoin} disabled={joining} className="w-full">
          {joining ? "Joining..." : "Accept Invitation"}
        </Button>
      </div>
    </div>
  );
}
