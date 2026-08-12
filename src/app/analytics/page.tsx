import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { getAnalyticsData,type AnalyticsPeriod } from "@/lib/analytics/analytics-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

const periods=new Set<AnalyticsPeriod>(["this-month","last-month","three-months","this-year"]);
export default async function AnalyticsRoute({searchParams}:{searchParams:Promise<{period?:string}>}){const context=await requireWorkspace();if(context.membership.role!=="OWNER")notFound();const requested=(await searchParams).period,period:AnalyticsPeriod=requested&&periods.has(requested as AnalyticsPeriod)?requested as AnalyticsPeriod:"this-month";return <AppShell identity={toWorkspaceIdentity(context)}><AnalyticsPage data={await getAnalyticsData(context.workspace.id,period)} period={period}/></AppShell>}
