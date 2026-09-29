import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod/v4";

const systemInstruction =
  "You are an expert Agronomist, Plant Pathologist, and Agricultural Economist. " +
  "Provide accurate, practical, safety-conscious advice for farmers. Return only valid JSON matching the requested schema.";

const diseaseOutputSchema = z.object({
  diseaseName: z.string(),
  confidenceScore: z.number().min(0).max(100),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  treatmentPlan: z.string(),
  preventativeMeasures: z.string(),
});

const weatherOutputSchema = z.object({
  alertLevel: z.enum(["NORMAL", "WATCH", "WARNING"]),
  shortTermAction: z.string(),
  longTermAdvice: z.string(),
});

const marketOutputSchema = z.object({
  bestTimeToSell: z.string(),
  estimatedPriceTrend: z.enum(["RISING", "STABLE", "FALLING"]),
  strategyRecommendation: z.string(),
});

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

function parseJson(text: string | undefined): unknown {
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function analyzeCropImage(
  imageData: string,
): Promise<{ result: z.infer<typeof diseaseOutputSchema>; provider: "gemini" | "demo" }> {
  const client = getClient();
  if (!client) {
    return {
      provider: "demo",
      result: {
        diseaseName: "No clear disease pattern detected",
        confidenceScore: 62,
        severity: "LOW",
        treatmentPlan:
          "Isolate the plant from nearby crops, inspect the underside of leaves, and monitor for new spots over the next 48 hours.",
        preventativeMeasures:
          "Water at the soil line, improve airflow between plants, and remove visibly damaged leaves with clean tools.",
      },
    };
  }

  const commaIndex = imageData.indexOf(",");
  const header = commaIndex >= 0 ? imageData.slice(0, commaIndex) : "";
  const data = commaIndex >= 0 ? imageData.slice(commaIndex + 1) : imageData;
  const mimeType = header.match(/^data:([^;]+);base64$/i)?.[1] ?? "image/jpeg";
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: { data, mimeType },
          },
          {
            text: "Analyze this crop or leaf image. Identify visible diseases or pests and give practical next steps. If uncertain, say so clearly.",
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diseaseName: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          treatmentPlan: { type: Type.STRING },
          preventativeMeasures: { type: Type.STRING },
        },
        required: ["diseaseName", "confidenceScore", "severity", "treatmentPlan", "preventativeMeasures"],
      },
    },
  });

  return { provider: "gemini", result: diseaseOutputSchema.parse(parseJson(response.text)) };
}

export async function createWeatherAdvice(
  location: string,
  season: string,
): Promise<{ result: z.infer<typeof weatherOutputSchema>; provider: "gemini" | "demo" }> {
  const client = getClient();
  if (!client) {
    return {
      provider: "demo",
      result: {
        alertLevel: season === "Monsoon" ? "WATCH" : "NORMAL",
        shortTermAction:
          season === "Monsoon"
            ? "Check drainage channels and avoid field work during heavy rain. Inspect low-lying plots after each rainfall."
            : "Check soil moisture at root depth before irrigating and review the next local forecast before spraying.",
        longTermAdvice:
          "Keep a simple field log for rainfall, irrigation, and pest pressure so decisions can be adjusted to your local pattern.",
      },
    };
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Given the location ${location} and season ${season}, provide a proactive farming advisory. Do not claim live weather data; base the guidance on seasonal risk patterns and clearly state any uncertainty.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          alertLevel: { type: Type.STRING, enum: ["NORMAL", "WATCH", "WARNING"] },
          shortTermAction: { type: Type.STRING },
          longTermAdvice: { type: Type.STRING },
        },
        required: ["alertLevel", "shortTermAction", "longTermAdvice"],
      },
    },
  });

  return { provider: "gemini", result: weatherOutputSchema.parse(parseJson(response.text)) };
}

export async function createMarketAdvice(
  cropType: string,
  yieldTons: number,
): Promise<{ result: z.infer<typeof marketOutputSchema>; provider: "gemini" | "demo" }> {
  const client = getClient();
  if (!client) {
    return {
      provider: "demo",
      result: {
        bestTimeToSell: "Stagger sales over the next 3–6 weeks",
        estimatedPriceTrend: "STABLE",
        strategyRecommendation:
          `For ${yieldTons} tons of ${cropType}, avoid selling the full volume on one day. Compare at least two buyers, reserve a portion for a stronger local price, and protect stored grain from moisture.`,
      },
    };
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `For a farmer with ${yieldTons} tons of ${cropType}, provide a conservative selling strategy. You do not have live market quotes, so do not invent prices or claim current market data. Focus on timing, diversification, and buyer comparison.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestTimeToSell: { type: Type.STRING },
          estimatedPriceTrend: { type: Type.STRING, enum: ["RISING", "STABLE", "FALLING"] },
          strategyRecommendation: { type: Type.STRING },
        },
        required: ["bestTimeToSell", "estimatedPriceTrend", "strategyRecommendation"],
      },
    },
  });

  return { provider: "gemini", result: marketOutputSchema.parse(parseJson(response.text)) };
}
