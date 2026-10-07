import { NextResponse } from "next/server";
import { generateTextWithGroq } from "@/lib/ai/groq-client";
import { requireAuth } from '@/lib/route-auth';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  
  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const result = await generateTextWithGroq(body.prompt, body.systemInstruction);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    console.error("Error in /internal-api/generate-text route:", error);
    const message = error.message || "Failed to generate text.";
    const isRateLimit = message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests") || message.includes("429");
    const status = isRateLimit ? 429 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
