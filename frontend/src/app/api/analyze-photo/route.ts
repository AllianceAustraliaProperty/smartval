import { NextResponse } from "next/server";
import { AnalyzePhotoRequest } from "@/types/photo-analysis";
import { analyzePhoto } from "@/lib/ai/photo-analyzer";

export async function POST(req: Request) {
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
    console.error("Error in /api/analyze-photo route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze photo." },
      { status: 500 }
    );
  }
}
