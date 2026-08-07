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

function wrap(text:string,maxWidth:number,size:number,font:PDFFont):string[]{
  const output:string[]=[];
  for(const paragraph of text.replace(/\r/g,"").split("\n")){
    if(!paragraph){output.push(" ");continue;}
    let line="";
    for(const token of paragraph.split(/(\s+)/).filter(Boolean)){
      const candidate=line+token;
      if(font.widthOfTextAtSize(candidate,size)<=maxWidth){line=candidate;continue;}
      if(line.trim())output.push(line.trimEnd());line="";
      if(font.widthOfTextAtSize(token,size)<=maxWidth){line=token.trimStart();continue;}
      for(const grapheme of Array.from(token)){const next=line+grapheme;if(line&&font.widthOfTextAtSize(next,size)>maxWidth){output.push(line);line=grapheme;}else line=next;}
    }
    if(line.trim())output.push(line.trimEnd());
  }
  return output.length?output:[" "];
}

function drawLine(page:PDFPage,text:string,x:number,y:number,size:number,color:ReturnType<typeof rgb>,font:PDFFont){page.drawText(text,{x,y,size,font,color});}

async function loadFont(path:string):Promise<ArrayBuffer>{
  let response:Response|undefined;
  try { const {env}=await getCloudflareContext({async:true}); if(env.ASSETS)response=await env.ASSETS.fetch(new Request(`https://assets.local${path}`)); } catch { /* Local Next runtime uses the public URL fallback. */ }
  if(!response?.ok){const base=(process.env.AUTH_URL??"http://localhost:3000").replace(/\/$/,"");response=await fetch(`${base}${path}`,{cache:"force-cache",signal:AbortSignal.timeout(15_000)});}
  if(!response.ok)throw new Error("pdf_font_unavailable");return response.arrayBuffer();
}

export async function createChecklistPdf(record:ConsultationRecord,workspaceName:string):Promise<Uint8Array>{
  if(!record.answers||Object.keys(record.answers).length===0)throw new Error("pdf_payload_empty");
  const koreanBytes=await loadFont("/fonts/NotoSansKR-Regular.ttf");
  const document=await PDFDocument.create();document.registerFontkit(fontkit);
  const korean=await document.embedFont(koreanBytes,{subset:false});let drawnLines=0;
  let page=document.addPage(A4);let y=A4[1]-MARGIN;
  const addPage=()=>{page=document.addPage(A4);y=A4[1]-MARGIN;};
  const ensure=(height:number)=>{if(y-height<MARGIN+18)addPage();};
  const line=(text:string,size:number,color=rgb(.12,.12,.14),gap=size*1.55,x=MARGIN)=>{for(const wrapped of wrap(text,A4[0]-MARGIN-x,size,korean)){ensure(gap);drawLine(page,wrapped,x,y,size,color,korean);drawnLines+=1;y-=gap;}};

  line("상담 체크리스트",24,rgb(.08,.08,.1),34);y-=5;
  line(`상담 업체: ${workspaceName}`,10,rgb(.28,.29,.32),16);
  line(`고객명: ${record.clientName}`,10,rgb(.28,.29,.32),16);
  line(`접수일: ${new Date(record.submittedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}`,10,rgb(.28,.29,.32),16);
  line(`상담 ID: ${record.id}`,8,rgb(.48,.49,.52),14);
  line(`양식 버전: ${record.formVersion}`,8,rgb(.48,.49,.52),14);y-=20;

  checklistAnswerSections.forEach((section,index)=>{
    ensure(70);line(`${String(index+1).padStart(2,"0")}. ${section.title}`,16,rgb(.12,.12,.14),25);y-=8;
    for(const field of section.fields){
      const questionLines=wrap(field.label,A4[0]-MARGIN*2,10,korean),answerLines=wrap(answerText(record.answers[field.name]),A4[0]-MARGIN*2,10,korean);
      ensure(questionLines.length*14+Math.min(answerLines.length,2)*15+14);
      for(const value of questionLines){drawLine(page,value,MARGIN,y,10,rgb(.30,.31,.34),korean);drawnLines+=1;y-=14;}
      y-=3;
      for(const value of answerLines){ensure(15);drawLine(page,value,MARGIN,y,10,rgb(.06,.06,.08),korean);drawnLines+=1;y-=15;}
      y-=12;
    }
    y-=10;
  });

  const pages=document.getPages();pages.forEach((item,index)=>{const label=`${index+1} / ${pages.length}`;drawLine(item,label,(A4[0]-korean.widthOfTextAtSize(label,8))/2,24,8,rgb(.5,.5,.52),korean);});
  document.setTitle("상담 체크리스트 원본");document.setSubject("고객 상담 제출 원본");document.setCreationDate(new Date(record.submittedAt));
  if(drawnLines<checklistAnswerSections.length*2)throw new Error("pdf_content_empty");
  const bytes=await document.save({useObjectStreams:true});const signature=new TextDecoder().decode(bytes.slice(0,5));
  if(bytes.byteLength<10_000||signature!=="%PDF-")throw new Error("pdf_bytes_invalid");
  const verified=await PDFDocument.load(bytes);if(verified.getPageCount()<1)throw new Error("pdf_pages_invalid");return bytes;
}
