import { NextResponse } from "next/server";
import { z } from "zod";
import { addStreamWebRtcCandidate, getStreamSession, getStreamWebRtcCandidates } from "@/lib/stream-store";

export const runtime = "nodejs";

const sourceSchema = z.enum(["bodycam", "ops"]);

const candidateSchema = z.object({
  bodycamId: z.string().min(1),
  source: sourceSchema,
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }).passthrough(),
});

function findConnectedBodycam(bodycamId: string) {
  return getStreamSession()?.bodycams.find((bodycam) => bodycam.id === bodycamId && bodycam.status === "connected") ?? null;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const bodycamId = searchParams.get("bodycamId") ?? "";
  const source = sourceSchema.safeParse(searchParams.get("source"));
  const afterSeq = Number(searchParams.get("afterSeq") ?? 0);

  if (!source.success || !Number.isFinite(afterSeq)) {
    return NextResponse.json({ error: "WebRTC candidate polling requires source and afterSeq." }, { status: 400 });
  }

  if (!findConnectedBodycam(bodycamId)) {
    return NextResponse.json({ error: "Bodycam stream session was not found." }, { status: 404 });
  }

  return NextResponse.json({ candidates: getStreamWebRtcCandidates(bodycamId, source.data, afterSeq) });
}

export async function POST(request: Request) {
  const parsed = candidateSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "WebRTC candidate requires bodycamId, source, and ICE candidate." }, { status: 400 });
  }

  if (!findConnectedBodycam(parsed.data.bodycamId)) {
    return NextResponse.json({ error: "Bodycam stream session was not found." }, { status: 404 });
  }

  const candidate = addStreamWebRtcCandidate(parsed.data.bodycamId, parsed.data.source, parsed.data.candidate);
  return NextResponse.json({ candidate });
}
