import { useEffect, useState } from "react";
import { UserPlus, Shield, Eye, Users as UsersIcon, Crown, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email";

interface Member {
  id: string;
  email: string;
  role: string;
  user_id: string | null;
  joined_at: string | null;
  invited_at: string;
  invite_token: string | null;
  is_active: boolean;
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  owner: "Full access including team and billing management",
  admin: "Create templates, invite candidates, review, manage team",
  recruiter: "Create templates, invite candidates, review submissions",
  viewer: "View submissions and leave ratings only",
};

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  recruiter: UsersIcon,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  owner: "text-[hsl(var(--warning))]",
  admin: "text-primary",
  recruiter: "text-accent",
  viewer: "text-muted-foreground",
};

export default function TeamSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("org_members")
      .select("*")
      .order("role")
      .order("created_at");

    if (data) setMembers(data as any);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    try {
      // Get org id
      const { data: org } = await supabase
        .from("organisations")
        .select("id, name")
        .limit(1)
        .maybeSingle();
      if (!org) throw new Error("No organisation found");

      const orgData = org as any;

      // Create member record
      const { data: member, error } = await supabase
        .from("org_members")
        .insert({
          org_id: orgData.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        } as any)
        .select("id, invite_token")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("This person is already a team member");
        } else {
          throw error;
        }
        return;
      }

      const memberData = member as any;
      const joinUrl = `${window.location.origin}/join/${memberData.invite_token}`;

      // Send invite email
      await sendEmail({
        to: inviteEmail.trim(),
        subject: `You've been invited to join ${orgData.name} on InterviewPro`,
        html: buildTeamInviteHtml(orgData.name, roleLabels[inviteRole], joinUrl),
        templateId: orgData.id,
        templateType: "team_invite",
      });

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    const { error } = await supabase
      .from("org_members")
      .update({ role } as any)
      .eq("id", memberId);
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
    toast.success("Role updated");
  };

  const removeMember = async (member: Member) => {
    if (member.role === "owner") {
      toast.error("Cannot remove the owner");
      return;
    }
    const { error } = await supabase
      .from("org_members")
      .update({ is_active: false } as any)
      .eq("id", member.id);
    if (error) {
      toast.error("Failed to remove member");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast.success("Member removed");
  };

  const activeMembers = members.filter((m) => m.is_active);
  const pendingInvites = activeMembers.filter((m) => !m.joined_at);
  const joinedMembers = activeMembers.filter((m) => m.joined_at);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Team</h1>
            <p className="mt-1 text-muted-foreground">Manage team members and roles</p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="glow-button flex items-center gap-2 text-sm"
          >
            <UserPlus className="h-4 w-4" /> Invite Member
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Active Members */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold">
                Members ({joinedMembers.length})
              </h2>
              {joinedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members yet. Invite someone to get started.</p>
              ) : (
                <div className="space-y-3">
                  {joinedMembers.map((m) => {
                    const Icon = roleIcons[m.role] || Eye;
                    const isCurrentUser = m.user_id === currentUserId;
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-secondary ${roleColors[m.role]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {m.email}
                              {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(m.joined_at!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.role === "owner" ? (
                            <span className="text-xs font-medium text-[hsl(var(--warning))]">Owner</span>
                          ) : (
                            <>
                              <select
                                value={m.role}
                                onChange={(e) => updateRole(m.id, e.target.value)}
                                className="rounded-md bg-secondary px-2 py-1 text-xs border border-border/50"
                              >
                                <option value="admin">Admin</option>
                                <option value="recruiter">Recruiter</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => removeMember(m)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold">
                  Pending Invitations ({pendingInvites.length})
                </h2>
                <div className="space-y-3">
                  {pendingInvites.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="text-sm font-medium">{m.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {new Date(m.invited_at).toLocaleDateString()} as {roleLabels[m.role]}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMember(m)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role descriptions */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold">Role Permissions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(roleDescriptions).map(([role, desc]) => {
                  const Icon = roleIcons[role] || Eye;
                  return (
                    <div key={role} className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${roleColors[role]}`} />
                        <span className="text-sm font-medium">{roleLabels[role]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter</option>
                <option value="viewer">Viewer</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {roleDescriptions[inviteRole]}
              </p>
            </div>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full">
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function buildTeamInviteHtml(orgName: string, role: string, joinUrl: string): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f0f23; color: #e2e8f0;">
    <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #fff;">You're Invited!</h1>
    <p style="color: #94a3b8; margin: 0 0 24px;">You've been invited to join <strong style="color: #fff;">${orgName}</strong> on InterviewPro as a <strong style="color: #818cf8;">${role}</strong>.</p>
    <a href="${joinUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Accept Invitation</a>
    <p style="margin-top: 24px; font-size: 12px; color: #64748b;">If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>`;
}
