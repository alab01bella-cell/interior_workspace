"use client";
import { useRef,useState } from "react";
import { MAX_BATCH_SIZE,MAX_FILES,validateUploadFile } from "@/lib/consultations/file-policy";
import type { ConsultationFileCategory,UploadFileCategory } from "@/lib/consultations/consultation-file-repository";
type Item={id:string;fileCategory:ConsultationFileCategory;originalFileName:string;fileSize:number};
const rows:[UploadFileCategory,string][]=[["FIELD_PHOTO","현장사진"],["BEFORE","Before"],["AFTER","After"]];
export function ConsultationFilesPanel({consultationId,initialFiles}:{consultationId:string;initialFiles:Item[]}){
 const [files,setFiles]=useState(initialFiles),[status,setStatus]=useState<string>("");const input=useRef<HTMLInputElement>(null),category=useRef<UploadFileCategory>("FIELD_PHOTO");
 const choose=(value:UploadFileCategory)=>{category.current=value;input.current?.click();};
 const upload=async(list:FileList|null)=>{if(!list)return;const values=Array.from(list);if(!values.length)return;if(values.length>MAX_FILES||values.reduce((s,f)=>s+f.size,0)>MAX_BATCH_SIZE){setStatus("한 번에 5개, 총 20MB까지 업로드할 수 있습니다.");return;}for(const file of values){const error=validateUploadFile(file,category.current);if(error){setStatus(error);return;}}setStatus("업로드 중…");const body=new FormData();body.set("category",category.current);body.set("idempotencyKey",crypto.randomUUID());values.forEach(file=>body.append("files",file));try{const response=await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/files`,{method:"POST",body});const data=await response.json() as {files?:Item[];error?:string};if(!response.ok)throw new Error(data.error);setFiles(data.files??files);setStatus("업로드 완료");}catch{setStatus("업로드에 실패했습니다. 다시 시도해주세요.");}finally{if(input.current)input.current.value="";}};
 const count=(value:UploadFileCategory)=>files.filter(file=>file.fileCategory===value).length;
 return <article className="detail-section file-panel"><h2>사진 및 서류</h2><input ref={input} hidden type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.hwp" onChange={event=>void upload(event.target.files)}/>{status&&<p className="file-upload-status" role="status">{status}</p>}
  <div className="file-folder-list">{rows.map(([value,label])=><div className="file-folder-row" key={value}><div><strong>{label}</strong><span>{count(value)}개 파일</span></div><div><button type="button" onClick={()=>choose(value)}>파일 추가</button><a href={`/api/consultations/${consultationId}/folders/${value}/open`} target="_blank">폴더 열기</a></div></div>)}</div>
  <div className="document-list"><h3>서류</h3>{files.filter(file=>file.fileCategory==="DOCUMENT").map(file=><a key={file.id} target="_blank" href={`/api/consultations/${consultationId}/files/${file.id}/open`}>{file.originalFileName}</a>)}{!count("DOCUMENT")&&<p>등록된 서류가 없습니다.</p>}<div><button type="button" onClick={()=>choose("DOCUMENT")}>서류 추가</button><a href={`/api/consultations/${consultationId}/folders/DOCUMENT/open`} target="_blank">서류 폴더 열기</a></div></div>
 </article>;
}
