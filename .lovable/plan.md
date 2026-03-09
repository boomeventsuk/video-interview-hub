

## Why the AI Can't Access Videos — And How to Fix It

### Root Cause Analysis

The problem is a chain of constraints between the Lovable AI gateway and how Gemini receives video:

1. **URL approach failed** (first attempt): The gateway passes URLs through the OpenAI `image_url` field. The gateway or Google validated the URL extension and rejected `.webm` because it expected image formats (PNG, JPEG, WebP, GIF). Gemini's *native* API does support fetching public HTTP video URLs, but the OpenAI-compatible gateway layer doesn't translate video URLs correctly.

2. **Base64 approach failed** (second attempt): Downloading 4 videos (20-30MB each) into the edge function's memory, then base64-encoding them (33% size increase), pushed total memory to 100-160MB — exceeding the edge function's compute limit (`WORKER_LIMIT`).

3. **The gateway limitation**: The Lovable AI gateway (`ai.gateway.lovable.dev`) uses the OpenAI-compatible API format. It appears to only support images via `image_url`, not video. Even data URIs like `data:video/webm;base64,...` likely get rejected or the files are simply too large for inline transport (Google's inline limit is ~20MB per request).

### The Fix: Process One Video at a Time

Instead of sending all 4 videos in a single request, we process each video individually:

1. **For each answer with a video**: Download the video, base64-encode it, send it to Gemini as a single-video request with the question context, get a per-question evaluation
2. **Aggregate results**: After all per-question evaluations complete, make one final text-only call to synthesize an overall evaluation
3. **Memory management**: Only one video is in memory at a time (~30MB raw + ~40MB base64 = ~70MB), which should fit within edge function limits
4. **Skip oversized videos**: If any single video exceeds 15MB, note it as "too large for AI analysis" and evaluate based on metadata only

### Implementation Details

**File changed**: `supabase/functions/ai-evaluate/index.ts`

The edge function will:
- Loop through answers sequentially
- For each answer with a video URL: fetch the video bytes, encode to base64, send a focused single-question evaluation request to `google/gemini-2.5-flash` with the video as a `data:video/webm;base64,...` data URI in the `image_url` field
- Collect per-question scores and notes
- Make a final aggregation call (text-only) combining all per-question results into the overall evaluation structure
- Store the result in `ai_evaluations` as before

This approach keeps memory usage manageable while giving Gemini actual video footage to analyze.

