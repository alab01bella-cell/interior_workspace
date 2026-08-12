export function publicConsultationUrl(path:string,origin?:string):string{
  if(!path.startsWith("/c/"))throw new Error("invalid_consultation_path");
  const base=(origin??(typeof window!=="undefined"?window.location.origin:"")).replace(/\/$/,"");
  return base?`${base}${path}`:path;
}
