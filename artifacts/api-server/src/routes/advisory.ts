import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, cropDiagnosticsTable, marketInsightsTable, usersTable, weatherAdvisoriesTable } from "@workspace/db";
import {
  AnalyzeDiseaseBody,
  AnalyzeDiseaseResponse,
  CreateMarketInsightBody,
  CreateMarketInsightResponse,
  CreateWeatherAdvisoryBody,
  CreateWeatherAdvisoryResponse,
  GetDashboardParams,
  GetDashboardResponse,
} from "@workspace/api-zod";
import { analyzeCropImage, createMarketAdvice, createWeatherAdvice } from "../lib/advisory-ai";

const router: IRouter = Router();
const DEMO_USER_ID = "demo-farmer";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function base64Bytes(value: string): number {
  const commaIndex = value.indexOf(",");
  const encoded = commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  return Math.floor((encoded.replace(/[^A-Za-z0-9+/=]/g, "").length * 3) / 4);
}

async function ensureDemoUser(userId: string): Promise<void> {
  await db.insert(usersTable).values({ id: userId, farmerName: "Demo Farmer" }).onConflictDoNothing();
}

async function seedDashboard(userId: string): Promise<void> {
  await ensureDemoUser(userId);
  const [disease] = await db.select({ id: cropDiagnosticsTable.id }).from(cropDiagnosticsTable).where(eq(cropDiagnosticsTable.userId, userId)).limit(1);
  if (!disease) {
    await db.insert(cropDiagnosticsTable).values({
      id: randomUUID(),
      userId,
      imageName: "tomato-leaf.jpg",
      diseaseName: "No clear disease pattern detected",
      confidenceScore: 86,
      severity: "LOW",
      treatmentPlan: "Continue monitoring new growth and inspect the underside of leaves twice this week.",
      preventativeMeasures: "Keep foliage dry overnight and maintain airflow between plants.",
      provider: "demo",
    });
  }
  const [weather] = await db.select({ id: weatherAdvisoriesTable.id }).from(weatherAdvisoriesTable).where(eq(weatherAdvisoriesTable.userId, userId)).limit(1);
  if (!weather) {
    await db.insert(weatherAdvisoriesTable).values({
      id: randomUUID(),
      userId,
      location: "Nashik, Maharashtra",
      season: "Monsoon",
      alertLevel: "WATCH",
      shortTermAction: "Inspect drainage after the next rainfall and avoid spraying before a wet spell.",
      longTermAdvice: "Keep a rainfall log and prioritize disease-resistant varieties for the next cycle.",
      provider: "demo",
    });
  }
  const [market] = await db.select({ id: marketInsightsTable.id }).from(marketInsightsTable).where(eq(marketInsightsTable.userId, userId)).limit(1);
  if (!market) {
    await db.insert(marketInsightsTable).values({
      id: randomUUID(),
      userId,
      cropType: "Wheat",
      yieldTons: 18,
      bestTimeToSell: "Stagger sales over the next 3–6 weeks",
      estimatedPriceTrend: "STABLE",
      strategyRecommendation: "Compare two buyers and avoid selling the entire harvest on one day.",
      provider: "demo",
    });
  }
}

router.get("/dashboard/:userId", async (req, res): Promise<void> => {
  const params = GetDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = stripHtml(params.data.userId);
  try {
    await seedDashboard(userId);
    const [diseases, weather, market] = await Promise.all([
      db.select().from(cropDiagnosticsTable).where(eq(cropDiagnosticsTable.userId, userId)).orderBy(desc(cropDiagnosticsTable.createdAt)).limit(5),
      db.select().from(weatherAdvisoriesTable).where(eq(weatherAdvisoriesTable.userId, userId)).orderBy(desc(weatherAdvisoriesTable.createdAt)).limit(5),
      db.select().from(marketInsightsTable).where(eq(marketInsightsTable.userId, userId)).orderBy(desc(marketInsightsTable.createdAt)).limit(5),
    ]);

    const latestDisease = diseases[0] ?? null;
    const latestWeather = weather[0] ?? null;
    const latestMarket = market[0] ?? null;
    const recentActivity = [
      ...diseases.map((entry) => ({
        id: entry.id,
        type: "disease" as const,
        title: entry.diseaseName,
        detail: `${entry.confidenceScore}% confidence · ${entry.imageName ?? "Crop scan"}`,
        status: entry.severity,
        createdAt: entry.createdAt,
      })),
      ...weather.map((entry) => ({
        id: entry.id,
        type: "weather" as const,
        title: `${entry.location} advisory`,
        detail: `${entry.season} · ${entry.shortTermAction}`,
        status: entry.alertLevel,
        createdAt: entry.createdAt,
      })),
      ...market.map((entry) => ({
        id: entry.id,
        type: "market" as const,
        title: `${entry.cropType} market timing`,
        detail: `${entry.yieldTons} tons · ${entry.bestTimeToSell}`,
        status: entry.estimatedPriceTrend,
        createdAt: entry.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);

    res.json(GetDashboardResponse.parse({
      userId,
      stats: {
        totalAnalyses: diseases.length + weather.length + market.length,
        healthyScans: diseases.filter((entry) => entry.severity === "LOW").length,
        activeAlerts: weather.filter((entry) => entry.alertLevel !== "NORMAL").length,
        marketSignals: market.length,
      },
      recentActivity,
      latestDisease,
      latestWeather,
      latestMarket,
    }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load dashboard");
    res.status(500).json({ error: "Unable to load dashboard data" });
  }
});

router.post("/analyze-disease", async (req, res): Promise<void> => {
  const parsed = AnalyzeDiseaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(parsed.data.imageData) || base64Bytes(parsed.data.imageData) > 5 * 1024 * 1024) {
    res.status(400).json({ error: "Upload a JPG, PNG, or WEBP image up to 5MB." });
    return;
  }

  try {
    const userId = stripHtml(parsed.data.userId);
    await ensureDemoUser(userId);
    const analysis = await analyzeCropImage(parsed.data.imageData);
    const [saved] = await db.insert(cropDiagnosticsTable).values({
      id: randomUUID(),
      userId,
      imageName: parsed.data.imageName ? stripHtml(parsed.data.imageName) : null,
      ...analysis.result,
      confidenceScore: analysis.result.confidenceScore,
      provider: analysis.provider,
    }).returning();
    res.json(AnalyzeDiseaseResponse.parse(saved));
  } catch (error) {
    req.log.error({ err: error }, "Disease analysis failed");
    res.status(502).json({ error: "Crop analysis is temporarily unavailable. Please try again." });
  }
});

router.post("/weather-advisory", async (req, res): Promise<void> => {
  const parsed = CreateWeatherAdvisoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const userId = stripHtml(parsed.data.userId);
    const location = stripHtml(parsed.data.location);
    await ensureDemoUser(userId);
    const advisory = await createWeatherAdvice(location, parsed.data.season);
    const [saved] = await db.insert(weatherAdvisoriesTable).values({
      id: randomUUID(),
      userId,
      location,
      season: parsed.data.season,
      ...advisory.result,
      provider: advisory.provider,
    }).returning();
    res.json(CreateWeatherAdvisoryResponse.parse(saved));
  } catch (error) {
    req.log.error({ err: error }, "Weather advisory failed");
    res.status(502).json({ error: "Weather advisory is temporarily unavailable. Please try again." });
  }
});

router.post("/market-timing", async (req, res): Promise<void> => {
  const parsed = CreateMarketInsightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const userId = stripHtml(parsed.data.userId);
    await ensureDemoUser(userId);
    const insight = await createMarketAdvice(parsed.data.cropType, parsed.data.yieldTons);
    const [saved] = await db.insert(marketInsightsTable).values({
      id: randomUUID(),
      userId,
      cropType: parsed.data.cropType,
      yieldTons: parsed.data.yieldTons,
      ...insight.result,
      provider: insight.provider,
    }).returning();
    res.json(CreateMarketInsightResponse.parse(saved));
  } catch (error) {
    req.log.error({ err: error }, "Market insight failed");
    res.status(502).json({ error: "Market insight is temporarily unavailable. Please try again." });
  }
});

export default router;