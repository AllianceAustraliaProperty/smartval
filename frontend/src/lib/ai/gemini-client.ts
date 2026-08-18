import { PhotoAnalysisResult, RoomCategory, ROOM_CATEGORIES_LIST, FLOORING_TYPES_LIST, FEATURE_FIXTURES_LIST, PRIME_COST_ITEMS_LIST, CoverPhotoAnalysisResult } from "@/types/photo-analysis";
import { getSystemInstruction, getCoverPhotoSystemInstruction } from "./prompts";
import { AllMainBuildingTypes } from "@/constants/main-building-types";
import { ROOFING_TYPES } from "@/constants/roofing-types";
import { EXTERNAL_WALLS } from "@/constants/wall-types";

const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash",
  "gemini-3.1-flash-lite"
];

const getGeminiApiUrl = (modelName: string) => `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

let currentKeyIndex = 0;
function getGeminiApiKey(): string {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY_1) keys.push(process.env.GEMINI_API_KEY_1);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  
  if (process.env.GEMINI_API_KEYS) {
    const splitKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    keys.push(...splitKeys);
  }

  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY(s) found in environment variables.");
  }

  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

export async function analyzeImageWithGemini(imageUrl: string, expectedCategory?: RoomCategory): Promise<PhotoAnalysisResult> {
  // API key is fetched inside the retry loop to support key rotation on rate limits

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

  const maxRetries = 5;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentApiKey = getGeminiApiKey();
    const currentModelName = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
    const response = await fetch(`${getGeminiApiUrl(currentModelName)}?key=${currentApiKey}`, {
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

    // Retry on 429 (Rate Limit / Too Many Requests) or 500+ (Server Errors / High Demand)
    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      let waitMs = Math.pow(2, attempt) * 2500 + Math.floor(Math.random() * 1000);
      
      if (retryMatch && retryMatch[1]) {
        const parsedSeconds = parseFloat(retryMatch[1]);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0 && parsedSeconds <= 30) {
          waitMs = Math.ceil(parsedSeconds * 1000) + 1000; // wait specified time + 1s buffer
        }
      }

      console.warn(`[Gemini API] Rate limited/High demand. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
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
  // API key is fetched inside the retry loop to support key rotation on rate limits

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

  const maxRetries = 5;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentApiKey = getGeminiApiKey();
    const currentModelName = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
    const response = await fetch(`${getGeminiApiUrl(currentModelName)}?key=${currentApiKey}`, {
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

    // Retry on 429 (Rate Limit / Too Many Requests) or 500+ (Server Errors / High Demand)
    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
      let waitMs = Math.pow(2, attempt) * 2500 + Math.floor(Math.random() * 1000);
      
      if (retryMatch && retryMatch[1]) {
        const parsedSeconds = parseFloat(retryMatch[1]);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0 && parsedSeconds <= 30) {
          waitMs = Math.ceil(parsedSeconds * 1000) + 1000;
        }
      }

      console.warn(`[Gemini API] Rate limited/High demand. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
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

