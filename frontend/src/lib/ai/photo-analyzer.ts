import { AnalyzePhotoRequest, PhotoAnalysisResult } from "@/types/photo-analysis";
import { analyzeImageWithGemini } from "./gemini-client";

export async function analyzePhoto(request: AnalyzePhotoRequest): Promise<PhotoAnalysisResult> {
  // If you later want to swap to OpenAI, Anthropic, or another provider,
  // you can easily do that here by wrapping a different client.
  
  return await analyzeImageWithGemini(request.imageUrl, request.expectedCategory);
}
