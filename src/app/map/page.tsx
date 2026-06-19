import { MapDashboard } from "@/components/ops-dashboard";
import { getScenarioState } from "@/lib/scenario";

export default function MapPage() {
  return <MapDashboard initialState={getScenarioState()} />;
}
