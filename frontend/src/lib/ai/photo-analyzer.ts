import { AnalyzePhotoRequest, PhotoAnalysisResult, CoverPhotoAnalysisResult } from "@/types/photo-analysis";
import { analyzeImageWithGroq, analyzeCoverPhotoWithGroq } from "./groq-client";

export async function analyzePhoto(request: AnalyzePhotoRequest): Promise<PhotoAnalysisResult | CoverPhotoAnalysisResult> {
  if (request.isCover) {
    return await analyzeCoverPhotoWithGroq(request.imageUrl, request.propertyType);
  }
  return await analyzeImageWithGroq(request.imageUrl, request.expectedCategory);
}
