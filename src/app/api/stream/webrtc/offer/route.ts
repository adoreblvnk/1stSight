import { NextResponse } from "next/server";
import { z } from "zod";
import { getStreamSession, getStreamWebRtcSignal, setStreamWebRtcOffer } from "@/lib/stream-store";

export const runtime = "nodejs";

const offerSchema = z.object({
  bodycamId: z.string().min(1),
  offer: z.object({
    type: z.literal("offer"),
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

  return NextResponse.json({ offer: getStreamWebRtcSignal(bodycamId)?.offer ?? null });
}

export async function POST(request: Request) {
  const parsed = offerSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "WebRTC offer requires bodycamId and offer SDP." }, { status: 400 });
  }

  if (!findConnectedBodycam(parsed.data.bodycamId)) {
    return NextResponse.json({ error: "Bodycam stream session was not found." }, { status: 404 });
  }

  setStreamWebRtcOffer(parsed.data.bodycamId, parsed.data.offer);
  return NextResponse.json({ ok: true });
}
