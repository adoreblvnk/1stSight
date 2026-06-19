import { LiveDashboard } from "@/components/ops-dashboard";
import { getScenarioState, getSelectedIncidentId } from "@/lib/scenario";

type Props = {
  searchParams: Promise<{ incident?: string }>;
};

export default async function LivePage({ searchParams }: Props) {
  // Next.js searchParams API: https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
  const { incident } = await searchParams;

  return <LiveDashboard initialState={getScenarioState()} initialIncidentId={getSelectedIncidentId(incident)} />;
}
