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

function getGroqApiKeys(): string[] {
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }
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

async function callGroqWithRetry(
  payloadBuilder: (modelName: string) => Record<string, any>,
  options: { timeoutMs?: number } = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 20000;
  const apiKeys = getGroqApiKeys();
  const maxRetries = Math.max(5, apiKeys.length * 2);
  let lastErrorText = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = apiKeys[attempt % apiKeys.length];
    // Decouple model selection from key rotation:
    // Try all keys on primary model first before shifting models if multiple are configured
    const modelIndex = Math.min(Math.floor(attempt / apiKeys.length), GROQ_MODELS.length - 1);
    const currentModelName = GROQ_MODELS[modelIndex];
    const payload = payloadBuilder(currentModelName);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("No content returned from Groq API choices.");
        }
        return content;
      }

      lastErrorText = await response.text();
      console.error(`Groq API Error (${response.status}) using key index ${attempt % apiKeys.length}:`, lastErrorText);

      // Fast-fail on non-recoverable client request errors (e.g. 400 Bad Request, 422 Unprocessable)
      if (response.status === 400 || response.status === 422) {
        throw new Error(`Groq API rejected request (${response.status}): ${lastErrorText}`);
      }

      // 401 Unauthorized / 403 Forbidden: Key is invalid. If other keys exist, try them; otherwise fail fast
      if (response.status === 401 || response.status === 403) {
        if (apiKeys.length > 1 && attempt < apiKeys.length - 1) {
          continue;
        }
        throw new Error(`Groq API authentication failed (${response.status}). Please check your API keys.`);
      }

      // 429 Too Many Requests: Rate limited
      if (response.status === 429 && attempt < maxRetries) {
        // If we have alternative keys to try immediately, switch key without waiting
        if (apiKeys.length > 1 && attempt < apiKeys.length - 1) {
          continue;
        }
        // Otherwise, apply exponential backoff + jitter
        const delayMs = Math.min(10000, 2000 * Math.pow(1.5, attempt) + Math.random() * 1000);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      // 5xx Server Errors: Upstream gateway/server temporary glitch
      if (response.status >= 500 && attempt < maxRetries) {
        const delayMs = 1500 * (attempt + 1) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      if (attempt >= maxRetries) {
        throw new Error(`Groq API error (${response.status}): ${response.statusText}`);
      }
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted")) {
        console.error("Groq request timed out");
      } else {
        console.error("Groq fetch failed:", fetchErr.message || fetchErr);
      }

      // If it's a client rejection error thrown from inside the loop, propagate immediately
      if (fetchErr.message?.startsWith("Groq API rejected request") || fetchErr.message?.startsWith("Groq API authentication failed")) {
        throw fetchErr;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw new Error(`Groq API connection error: ${fetchErr.message || 'unknown network error'}`);
    }
  }

  throw new Error(`Groq API request failed after ${maxRetries} attempts. Last error: ${lastErrorText}`);
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
  const schemaString = JSON.stringify(responseSchema, null, 2);

  const outputText = await callGroqWithRetry((model) =>
    buildGroqPayload(systemInstruction, base64Image, mimeType, schemaString, model)
  );

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
  const schemaString = JSON.stringify(responseSchema, null, 2);

  const outputText = await callGroqWithRetry((model) =>
    buildGroqPayload(systemInstruction, base64Image, mimeType, schemaString, model)
  );

  try {
    const parsedData = JSON.parse(outputText) as CoverPhotoAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error("Failed to parse Groq response as JSON:", err);
    throw new Error("Invalid JSON returned from Groq.");
  }
}

export async function generateTextWithGroq(prompt: string, systemInstruction: string = "You are a helpful AI assistant."): Promise<string> {
  return await callGroqWithRetry((model) => ({
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  }));
}

