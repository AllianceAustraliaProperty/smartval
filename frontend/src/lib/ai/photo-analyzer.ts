import { AnalyzePhotoRequest, PhotoAnalysisResult, CoverPhotoAnalysisResult } from "@/types/photo-analysis";
import { analyzeImageWithGemini, analyzeCoverPhotoWithGemini } from "./gemini-client";

export async function analyzePhoto(request: AnalyzePhotoRequest): Promise<PhotoAnalysisResult | CoverPhotoAnalysisResult> {
  if (request.isCover) {
    return await analyzeCoverPhotoWithGemini(request.imageUrl, request.propertyType);
  }
  return await analyzeImageWithGemini(request.imageUrl, request.expectedCategory);
}
