import type { ContractOutcome,LostReason,QuoteStatus } from "@/types/consultation";

export const quoteStatusLabel:Record<QuoteStatus,string>={NOT_CREATED:"견적 미작성",DRAFT:"임시 저장",SENT:"견적 발송"};
export const contractOutcomeLabel:Record<ContractOutcome,string>={PENDING:"결정 대기",CONTRACTED:"계약",LOST:"불성사"};
export const lostReasonLabel:Record<LostReason,string>={PRICE:"예산 / 가격",SCHEDULE:"일정",COMPETITOR:"타 업체 계약",SCOPE_MISMATCH:"공사 범위 불일치",CUSTOMER_PLAN_CHANGED:"고객 계획 변경",NO_RESPONSE:"연락 두절",ON_HOLD:"상담 후 보류",OTHER:"기타"};
export const formatWon=(amount:number|null)=>amount===null?"-":`${amount.toLocaleString("ko-KR")}원`;
export const formatManWon=(amount:number|null)=>amount===null?"-":`${Math.round(amount/10000).toLocaleString("ko-KR")}만원`;
