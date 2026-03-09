import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const deleted: string[] = [];

    // 1. Get all video URLs referenced in submission_answers
    const { data: answers } = await supabase
      .from("submission_answers")
      .select("video_url");
    const referencedUrls = new Set(
      (answers || []).map((a: any) => a.video_url).filter(Boolean)
    );

    // 2. Get rejected submissions older than 90 days
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: oldRejected } = await supabase
      .from("submissions")
      .select("id")
      .eq("status", "rejected")
      .lt("created_at", ninetyDaysAgo);
    const rejectedIds = new Set(
      (oldRejected || []).map((s: any) => s.id)
    );

    // 3. List all files in storage bucket
    const { data: folders } = await supabase.storage
      .from("interview-videos")
      .list("", { limit: 1000 });

    for (const folder of folders || []) {
      // Each folder is a submission ID
      const { data: files } = await supabase.storage
        .from("interview-videos")
        .list(folder.name, { limit: 1000 });

      for (const file of files || []) {
        const path = `${folder.name}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from("interview-videos")
          .getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const isOrphaned = !referencedUrls.has(publicUrl);
        const isRejectedOld = rejectedIds.has(folder.name);

        if (isOrphaned || isRejectedOld) {
          await supabase.storage
            .from("interview-videos")
            .remove([path]);
          deleted.push(path);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deleted.length,
        deleted_files: deleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
