import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureStreamSession, getStreamSession, joinStreamBodycam, setStreamAnalysisPaused, updateStreamBodycam } from "@/lib/stream-store";

export const runtime = "nodejs";

const joinSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  position: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

const patchSchema = z.object({
  analysisPaused: z.boolean().optional(),
  bodycamId: z.string().optional(),
  status: z.enum(["connected", "stopped"]).optional(),
});

export async function GET() {
  return NextResponse.json({ session: getStreamSession() });
}

export async function POST(request: Request) {
  const parsed = joinSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a display name before starting bodycam." }, { status: 400 });
  }

  const result = joinStreamBodycam(parsed.data.displayName, parsed.data.position ?? null);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason, session: ensureStreamSession() }, { status: 409 });
  }

  return NextResponse.json({ session: result.session, bodycam: result.bodycam });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stream session update." }, { status: 400 });
  }

  let session = ensureStreamSession();

  if (typeof parsed.data.analysisPaused === "boolean") {
    session = setStreamAnalysisPaused(parsed.data.analysisPaused);
  }

  if (parsed.data.bodycamId && parsed.data.status) {
    const result = updateStreamBodycam(parsed.data.bodycamId, { status: parsed.data.status });
    if (result) session = result.session;
  }

  return NextResponse.json({ session });
}
