import { pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("agrisense_users", {
  id: text("id").primaryKey(),
  farmerName: text("farmer_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cropDiagnosticsTable = pgTable("crop_diagnostics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageName: text("image_name"),
  diseaseName: text("disease_name").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  severity: text("severity").notNull(),
  treatmentPlan: text("treatment_plan").notNull(),
  preventativeMeasures: text("preventative_measures").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weatherAdvisoriesTable = pgTable("weather_advisories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  location: text("location").notNull(),
  season: text("season").notNull(),
  alertLevel: text("alert_level").notNull(),
  shortTermAction: text("short_term_action").notNull(),
  longTermAdvice: text("long_term_advice").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketInsightsTable = pgTable("market_insights", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  cropType: text("crop_type").notNull(),
  yieldTons: real("yield_tons").notNull(),
  bestTimeToSell: text("best_time_to_sell").notNull(),
  estimatedPriceTrend: text("estimated_price_trend").notNull(),
  strategyRecommendation: text("strategy_recommendation").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCropDiagnosticSchema = createInsertSchema(cropDiagnosticsTable).omit({
  id: true,
  createdAt: true,
});
export const insertWeatherAdvisorySchema = createInsertSchema(weatherAdvisoriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertMarketInsightSchema = createInsertSchema(marketInsightsTable).omit({
  id: true,
  createdAt: true,
});

export type CropDiagnostic = typeof cropDiagnosticsTable.$inferSelect;
export type WeatherAdvisoryRecord = typeof weatherAdvisoriesTable.$inferSelect;
export type MarketInsightRecord = typeof marketInsightsTable.$inferSelect;
export type InsertCropDiagnostic = z.infer<typeof insertCropDiagnosticSchema>;
export type InsertWeatherAdvisory = z.infer<typeof insertWeatherAdvisorySchema>;
export type InsertMarketInsight = z.infer<typeof insertMarketInsightSchema>;