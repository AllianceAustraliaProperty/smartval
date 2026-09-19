import { PhotoAnalysisResult, RoomCategory, ROOM_CATEGORIES_LIST, FLOORING_TYPES_LIST, FEATURE_FIXTURES_LIST, PRIME_COST_ITEMS_LIST, CoverPhotoAnalysisResult } from "@/types/photo-analysis";
import { getSystemInstruction, getCoverPhotoSystemInstruction } from "./prompts";
import { AllMainBuildingTypes } from "@/constants/main-building-types";
import { ROOFING_TYPES } from "@/constants/roofing-types";
import { EXTERNAL_WALLS } from "@/constants/wall-types";
import * as dns from "node:dns";

// Force Node.js to use IPv4 first to prevent IPv6 hanging issues on AWS EC2
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "qwen/qwen3.8-27b"
];

function getGroqApiKey(): string {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  throw new Error("GROQ_API_KEY environment variable is missing.");
}

function buildGroqPayload(systemInstruction: string, base64Image: string, mimeType: string, schemaString: string, currentModelName: string) {
  return {
    model: currentModelName,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${systemInstruction}\n\nIMPORTANT: You must return ONLY a JSON object matching this schema exactly:\n${schemaString}\n\nDo not include markdown blocks like \`\`\`json. Return raw JSON.`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };
}

export async function analyzeImageWithGroq(imageUrl: string, expectedCategory?: RoomCategory): Promise<PhotoAnalysisResult> {
  let base64Image = "";
  let mimeType = "image/jpeg";

  if (imageUrl.startsWith("data:image")) {
    const parts = imageUrl.split(";base64,");
    mimeType = parts[0].replace("data:", "");
    base64Image = parts[1];
  } else {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      mimeType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      console.error("Error fetching image for AI analysis:", err);
      throw new Error("Could not process the image URL.");
    }
  }

  const responseSchema = {
    category: `[one of: ${ROOM_CATEGORIES_LIST.join(', ')}]`,
    flooring: `[one of: ${FLOORING_TYPES_LIST.join(', ')}]`,
    categorySpecificDetails: {
      featuresAndFixtures: `[array of: ${FEATURE_FIXTURES_LIST.join(', ')}]`,
      primeCostItems: `[array of: ${PRIME_COST_ITEMS_LIST.join(', ')}]`
    }
  };

  const systemInstruction = getSystemInstruction(expectedCategory);
  
  const maxRetries = 2;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = getGroqApiKey();
    const currentModelName = GROQ_MODELS[attempt % GROQ_MODELS.length];
    const payload = buildGroqPayload(systemInstruction, base64Image, mimeType, JSON.stringify(responseSchema, null, 2), currentModelName);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const errorText = await response.text();
      console.error(`Groq API Error (${response.status}):`, errorText);
      
      if (response.status === 429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      
      if (attempt >= maxRetries) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }
    } catch (fetchErr: any) {
      console.error("Groq fetch failed:", fetchErr);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw new Error(`Groq API connection error: ${fetchErr.message}`);
    }
  }

  const outputText = data?.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("No data returned from Groq API");
  }

  try {
    const parsedData = JSON.parse(outputText) as PhotoAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error("Failed to parse Groq response as JSON:", err);
    throw new Error("Invalid JSON returned from Groq.");
  }
}

export async function analyzeCoverPhotoWithGroq(imageUrl: string, propertyType?: string): Promise<CoverPhotoAnalysisResult> {
  let base64Image = "";
  let mimeType = "image/jpeg";

  if (imageUrl.startsWith("data:image")) {
    const parts = imageUrl.split(";base64,");
    mimeType = parts[0].replace("data:", "");
    base64Image = parts[1];
  } else {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      mimeType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      console.error("Error fetching cover image for AI analysis:", err);
      throw new Error("Could not process the cover image URL.");
    }
  }

  const responseSchema = {
    mainBuildingType: `[one of: ${AllMainBuildingTypes.join(', ')}]`,
    roofingType: `[one of: ${ROOFING_TYPES.join(', ')}]`,
    externalWalls: `[array of: ${EXTERNAL_WALLS.join(', ')}]`
  };

  const systemInstruction = getCoverPhotoSystemInstruction(propertyType);
  const maxRetries = 2;
  let data: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = getGroqApiKey();
    const currentModelName = GROQ_MODELS[attempt % GROQ_MODELS.length];
    const payload = buildGroqPayload(systemInstruction, base64Image, mimeType, JSON.stringify(responseSchema, null, 2), currentModelName);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const errorText = await response.text();
      console.error(`Groq API Error (${response.status}):`, errorText);
      
      if (response.status === 429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      
      if (attempt >= maxRetries) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }
    } catch (fetchErr: any) {
      console.error("Groq fetch failed:", fetchErr);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw new Error(`Groq API connection error: ${fetchErr.message}`);
    }
  }

  const outputText = data?.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("No data returned from Groq API");
  }

  try {
    const parsedData = JSON.parse(outputText) as CoverPhotoAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error("Failed to parse Groq response as JSON:", err);
    throw new Error("Invalid JSON returned from Groq.");
  }
}
