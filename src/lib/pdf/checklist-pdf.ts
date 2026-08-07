import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import type { ConsultationRecord } from "@/lib/consultations/consultation-repository";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const A4:[number,number]=[595.28,841.89];
const MARGIN=48;

function answerText(value:unknown):string {
  if(Array.isArray(value)) return value.length?value.join(" / "):"미작성";
  if(typeof value==="boolean") return value?"동의":"미동의";
  const text=String(value??"").trim();return text||"미작성";
}

function fontFor(character:string,korean:PDFFont,latin:PDFFont):PDFFont {
  return /[\u1100-\u11ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7af]/u.test(character)?korean:latin;
}

function textWidth(text:string,size:number,korean:PDFFont,latin:PDFFont):number {
  return Array.from(text).reduce((width,char)=>width+fontFor(char,korean,latin).widthOfTextAtSize(char,size),0);
}

function wrap(text:string,maxWidth:number,size:number,korean:PDFFont,latin:PDFFont):string[]{
  const lines:string[]=[];let line="";
  for(const char of Array.from(text.replace(/\r/g,""))){
    if(char==="\n"){lines.push(line||" ");line="";continue;}
    if(line&&textWidth(line+char,size,korean,latin)>maxWidth){lines.push(line.trimEnd());line=char.trimStart();}else line+=char;
  }
  if(line||!lines.length)lines.push(line||" ");return lines;
}

function drawMixed(page:PDFPage,text:string,x:number,y:number,size:number,color:ReturnType<typeof rgb>,korean:PDFFont,latin:PDFFont){
  let cursor=x;let run="";let current:PDFFont|null=null;
  const flush=()=>{if(!run||!current)return;page.drawText(run,{x:cursor,y,size,font:current,color});cursor+=current.widthOfTextAtSize(run,size);run="";};
  for(const char of Array.from(text)){const next=fontFor(char,korean,latin);if(current&&next!==current)flush();current=next;run+=char;}flush();
}

async function loadFont(path:string):Promise<ArrayBuffer>{
  let response:Response|undefined;
  try { const {env}=await getCloudflareContext({async:true}); if(env.ASSETS)response=await env.ASSETS.fetch(new Request(`https://assets.local${path}`)); } catch { /* Local Next runtime uses the public URL fallback. */ }
  if(!response?.ok){const base=(process.env.AUTH_URL??"http://localhost:3000").replace(/\/$/,"");response=await fetch(`${base}${path}`,{cache:"force-cache",signal:AbortSignal.timeout(15_000)});}
  if(!response.ok)throw new Error("pdf_font_unavailable");return response.arrayBuffer();
}

export async function createChecklistPdf(record:ConsultationRecord,workspaceName:string):Promise<Uint8Array>{
  const [koreanBytes,latinBytes]=await Promise.all([loadFont("/fonts/noto-sans-kr-korean-400-normal.woff2"),loadFont("/fonts/noto-sans-kr-latin-400-normal.woff2")]);
  const document=await PDFDocument.create();document.registerFontkit(fontkit);
  const korean=await document.embedFont(koreanBytes,{subset:true});const latin=await document.embedFont(latinBytes,{subset:true});
  let page=document.addPage(A4);let y=A4[1]-MARGIN;
  const addPage=()=>{page=document.addPage(A4);y=A4[1]-MARGIN;};
  const ensure=(height:number)=>{if(y-height<MARGIN+18)addPage();};
  const line=(text:string,size:number,color=rgb(.12,.12,.14),gap=size*1.55)=>{for(const wrapped of wrap(text,A4[0]-MARGIN*2,size,korean,latin)){ensure(gap);drawMixed(page,wrapped,MARGIN,y,size,color,korean,latin);y-=gap;}};

  line("상담 체크리스트",24,rgb(.08,.08,.1),34);y-=5;
  line(`상담 업체: ${workspaceName}`,10,rgb(.28,.29,.32),16);
  line(`고객명: ${record.clientName}`,10,rgb(.28,.29,.32),16);
  line(`접수일: ${new Date(record.submittedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}`,10,rgb(.28,.29,.32),16);
  line(`상담 ID: ${record.id}`,8,rgb(.48,.49,.52),14);
  line(`양식 버전: ${record.formVersion}`,8,rgb(.48,.49,.52),14);y-=20;

  checklistAnswerSections.forEach((section,index)=>{
    ensure(70);line(`${String(index+1).padStart(2,"0")}. ${section.title}`,16,rgb(.12,.12,.14),25);y-=8;
    for(const field of section.fields){
      const questionLines=wrap(field.label,A4[0]-MARGIN*2,10,korean,latin);
      const answerLines=wrap(`답변: ${answerText(record.answers[field.name])}`,A4[0]-MARGIN*2-12,10,korean,latin);
      ensure(questionLines.length*15+answerLines.length*16+22);
      for(const value of questionLines){drawMixed(page,value,MARGIN,y,10,rgb(.34,.35,.38),korean,latin);y-=15;}
      for(const value of answerLines){drawMixed(page,value,MARGIN+12,y,10,rgb(.08,.08,.1),korean,latin);y-=16;}
      y-=11;
    }
    y-=10;
  });

  const pages=document.getPages();pages.forEach((item,index)=>{const label=`${index+1} / ${pages.length}`;drawMixed(item,label,(A4[0]-textWidth(label,8,korean,latin))/2,24,8,rgb(.5,.5,.52),korean,latin);});
  document.setTitle("상담 체크리스트 원본");document.setSubject("고객 상담 제출 원본");document.setCreationDate(new Date(record.submittedAt));
  return document.save({useObjectStreams:true});
}
