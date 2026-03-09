import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB limit per video
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface PerQuestionResult {
  questionIndex: number;
  questionText: string;
  score: number;
  notes: string;
  hadVideo: boolean;
  videoSkippedReason?: string;
}

function parseToolCall(aiData: any): any {
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try { return JSON.parse(toolCall.function.arguments); } catch {}
  }
  const content = aiData.choices?.[0]?.message?.content;
  if (content) {
    try {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

async function callAI(apiKey: string, body: any): Promise<any> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI gateway error:", resp.status, txt);
    throw Object.assign(new Error(`AI gateway ${resp.status}`), { status: resp.status, body: txt });
  }
  return resp.json();
}

async function evaluateSingleQuestion(
  apiKey: string,
  answer: any,
  questionIndex: number,
  totalQuestions: number,
  template: any,
): Promise<PerQuestionResult> {
  const q = answer.questions;
  const questionText = q?.question_text || "Unknown question";
  const result: PerQuestionResult = {
    questionIndex,
    questionText,
    score: 0,
    notes: "",
    hadVideo: !!answer.video_url,
  };

  if (!answer.video_url) {
    result.score = 2;
    result.notes = "Candidate skipped this question — no video submitted.";
    return result;
  }

  // Try to download the video for multimodal analysis
  let videoBase64: string | null = null;
  let mimeType = "video/webm";
  try {
    console.log(`Downloading video for Q${questionIndex + 1}...`);
    const videoResp = await fetch(answer.video_url);
    if (!videoResp.ok) throw new Error(`HTTP ${videoResp.status}`);
    
    const contentType = videoResp.headers.get("content-type");
    if (contentType?.includes("mp4")) mimeType = "video/mp4";
    
    const videoBytes = await videoResp.arrayBuffer();
    console.log(`Video Q${questionIndex + 1}: ${(videoBytes.byteLength / 1024 / 1024).toFixed(1)}MB`);
    
    if (videoBytes.byteLength > MAX_VIDEO_SIZE) {
      result.videoSkippedReason = `Video too large (${(videoBytes.byteLength / 1024 / 1024).toFixed(0)}MB > 15MB limit)`;
      console.log(result.videoSkippedReason);
    } else {
      // Encode to base64
      const bytes = new Uint8Array(videoBytes);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      videoBase64 = btoa(binary);
      console.log(`Video Q${questionIndex + 1} encoded to base64 (${(videoBase64.length / 1024 / 1024).toFixed(1)}MB)`);
    }
  } catch (e) {
    result.videoSkippedReason = `Failed to download video: ${e instanceof Error ? e.message : "unknown"}`;
    console.error(`Video download failed for Q${questionIndex + 1}:`, e);
  }

  // Build the AI request
  const systemPrompt = `You are an expert interviewer evaluating a candidate's video response for the role "${template?.title || "Unknown"}". Question ${questionIndex + 1} of ${totalQuestions}.

Evaluate the candidate's response on:
- Communication clarity and confidence
- Relevance and depth of answer
- Body language and presentation (if video visible)
- Overall quality

You MUST call the evaluate_answer function with your assessment.`;

  const userContent: any[] = [];
  
  if (videoBase64) {
    // Send video as multimodal content
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${videoBase64}` },
    });
  }

  let textPrompt = `Question: "${questionText}"`;
  if (q?.description) textPrompt += `\nContext: ${q.description}`;
  if (result.videoSkippedReason) {
    textPrompt += `\n\n[Note: Video could not be analyzed: ${result.videoSkippedReason}. Evaluate based on the fact that the candidate did submit a response.]`;
  } else if (videoBase64) {
    textPrompt += `\n\nPlease watch the video response above and evaluate the candidate's answer.`;
  }
  userContent.push({ type: "text", text: textPrompt });

  const aiData = await callAI(apiKey, {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [{
      type: "function",
      function: {
        name: "evaluate_answer",
        description: "Submit evaluation of a single answer",
        parameters: {
          type: "object",
          properties: {
            score: { type: "integer", description: "Score 1-10" },
            notes: { type: "string", description: "2-3 sentence assessment of this answer" },
          },
          required: ["score", "notes"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "evaluate_answer" } },
  });

  // Free the base64 string from memory immediately
  videoBase64 = null;

  const parsed = parseToolCall(aiData);
  if (parsed) {
    result.score = Math.min(10, Math.max(1, parsed.score || 5));
    result.notes = parsed.notes || "Evaluation completed.";
  } else {
    console.error(`No evaluation parsed for Q${questionIndex + 1}:`, JSON.stringify(aiData));
    result.score = 5;
    result.notes = "AI evaluation could not be parsed for this question.";
  }

  return result;
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

    console.log(`Starting sequential AI evaluation for submission ${submission_id} (${answers.length} questions)`);

    // Phase 1: Evaluate each question individually (sequential to manage memory)
    const perQuestionResults: PerQuestionResult[] = [];
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i] as any;
      console.log(`Evaluating Q${i + 1}/${answers.length}...`);
      try {
        const result = await evaluateSingleQuestion(
          LOVABLE_API_KEY, a, i, answers.length, template
        );
        perQuestionResults.push(result);
        console.log(`Q${i + 1} score: ${result.score}/10`);
      } catch (e: any) {
        console.error(`Error evaluating Q${i + 1}:`, e);
        if (e.status === 429 || e.status === 402) {
          return new Response(JSON.stringify({
            success: false,
            error: e.status === 429 ? "Rate limited, please try again later" : "AI credits exhausted, please top up",
          }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        perQuestionResults.push({
          questionIndex: i,
          questionText: a.questions?.question_text || "Unknown",
          score: 5,
          notes: "Could not evaluate this question due to an error.",
          hadVideo: !!a.video_url,
        });
      }
    }

    // Phase 2: Aggregate into final evaluation via a text-only synthesis call
    console.log("Synthesizing overall evaluation...");
    let synthesisPrompt = `Candidate: ${candidateName}\nRole: ${template?.title || "Unknown"}`;
    if (template?.department) synthesisPrompt += ` (${template.department})`;
    if (template?.description) synthesisPrompt += `\nRole description: ${template.description}`;
    synthesisPrompt += `\n\nPer-question evaluation results:\n\n`;

    for (const r of perQuestionResults) {
      synthesisPrompt += `Q${r.questionIndex + 1}: "${r.questionText}"\n`;
      synthesisPrompt += `  Score: ${r.score}/10 | Video: ${r.hadVideo ? "Yes" : "Skipped"}`;
      if (r.videoSkippedReason) synthesisPrompt += ` (${r.videoSkippedReason})`;
      synthesisPrompt += `\n  Notes: ${r.notes}\n\n`;
    }

    const avgScore = perQuestionResults.reduce((s, r) => s + r.score, 0) / perQuestionResults.length;
    synthesisPrompt += `Average per-question score: ${avgScore.toFixed(1)}/10\n`;
    synthesisPrompt += `Questions answered: ${perQuestionResults.filter(r => r.hadVideo).length}/${perQuestionResults.length}`;

    const synthesisSystem = `You are synthesizing per-question interview evaluations into an overall candidate assessment. The individual questions have already been evaluated (with video analysis where possible). Combine these results into a cohesive overall evaluation.

You MUST call the suggest_evaluation function with your final assessment.`;

    const synthesisData = await callAI(LOVABLE_API_KEY, {
      model: MODEL,
      messages: [
        { role: "system", content: synthesisSystem },
        { role: "user", content: synthesisPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "suggest_evaluation",
          description: "Submit overall candidate evaluation",
          parameters: {
            type: "object",
            properties: {
              overall_score: { type: "integer", description: "Score from 1-10" },
              summary: { type: "string", description: "2-3 sentence overview" },
              strengths: { type: "array", items: { type: "string" }, description: "2-4 key strengths" },
              concerns: { type: "array", items: { type: "string" }, description: "1-3 concerns" },
              recommendation: {
                type: "string",
                enum: ["strongly_recommend", "recommend", "consider", "do_not_recommend"],
              },
            },
            required: ["overall_score", "summary", "strengths", "concerns", "recommendation"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "suggest_evaluation" } },
    });

    const evaluation = parseToolCall(synthesisData);
    if (!evaluation) {
      console.error("Synthesis response:", JSON.stringify(synthesisData, null, 2));
      throw new Error("No evaluation returned from AI synthesis");
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
      raw_response: { per_question: perQuestionResults, synthesis: synthesisData },
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw new Error("Failed to save evaluation");
    }

    console.log(`Evaluation complete: ${normalizedEval.overall_score}/10 - ${normalizedEval.recommendation}`);
    return new Response(JSON.stringify({ success: true, evaluation: normalizedEval }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-evaluate error:", e);
    if (e.status === 429 || e.status === 402) {
      return new Response(JSON.stringify({ error: e.status === 429 ? "Rate limited" : "Credits exhausted" }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
