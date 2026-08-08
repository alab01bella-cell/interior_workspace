import { listConsultations } from "./consultation-repository";
import { listConsultationFiles } from "./consultation-file-repository";

export async function getFilePageData(workspaceId:string,requested?:string){
  const consultations=await listConsultations(workspaceId);
  const selected=consultations.find(item=>item.id===requested)??consultations[0]??null;
  const choices=consultations.map(item=>({id:item.id,label:`${item.clientName} · ${item.region} · ${item.area}`,customerName:item.clientName,region:item.region,area:item.area}));
  const records=selected?await listConsultationFiles(workspaceId,selected.id):[];
  return {
    consultationId:selected?.id??null,
    selectedCustomer:selected?{customerName:selected.clientName,region:selected.region,area:selected.area}:null,
    choices,
    initialFiles:records.map(({id,fileCategory,originalFileName,mimeType,fileSize,createdAt,driveFileId})=>({id,fileCategory,originalFileName,mimeType,fileSize,createdAt,driveFileId})),
  };
}
