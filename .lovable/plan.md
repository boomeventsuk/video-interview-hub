

## Plan: Enable Real Video Analysis in AI Evaluation

### The Problem
The previous fix incorrectly removed video analysis, sending only text metadata to Gemini. You're right — Gemini fully supports `video/webm` as an input format. The correct approach is to download the candidate videos from storage and send them as base64 inline data.

### How It Works

**Edge function (`supabase/functions/ai-evaluate/index.ts`)** will be updated to:

1. **Download each candidate video** from the public storage URL using `fetch()`
2. **Convert to base64** using Deno's standard encoding
3. **Send as multimodal content** using the OpenAI-compatible format with `image_url` type and a `data:video/webm;base64,...` data URI (this is how Gemini receives video through the OpenAI-compatible gateway)
4. **Pair each video with its question text** so Gemini evaluates each answer in context

### Content Structure Sent to Gemini
For each question-answer pair:
- A text part with the question text and context
- If video exists: an `image_url` part with the base64-encoded video (MIME type `video/webm` or `video/mp4` based on the file extension)
- If skipped: a text note saying it was skipped

### Safety Measures
- **Size guard**: Skip base64 encoding for any individual video over 15MB to stay within edge function memory limits; note it as "video too large for inline analysis" in the prompt
- **Timeout handling**: The function already handles gateway errors; no change needed
- **MIME detection**: Check file extension (`.webm` vs `.mp4`) to set the correct MIME type since Safari records MP4

### Technical Details
- Gemini supports these video MIME types: `video/webm`, `video/mp4`, `video/3gpp`, `video/wmv`, `video/mpg`
- The OpenAI-compatible API accepts video via `image_url` with data URIs
- Base64 encoding increases size ~33%, so a 15MB video becomes ~20MB in the request
- Update the system prompt to instruct Gemini to actually watch and evaluate the video responses (body language, communication, confidence, etc.)

### Files Changed
- `supabase/functions/ai-evaluate/index.ts` — download videos, encode base64, send as multimodal content

