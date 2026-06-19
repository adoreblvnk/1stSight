import { ReviewDashboard } from "@/components/ops-dashboard";
import { getScenarioState } from "@/lib/scenario";

export default function ReviewPage() {
  return <ReviewDashboard initialState={getScenarioState()} />;
}
