import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ChecklistReview } from "@/lib/consultations/checklist-review-repository";

const A4:[number,number]=[595.28,841.89],MARGIN=48;
type SessionField={questionKey:string;label:string;answer:string};

function wrap(text:string,maxWidth:number,size:number,font:PDFFont):string[]{const output:string[]=[];for(const paragraph of text.replace(/\r/g,"").split("\n")){if(!paragraph){output.push(" ");continue}let line="";for(const grapheme of Array.from(paragraph)){const next=line+grapheme;if(line&&font.widthOfTextAtSize(next,size)>maxWidth){output.push(line);line=grapheme}else line=next}if(line)output.push(line)}return output.length?output:[" "]}
async function loadFont():Promise<ArrayBuffer>{let response:Response|undefined;try{const {env}=await getCloudflareContext({async:true});if(env.ASSETS)response=await env.ASSETS.fetch(new Request("https://assets.local/fonts/NotoSansKR-Regular.ttf"))}catch{/* local fallback */}if(!response?.ok){const base=(process.env.AUTH_URL??"http://localhost:3000").replace(/\/$/,"");response=await fetch(`${base}/fonts/NotoSansKR-Regular.ttf`,{cache:"force-cache",signal:AbortSignal.timeout(15_000)})}if(!response.ok)throw new Error("pdf_font_unavailable");return response.arrayBuffer()}

export async function createConsultationSessionPdf(input:{customerName:string;consultedAt:Date;operatorName:string;fields:SessionField[];reviews:ChecklistReview[];summary:string}):Promise<Uint8Array>{
  const document=await PDFDocument.create();document.registerFontkit(fontkit);const font=await document.embedFont(await loadFont(),{subset:false});let page=document.addPage(A4),y=A4[1]-MARGIN;
  const addPage=()=>{page=document.addPage(A4);y=A4[1]-MARGIN};const ensure=(height:number)=>{if(y-height<MARGIN+18)addPage()};
  const line=(text:string,size=10,color=rgb(.12,.12,.14),gap=size*1.55,x=MARGIN)=>{for(const value of wrap(text,A4[0]-MARGIN-x,size,font)){ensure(gap);page.drawText(value,{x,y,size,font,color});y-=gap}};
  const reviewMap=new Map(input.reviews.map((review)=>[review.questionKey,review]));
  line("상담 기록",24,rgb(.08,.08,.1),34);line(`고객명: ${input.customerName}`);line(`상담일: ${input.consultedAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}`);line(`담당자: ${input.operatorName}`);y-=18;
  input.fields.forEach((field,index)=>{const review=reviewMap.get(field.questionKey),state=review?.isConfirmed?"확인완료":review?.isChecked?"체크":"미체크";ensure(75);line(`${String(index+1).padStart(2,"0")}. ${field.label}`,12,rgb(.16,.16,.18),19);line(`확인 상태: ${state}`,8,rgb(.48,.38,.26),14);line(`고객 답변: ${field.answer}`,9,rgb(.25,.26,.28),15);if(review?.consultationNote.trim())line(`상담 메모: ${review.consultationNote.trim()}`,9,rgb(.08,.08,.1),15);y-=11});
  ensure(90);line("최종 상담 요약",14,rgb(.16,.16,.18),23);line(input.summary||"추가 상담 메모 없음",10,rgb(.1,.1,.12),16);
  const pages=document.getPages();pages.forEach((item,index)=>{const label=`${index+1} / ${pages.length}`;item.drawText(label,{x:(A4[0]-font.widthOfTextAtSize(label,8))/2,y:24,size:8,font,color:rgb(.5,.5,.52)})});
  document.setTitle(`상담 기록_${input.customerName}`);document.setSubject("대면 상담 진행 기록");document.setCreationDate(input.consultedAt);return document.save({useObjectStreams:true});
}
