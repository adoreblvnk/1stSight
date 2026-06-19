import { NextResponse } from "next/server";
import { getScenarioState } from "@/lib/scenario";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getScenarioState());
}
