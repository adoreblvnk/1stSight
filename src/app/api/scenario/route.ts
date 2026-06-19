import { NextResponse } from "next/server";
import { getScenarioState } from "@/lib/scenario";

export function GET() {
  return NextResponse.json(getScenarioState());
}
