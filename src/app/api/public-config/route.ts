import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
  return NextResponse.json(
    {
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_BROWSER_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
