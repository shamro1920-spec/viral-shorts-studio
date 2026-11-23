import {NextRequest,NextResponse} from "next/server";
import path from "node:path";
import {readFile,writeFile} from "node:fs/promises";
import {TMP,bin,run,safeId} from "@/lib/server";
export const runtime="nodejs"; export const maxDuration=300;
function stamp(t:number){const ms=Math.max(0,Math.round(t*1000));const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000),x=ms%1000;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(x).padStart(3,"0")}`;}
function makeSrt(words:any[],start:number,end:number){
 const selected=words.filter(w=>w.start>=start&&w.end<=end); const lines:string[]=[]; let group:any[]=[];
 for(const w of selected){group.push(w);if(group.length>=5||/[.!?]$/.test(w.word)){lines.push(group.map(x=>x.word).join(" ").trim());group=[];}}
 if(group.length)lines.push(group.map(x=>x.word).join(" ").trim());
 let cursor=0;return lines.map((line,i)=>{const chunk=selected.slice(cursor,cursor+line.split(/\s+/).length);cursor+=chunk.length;
  const a=Math.max(0,(chunk[0]?.start??start)-start),b=Math.max(a+.25,(chunk[chunk.length-1]?.end??end)-start);
  return `${i+1}\n${stamp(a)} --> ${stamp(b)}\n${line}\n`;}).join("\n");
}
function filterPath(p:string){return p.replace(/\\/g,"/").replace(/:/g,"\\:").replace(/'/g,"\\'");}
export async function POST(req:NextRequest){
 try{
  const {jobId:raw,start_time,end_time}=await req.json(); const id=safeId(raw);
  const start=Number(start_time),end=Number(end_time);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>75) throw new Error("Invalid clip range");
  const input=path.join(TMP,`${id}.mp4`), output=path.join(TMP,`${id}-${Math.floor(start)}-${Math.floor(end)}.mp4`);
  const rawTranscript=await readFile(path.join(TMP,`${id}.transcript.json`),"utf8");
  const transcript=JSON.parse(rawTranscript); const srt=makeSrt(transcript.words||[],start,end);
  const subtitle=path.join(TMP,`${id}-${Math.floor(start)}.srt`); await writeFile(subtitle,srt);
  // Center crop baseline. Replace with smoothed face/person tracking coordinates for speaker-aware crop.
  const vf=`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles='${filterPath(subtitle)}':force_style='FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=150',setsar=1`;
  await run(bin("ffmpeg"),["-y","-ss",String(start),"-i",input,"-t",String(end-start),"-vf",vf,
   "-c:v","libx264","-preset","veryfast","-crf","21","-c:a","aac","-b:a","128k","-movflags","+faststart",output]);
  return NextResponse.json({file:output});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Render failed"},{status:500});}
}