import { NextResponse } from "next/server";
import { z } from "zod";
import { getStreamSession, updateStreamBodycam } from "@/lib/stream-store";

export const runtime = "nodejs";

const frameSchema = z.object({
  bodycamId: z.string().min(1),
  imageUrl: z.string().startsWith("data:image/"),
  capturedAt: z.string().min(1),
});

function findConnectedBodycam(bodycamId: string) {
  return getStreamSession()?.bodycams.find((item) => item.id === bodycamId && item.status === "connected") ?? null;
}

export async function GET(request: Request) {
  const bodycamId = new URL(request.url).searchParams.get("bodycamId") ?? "";
  const bodycam = findConnectedBodycam(bodycamId);

  if (!bodycam) {
    return NextResponse.json({ error: "Bodycam stream session was not found. Start bodycam again." }, { status: 404 });
  }

  return NextResponse.json({ frame: bodycam.liveRelayFrame ?? null, capturedAt: bodycam.liveRelayFrame?.capturedAt ?? null });
}

export async function POST(request: Request) {
  const parsed = frameSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Live visual relay requires bodycamId and a camera frame." }, { status: 400 });
  }

  const bodycam = findConnectedBodycam(parsed.data.bodycamId);

  if (!bodycam) {
    return NextResponse.json({ error: "Bodycam stream session was not found. Start bodycam again." }, { status: 404 });
  }

  const result = updateStreamBodycam(bodycam.id, {
    liveRelayFrame: {
      imageUrl: parsed.data.imageUrl,
      capturedAt: parsed.data.capturedAt,
    },
  });

  return NextResponse.json({ bodycam: result?.bodycam ?? bodycam, frame: result?.bodycam.liveRelayFrame ?? bodycam.liveRelayFrame ?? null });
}
