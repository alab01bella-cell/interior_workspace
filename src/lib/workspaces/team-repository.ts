import { getDb } from "@/lib/db/client";
import { getServiceDisplayName } from "@/lib/auth/user-repository";

export type TeamMember = { membershipId:string; userId:string; name:string; email:string; role:"OWNER"|"MEMBER"; status:"ACTIVE"|"INACTIVE"|"REMOVED"; joinedAt:string; assignedCount:number };
export type TeamInvitation = { id:string; email:string; status:"PENDING"|"ACCEPTED"|"EXPIRED"|"CANCELLED"; expiresAt:string; createdAt:string };

const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const encoder=new TextEncoder();
const base64Url=(bytes:Uint8Array)=>{let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")};
async function tokenHash(token:string){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(token));return Array.from(new Uint8Array(digest),(byte)=>byte.toString(16).padStart(2,"0")).join("")}

export async function listTeamMembers(workspaceId:string):Promise<TeamMember[]> {
  const rows=await (await getDb()).prepare(`SELECT wm.id AS membership_id,wm.user_id,wm.role,wm.status,wm.joined_at,u.email,u.google_name,u.display_name,
    (SELECT COUNT(*) FROM consultations c WHERE c.workspace_id=wm.workspace_id AND c.assigned_user_id=wm.user_id) AS assigned_count
    FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=? ORDER BY CASE wm.role WHEN 'OWNER' THEN 0 ELSE 1 END,wm.joined_at`).bind(workspaceId).all<{membership_id:string;user_id:string;role:"OWNER"|"MEMBER";status:"ACTIVE"|"INACTIVE"|"REMOVED";joined_at:string;email:string;google_name:string;display_name:string|null;assigned_count:number}>();
  return rows.results.map((row)=>({membershipId:row.membership_id,userId:row.user_id,name:getServiceDisplayName({displayName:row.display_name,googleName:row.google_name,email:row.email}),email:row.email,role:row.role,status:row.status,joinedAt:row.joined_at,assignedCount:Number(row.assigned_count)}));
}

export async function listActiveTeamMembers(workspaceId:string){return (await listTeamMembers(workspaceId)).filter((member)=>member.status==="ACTIVE")}

export async function listTeamInvitations(workspaceId:string):Promise<TeamInvitation[]> {
  const db=await getDb();await db.prepare(`UPDATE workspace_invitations SET status='EXPIRED',updated_at=datetime('now') WHERE workspace_id=? AND status='PENDING' AND expires_at<=datetime('now')`).bind(workspaceId).run();
  const rows=await db.prepare(`SELECT id,email,status,expires_at,created_at FROM workspace_invitations WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all<{id:string;email:string;status:TeamInvitation["status"];expires_at:string;created_at:string}>();
  return rows.results.map((row)=>({id:row.id,email:row.email,status:row.status,expiresAt:row.expires_at,createdAt:row.created_at}));
}

export async function createInvitation(input:{workspaceId:string;email:string;invitedByUserId:string}) {
  const email=normalizeEmail(input.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("invalid_email");
  const db=await getDb();
  const member=await db.prepare(`SELECT 1 AS found FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=? AND wm.status='ACTIVE' AND lower(u.email)=? LIMIT 1`).bind(input.workspaceId,email).first();
  if(member)throw new Error("already_member");
  await db.prepare(`UPDATE workspace_invitations SET status='CANCELLED',updated_at=datetime('now') WHERE workspace_id=? AND lower(email)=? AND status='PENDING'`).bind(input.workspaceId,email).run();
  const token=base64Url(crypto.getRandomValues(new Uint8Array(32))),id=crypto.randomUUID(),hash=await tokenHash(token);
  await db.prepare(`INSERT INTO workspace_invitations(id,workspace_id,email,role,token_hash,invited_by_user_id,status,expires_at) VALUES(?,?,?,'MEMBER',?,?,'PENDING',datetime('now','+7 days'))`).bind(id,input.workspaceId,email,hash,input.invitedByUserId).run();
  return {id,email,token};
}

export async function findInvitationByToken(token:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;const hash=await tokenHash(token);
  return (await getDb()).prepare(`SELECT wi.id,wi.workspace_id,wi.email,wi.status,wi.expires_at,w.name AS workspace_name,CASE WHEN wi.status='PENDING' AND wi.expires_at>datetime('now') THEN 1 ELSE 0 END AS is_available FROM workspace_invitations wi JOIN workspaces w ON w.id=wi.workspace_id AND w.status='ACTIVE' WHERE wi.token_hash=? LIMIT 1`).bind(hash).first<{id:string;workspace_id:string;email:string;status:TeamInvitation["status"];expires_at:string;workspace_name:string;is_available:number}>();
}

export async function acceptInvitation(input:{token:string;userId:string;email:string}) {
  const invitation=await findInvitationByToken(input.token);if(!invitation)return {ok:false,error:"invalid" as const};
  if(invitation.is_available!==1)return {ok:false,error:"expired" as const};
  if(normalizeEmail(invitation.email)!==normalizeEmail(input.email))return {ok:false,error:"email_mismatch" as const};
  const db=await getDb(),membershipId=crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO workspace_members(id,workspace_id,user_id,role,status) VALUES(?,?,?,'MEMBER','ACTIVE') ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=CASE WHEN workspace_members.role='OWNER' THEN 'OWNER' ELSE 'MEMBER' END,status='ACTIVE',updated_at=datetime('now')`).bind(membershipId,invitation.workspace_id,input.userId),
    db.prepare(`UPDATE users SET onboarding_completed=1,updated_at=datetime('now') WHERE id=?`).bind(input.userId),
    db.prepare(`UPDATE workspace_invitations SET status='ACCEPTED',accepted_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND status='PENDING'`).bind(invitation.id),
  ]);
  return {ok:true,workspaceId:invitation.workspace_id};
}

export async function removeMember(input:{workspaceId:string;membershipId:string;actorUserId:string}) {
  const db=await getDb();const member=await db.prepare(`SELECT wm.user_id,wm.role,wm.status FROM workspace_members wm WHERE wm.id=? AND wm.workspace_id=? LIMIT 1`).bind(input.membershipId,input.workspaceId).first<{user_id:string;role:string;status:string}>();
  if(!member)return {ok:false,error:"not_found" as const,count:0};if(member.role==="OWNER")return {ok:false,error:"owner_protected" as const,count:0};if(member.status!=="ACTIVE")return {ok:true,count:0};
  const assigned=await db.prepare(`SELECT c.id,u.display_name,u.google_name,u.email FROM consultations c JOIN users u ON u.id=c.assigned_user_id WHERE c.workspace_id=? AND c.assigned_user_id=?`).bind(input.workspaceId,member.user_id).all<{id:string;display_name:string|null;google_name:string;email:string}>();
  const now=new Date().toISOString(),batch:D1PreparedStatement[]=[];
  for(const row of assigned.results){const name=getServiceDisplayName({displayName:row.display_name,googleName:row.google_name,email:row.email});batch.push(db.prepare(`UPDATE consultations SET assigned_user_id=NULL,updated_at=? WHERE workspace_id=? AND id=?`).bind(now,input.workspaceId,row.id),db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,'ASSIGNEE_CHANGED',?,?,?,?)`).bind(crypto.randomUUID(),input.workspaceId,row.id,JSON.stringify({previous_user_id:member.user_id,new_user_id:null,previous_user_name:name,new_user_name:null}),input.actorUserId,`member-removed:${input.membershipId}:${row.id}`,now));}
  batch.push(db.prepare(`UPDATE workspace_members SET status='REMOVED',updated_at=? WHERE id=? AND workspace_id=? AND role='MEMBER'`).bind(now,input.membershipId,input.workspaceId));await db.batch(batch);
  return {ok:true,count:assigned.results.length};
}
