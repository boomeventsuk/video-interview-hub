import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getMimeType(url: string): string {
  if (url.endsWith(".mp4")) return "video/mp4";
  if (url.endsWith(".webm")) return "video/webm";
  if (url.endsWith(".3gp") || url.endsWith(".3gpp")) return "video/3gpp";
  return "video/webm";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submission_id } = await req.json();
    if (!submission_id) throw new Error("submission_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Delete any existing evaluation (for re-runs)
    await supabase.from("ai_evaluations").delete().eq("submission_id", submission_id);

    // Load submission
    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .select("*, interview_templates(title, description, department)")
      .eq("id", submission_id)
      .single();
    if (subErr || !submission) throw new Error("Submission not found");

    // Load answers with questions
    const { data: answers } = await supabase
      .from("submission_answers")
      .select("*, questions(question_text, description)")
      .eq("submission_id", submission_id)
      .order("created_at");

    if (!answers || answers.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No answers to evaluate" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = (submission as any).interview_templates;
    const candidateName = (submission as any).applicant_name;

    // Build multimodal content parts — use URLs directly (no downloading)
    const contentParts: any[] = [];

    contentParts.push({
      type: "text",
      text: `Candidate: ${candidateName}\nInterview: ${template?.title || "Unknown"}\n${template?.department ? `Department: ${template.department}\n` : ""}${template?.description ? `Role description: ${template.description}\n` : ""}\nTotal questions: ${answers.length}\nQuestions answered: ${answers.filter((a: any) => !!a.video_url).length}\nQuestions skipped: ${answers.filter((a: any) => !a.video_url).length}\n`,
    });

    for (let i = 0; i < answers.length; i++) {
      const a = answers[i] as any;
      const q = a.questions;

      contentParts.push({
        type: "text",
        text: `\n--- Question ${i + 1} of ${answers.length} ---\n"${q?.question_text || "Unknown"}"${q?.description ? ` (Context: ${q.description})` : ""}`,
      });

      if (a.video_url) {
        console.log(`Including video ${i + 1} via URL: ${a.video_url}`);
        contentParts.push({
          type: "image_url",
          image_url: { url: a.video_url },
        });
        contentParts.push({
          type: "text",
          text: `[Video response above for Question ${i + 1}]`,
        });
      } else {
        contentParts.push({
          type: "text",
          text: `[SKIPPED — No recording submitted for this question]`,
        });
      }
    }

    contentParts.push({
      type: "text",
      text: `\nPlease carefully watch each video response and provide a thorough evaluation of this candidate.`,
    });

    const systemPrompt = `You are an expert hiring evaluator for ${template?.title || "a role"}${template?.department ? ` in the ${template.department} department` : ""}. 

You are evaluating a candidate's video interview submission. You will receive the actual video recordings of the candidate answering each question. Watch each video carefully and evaluate based on:

- **Communication skills**: clarity of speech, articulation, confidence, pace, and fluency
- **Body language & presentation**: eye contact, posture, professional appearance, energy
- **Content quality**: relevance, depth, and structure of their answers to each specific question
- **Enthusiasm & engagement**: genuine interest in the role, passion, and energy
- **Critical thinking**: ability to think on their feet, provide examples, and reason through questions
- **Overall suitability**: how well they match the requirements of the role

${template?.description ? `Role description: ${template.description}` : ""}

Be specific in your evaluation — reference what you observed in the videos. Note any skipped questions as a concern.

You MUST call the suggest_evaluation function with your assessment.`;

    console.log(`Sending AI request with ${contentParts.length} content parts (video URLs, not base64)`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_evaluation",
              description: "Submit a structured evaluation of the candidate based on their video responses",
              parameters: {
                type: "object",
                properties: {
                  overall_score: {
                    type: "integer",
                    description: "Score from 1-10 (1=poor, 10=exceptional)",
                  },
                  summary: {
                    type: "string",
                    description: "2-3 sentence overview of the candidate's performance based on what you observed in the videos",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 key strengths observed in the video responses",
                  },
                  concerns: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-3 concerns or areas to probe further based on the video responses",
                  },
                  recommendation: {
                    type: "string",
                    enum: ["strongly_recommend", "recommend", "consider", "do_not_recommend"],
                    description: "Hiring recommendation",
                  },
                },
                required: ["overall_score", "summary", "strengths", "concerns", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_evaluation" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted, please top up" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response choices:", JSON.stringify(aiData.choices?.[0]?.message, null, 2));

    let evaluation: any = null;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        evaluation = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (!evaluation) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        console.log("No tool call found, trying to parse content as JSON");
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) evaluation = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse content as JSON:", e);
        }
      }
    }

    if (!evaluation) {
      console.error("Full AI response:", JSON.stringify(aiData, null, 2));
      throw new Error("No evaluation returned from AI");
    }

    const normalizedEval = {
      overall_score: Math.min(10, Math.max(1, evaluation.overall_score || 5)),
      summary: evaluation.summary || "Evaluation completed.",
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
      concerns: Array.isArray(evaluation.concerns) ? evaluation.concerns : [],
      recommendation: ["strongly_recommend", "recommend", "consider", "do_not_recommend"].includes(evaluation.recommendation)
        ? evaluation.recommendation
        : "consider",
    };

    const { error: insertErr } = await supabase.from("ai_evaluations").insert({
      submission_id,
      overall_score: normalizedEval.overall_score,
      summary: normalizedEval.summary,
      strengths: normalizedEval.strengths,
      concerns: normalizedEval.concerns,
      recommendation: normalizedEval.recommendation,
      raw_response: aiData,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw new Error("Failed to save evaluation");
    }

    return new Response(JSON.stringify({ success: true, evaluation: normalizedEval }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-evaluate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
