import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export const TMP = path.join(process.cwd(), "tmp");
export async function ensureTmp() { await mkdir(TMP, { recursive: true }); }
export const bin = (name: "yt-dlp"|"ffmpeg") =>
  name === "yt-dlp" ? (process.env.YTDLP_PATH || "yt-dlp") : (process.env.FFMPEG_PATH || "ffmpeg");

export function run(command: string, args: string[]) {
  return new Promise<void>((resolve,reject) => {
    const child = spawn(command,args,{stdio:["ignore","pipe","pipe"]});
    let stderr = "";
    child.stderr.on("data", d => stderr += d.toString());
    child.on("error",reject);
    child.on("close",code => code === 0 ? resolve() : reject(new Error(stderr.slice(-4000) || `${command} exited ${code}`)));
  });
}
export function safeId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(value)) throw new Error("Invalid job ID");
  return value;
}
export function assertYoutubeUrl(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("A YouTube URL is required");
  const u = new URL(raw);
  const hosts = ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtube-nocookie.com"];
  if (u.protocol !== "https:" || !hosts.includes(u.hostname)) throw new Error("Only HTTPS YouTube URLs are supported");
  return u.toString();
}