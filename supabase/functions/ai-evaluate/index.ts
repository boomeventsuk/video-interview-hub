import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    await supabase
      .from("ai_evaluations")
      .delete()
      .eq("submission_id", submission_id);

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

    // Build the user message with video content parts for multimodal analysis
    const contentParts: any[] = [];

    // Add text context first
    const systemPrompt = `You are an expert hiring evaluator for ${template?.title || "a role"}${template?.department ? ` in the ${template.department} department` : ""}. 

You are evaluating a candidate's video interview submission. You will be shown the actual video recordings of their responses. Evaluate based on:
- Communication skills (clarity, confidence, articulation)
- Relevance and quality of their answers to each question
- Enthusiasm and engagement
- Professional presentation
- How well they understand and address the specific requirements mentioned in each question
- Overall suitability for the role

${template?.description ? `Role description: ${template.description}` : ""}

Provide your evaluation using the suggest_evaluation function.`;

    let textContext = `Candidate: ${candidateName}\nInterview: ${template?.title || "Unknown"}\n${template?.department ? `Department: ${template.department}\n` : ""}\n`;

    // Add each question and its video
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i] as any;
      const q = a.questions;
      const hasVideo = !!a.video_url;

      textContext += `\n--- Question ${i + 1} of ${answers.length} ---\n"${q?.question_text || "Unknown"}"${q?.description ? ` (Context: ${q.description})` : ""}\n`;

      if (hasVideo) {
        textContext += `[Video response provided below]\n`;
      } else {
        textContext += `[SKIPPED - No recording submitted]\n`;
      }
    }

    // Add the text context
    contentParts.push({ type: "text", text: textContext });

    // Add video URLs as content parts for Gemini multimodal processing
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i] as any;
      const q = a.questions;
      if (a.video_url) {
        contentParts.push({
          type: "text",
          text: `\nVideo response for Question ${i + 1} ("${q?.question_text || "Unknown"}"):`
        });
        contentParts.push({
          type: "image_url",
          image_url: { url: a.video_url }
        });
      }
    }

    contentParts.push({
      type: "text",
      text: `\nTotal questions: ${answers.length}\nQuestions answered: ${answers.filter((a: any) => !!a.video_url).length}\nQuestions skipped: ${answers.filter((a: any) => !a.video_url).length}\n\nPlease watch all videos carefully and provide a thorough evaluation of this candidate.`
    });

    // Call Gemini Pro via Lovable AI gateway - using Pro for better video understanding
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
                    description: "Score from 1-10 (1=poor, 10=exceptional) based on video performance",
                  },
                  summary: {
                    type: "string",
                    description: "2-3 sentence overview of the candidate's performance based on watching their videos",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 key strengths observed from the video responses",
                  },
                  concerns: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-3 concerns or areas to probe further based on the video responses",
                  },
                  recommendation: {
                    type: "string",
                    enum: ["strongly_recommend", "recommend", "consider", "do_not_recommend"],
                    description: "Hiring recommendation based on video interview performance",
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
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No evaluation returned from AI");

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Store evaluation
    const { error: insertErr } = await supabase.from("ai_evaluations").insert({
      submission_id,
      overall_score: Math.min(10, Math.max(1, evaluation.overall_score)),
      summary: evaluation.summary,
      strengths: evaluation.strengths || [],
      concerns: evaluation.concerns || [],
      recommendation: evaluation.recommendation,
      raw_response: aiData,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw new Error("Failed to save evaluation");
    }

    return new Response(JSON.stringify({ success: true, evaluation }), {
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
