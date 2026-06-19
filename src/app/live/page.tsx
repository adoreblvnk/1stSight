import { LiveDashboard } from "@/components/ops-dashboard";
import { getScenarioState } from "@/lib/scenario";

export default function LivePage() {
  return <LiveDashboard initialState={getScenarioState()} />;
}
