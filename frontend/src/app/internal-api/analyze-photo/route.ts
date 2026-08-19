import { NextResponse } from "next/server";
import { AnalyzePhotoRequest } from "@/types/photo-analysis";
import { analyzePhoto } from "@/lib/ai/photo-analyzer";
import { requireAuth } from '@/lib/route-auth';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  
  try {
    const body: AnalyzePhotoRequest = await req.json();

    if (!body.imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const result = await analyzePhoto(body);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    console.error("Error in /internal-api/analyze-photo route:", error);
    const message = error.message || "Failed to analyze photo.";
    const isRateLimit = message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests") || message.includes("429");
    const status = isRateLimit ? 429 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

