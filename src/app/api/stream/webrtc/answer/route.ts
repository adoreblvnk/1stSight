import { NextResponse } from "next/server";
import { z } from "zod";
import { getStreamSession, getStreamWebRtcSignal, setStreamWebRtcAnswer } from "@/lib/stream-store";

export const runtime = "nodejs";

const answerSchema = z.object({
  bodycamId: z.string().min(1),
  answer: z.object({
    type: z.literal("answer"),
    sdp: z.string().min(1),
  }),
});

function findConnectedBodycam(bodycamId: string) {
  return getStreamSession()?.bodycams.find((bodycam) => bodycam.id === bodycamId && bodycam.status === "connected") ?? null;
}

export async function GET(request: Request) {
  const bodycamId = new URL(request.url).searchParams.get("bodycamId") ?? "";

  if (!findConnectedBodycam(bodycamId)) {
    return NextResponse.json({ error: "Bodycam stream session was not found." }, { status: 404 });
  }

  return NextResponse.json({ answer: getStreamWebRtcSignal(bodycamId)?.answer ?? null });
}

export async function POST(request: Request) {
  const parsed = answerSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "WebRTC answer requires bodycamId and answer SDP." }, { status: 400 });
  }

  if (!findConnectedBodycam(parsed.data.bodycamId)) {
    return NextResponse.json({ error: "Bodycam stream session was not found." }, { status: 404 });
  }

  setStreamWebRtcAnswer(parsed.data.bodycamId, parsed.data.answer);
  return NextResponse.json({ ok: true });
}
