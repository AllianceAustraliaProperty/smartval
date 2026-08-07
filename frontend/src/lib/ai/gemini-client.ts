import { PhotoAnalysisResult, RoomCategory, ROOM_CATEGORIES_LIST, FLOORING_TYPES_LIST, FEATURE_FIXTURES_LIST, PRIME_COST_ITEMS_LIST, CoverPhotoAnalysisResult } from "@/types/photo-analysis";
import { getSystemInstruction, getCoverPhotoSystemInstruction } from "./prompts";
import { AllMainBuildingTypes } from "@/constants/main-building-types";
import { ROOFING_TYPES } from "@/constants/roofing-types";
import { EXTERNAL_WALLS } from "@/constants/wall-types";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export async function analyzeImageWithGemini(imageUrl: string, expectedCategory?: RoomCategory): Promise<PhotoAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  // 1. Fetch the image and convert it to Base64
  // Ensure the image URL is accessible from your server or proxy it if necessary.
  let base64Image = "";
  let mimeType = "image/jpeg"; // default

  if (imageUrl.startsWith("data:image")) {
    const parts = imageUrl.split(";base64,");
    mimeType = parts[0].replace("data:", "");
    base64Image = parts[1];
  } else {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      mimeType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      console.error("Error fetching image for AI analysis:", err);
      throw new Error("Could not process the image URL.");
    }
  }

  // 2. Define the JSON schema for structured output
  const responseSchema = {
    type: "OBJECT",
    properties: {
      category: { type: "STRING", nullable: true, enum: [...ROOM_CATEGORIES_LIST] },
      flooring: { type: "STRING", nullable: true, enum: [...FLOORING_TYPES_LIST] },
      categorySpecificDetails: {
        type: "OBJECT",
        nullable: true,
        properties: {
          featuresAndFixtures: {
            type: "ARRAY",
            items: { type: "STRING", enum: [...FEATURE_FIXTURES_LIST] },
          },
          primeCostItems: {
            type: "ARRAY",
            items: { type: "STRING", enum: [...PRIME_COST_ITEMS_LIST] },
          }
        }
      }
    }
  };

  const systemInstruction = getSystemInstruction(expectedCategory);

  // 3. Make the API call to Gemini with retry & backoff
  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image
          }
        },
        {
          text: "Analyze this image and return the requested JSON data."
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  const maxRetries = 3;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      data = await response.json();
      break;
    }

    const errorText = await response.text();
    let errorMessage = response.statusText;
    try {
      const parsedError = JSON.parse(errorText);
      if (parsedError.error?.message) {
        errorMessage = parsedError.error.message;
      }
    } catch {}

    // Retry on 429 (Rate Limit / Too Many Requests) or 503 (Service Unavailable)
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      let waitMs = Math.pow(2, attempt) * 2500 + Math.floor(Math.random() * 1000);
      
      if (retryMatch && retryMatch[1]) {
        const parsedSeconds = parseFloat(retryMatch[1]);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0 && parsedSeconds <= 30) {
          waitMs = Math.ceil(parsedSeconds * 1000) + 1000; // wait specified time + 1s buffer
        }
      }

      console.warn(`[Gemini API] Rate limited. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    console.error("Gemini API Error:", errorText);
    if (response.status === 429) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      const cooldownSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 25;
      throw new Error(`Gemini Free Tier quota exceeded (20 requests/min limit). Please wait ~${cooldownSec}s before automating again, or upgrade your API key to Pay-As-You-Go in Google AI Studio.`);
    }
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error("No data returned from Gemini API");
  }

  try {
    const parsedData = JSON.parse(outputText) as PhotoAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", err);
    throw new Error("Invalid JSON returned from Gemini.");
  }
}

export async function analyzeCoverPhotoWithGemini(imageUrl: string, propertyType?: string): Promise<CoverPhotoAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  // 1. Fetch the image and convert it to Base64
  let base64Image = "";
  let mimeType = "image/jpeg";

  if (imageUrl.startsWith("data:image")) {
    const parts = imageUrl.split(";base64,");
    mimeType = parts[0].replace("data:", "");
    base64Image = parts[1];
  } else {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      mimeType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      console.error("Error fetching cover image for AI analysis:", err);
      throw new Error("Could not process the cover image URL.");
    }
  }

  // 2. Define the JSON schema for structured output
  const responseSchema = {
    type: "OBJECT",
    properties: {
      mainBuildingType: {
        type: "STRING",
        nullable: true,
        enum: [...AllMainBuildingTypes]
      },
      roofingType: {
        type: "STRING",
        nullable: true,
        enum: [...ROOFING_TYPES]
      },
      externalWalls: {
        type: "ARRAY",
        nullable: true,
        items: {
          type: "STRING",
          enum: [...EXTERNAL_WALLS]
        }
      }
    }
  };

  const systemInstruction = getCoverPhotoSystemInstruction(propertyType);

  // 3. Make API call to Gemini with retry & backoff
  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image
          }
        },
        {
          text: "Analyze this exterior/cover property photo and determine the main building type, roofing type, and external walls."
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  const maxRetries = 3;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      data = await response.json();
      break;
    }

    const errorText = await response.text();
    let errorMessage = response.statusText;
    try {
      const parsedError = JSON.parse(errorText);
      if (parsedError.error?.message) {
        errorMessage = parsedError.error.message;
      }
    } catch {}

    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      let waitMs = Math.pow(2, attempt) * 2500 + Math.floor(Math.random() * 1000);
      
      if (retryMatch && retryMatch[1]) {
        const parsedSeconds = parseFloat(retryMatch[1]);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0 && parsedSeconds <= 30) {
          waitMs = Math.ceil(parsedSeconds * 1000) + 1000;
        }
      }

      console.warn(`[Gemini API] Rate limited. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    console.error("Gemini API Error:", errorText);
    if (response.status === 429) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      const cooldownSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 25;
      throw new Error(`Gemini Free Tier quota exceeded (20 requests/min limit). Please wait ~${cooldownSec}s before automating again, or upgrade your API key to Pay-As-You-Go in Google AI Studio.`);
    }
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error("No data returned from Gemini API");
  }

  try {
    const parsedData = JSON.parse(outputText) as CoverPhotoAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", err);
    throw new Error("Invalid JSON returned from Gemini.");
  }
}

