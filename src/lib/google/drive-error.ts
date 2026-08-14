export type DriveErrorKind="REAUTH_REQUIRED"|"TEMPORARY_ERROR"|"CONFIG_ERROR"|"PERMISSION_ERROR"|"FILE_NOT_FOUND";

export class DriveError extends Error{
  constructor(public readonly kind:DriveErrorKind,message:string){super(message);this.name="DriveError";}
}

export function driveErrorKind(error:unknown):DriveErrorKind{
  if(error instanceof DriveError)return error.kind;
  const message=error instanceof Error?error.message:"";
  if(["drive_encryption_not_configured","drive_token_decryption_failed"].includes(message))return "CONFIG_ERROR";
  if(message==="google_permission_required")return "PERMISSION_ERROR";
  if(message.includes("not_found"))return "FILE_NOT_FOUND";
  return "TEMPORARY_ERROR";
}

export function driveErrorStatus(kind:DriveErrorKind){
  if(kind==="REAUTH_REQUIRED"||kind==="PERMISSION_ERROR")return 409;
  if(kind==="FILE_NOT_FOUND")return 404;
  if(kind==="CONFIG_ERROR")return 503;
  return 502;
}

export function driveApiError(status:number,message:string):DriveError{
  if(status===403)return new DriveError("PERMISSION_ERROR",message);
  if(status===404)return new DriveError("FILE_NOT_FOUND",message);
  if(status===408||status===429||status>=500)return new DriveError("TEMPORARY_ERROR",message);
  return new DriveError("TEMPORARY_ERROR",message);
}
