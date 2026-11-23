# Viral Shorts Studio

A starter Next.js app that downloads a user-provided YouTube URL, transcribes it, proposes viral moments, and renders 9:16 clips.

## Requirements
- Node.js 20+
- FFmpeg installed and available on PATH
- yt-dlp installed and available on PATH
- OpenAI API key
- Permission to download and edit the source video. Respect YouTube terms, copyright, and creator rights.

## Run locally
```bash
cp .env.example .env.local
# add OPENAI_API_KEY
npm install
npm run dev
```
Open http://localhost:3000.

## Pipeline
1. `POST /api/fetch-video` downloads the video to `tmp/<jobId>.mp4`.
2. `POST /api/transcribe` extracts mono MP3 audio and calls Whisper with word + segment timestamps.
3. `POST /api/analyze-hooks` sends timestamped segments to GPT-4o using JSON Schema output.
4. `POST /api/render-clip` trims and center-crops the chosen moment to 1080x1920.

## Important implementation notes
- The render endpoint groups Whisper word timestamps into short caption lines, writes an SRT file, and burns captions using FFmpeg's subtitles filter. For production, bundle a font and tune caption styling.
- Speaker tracking is not implemented in this starter: the crop is centered. Add MediaPipe face/person detection, smooth the tracked center across frames, and feed crop keyframes to FFmpeg. Use MediaPipe face/person detection to generate a smoothed per-frame crop x-coordinate, then feed a crop expression or crop keyframe pipeline to FFmpeg.
- For videos with audio larger than 25 MB, chunk audio at silence/sentence boundaries and transcribe each chunk; offset returned timestamps by each chunk's start time. OpenAI's current speech guide documents the 25 MB upload limit.
- `whisper-1` currently supports word timestamps via `verbose_json` + `timestamp_granularities:["word"]`; OpenAI documentation marks Whisper and several legacy transcription models for shutdown on Feb 26, 2027. Plan migration to the current transcription model, or use a compatible timestamping/alignment workflow.
- `tmp/` is local disk. It is not durable on serverless hosts and may be ephemeral. Use a queue/worker and object storage (S3-compatible) for production.
- Add authentication, rate limits, job ownership checks, file-size/duration limits, cleanup, logging, and signed download URLs before exposing this publicly.
- The URL allowlist is basic; yt-dlp itself is a powerful downloader. Run it in an isolated worker/container with network egress restrictions. Do not accept arbitrary URLs.
- `maxDuration` values are hints/platform-dependent and do not make serverless video processing reliable.

## Free/low-cost deployment
- GitHub: source-code repository only.
- Frontend: Vercel free tier is suitable for UI, not long FFmpeg jobs.
- Worker: run locally, on a spare PC, or a free-tier VM if one is available; free VM quotas change and may sleep.
- Alternative: Docker on a small VPS for the entire app + worker. Truly free, always-on video processing is not a realistic assumption.

## Exact hook extraction system prompt
See `lib/hook-prompt.ts`.
