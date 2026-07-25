import { PhotoAnalysisResult, RoomCategory, ROOM_CATEGORIES_LIST, FLOORING_TYPES_LIST, FEATURE_FIXTURES_LIST, PRIME_COST_ITEMS_LIST } from "@/types/photo-analysis";
import { getSystemInstruction } from "./prompts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

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

  // 3. Make the API call to Gemini
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Gemini API Error:", errorData);
    throw new Error(`Gemini API returned an error: ${response.statusText}`);
  }

  const data = await response.json();
  const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
