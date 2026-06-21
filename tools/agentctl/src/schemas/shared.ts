import { z } from "zod";

export const StatusEnum = z.enum([
  "draft",
  "active",
  "deprecated",
  "archived",
]);
export type Status = z.infer<typeof StatusEnum>;

export const TypeEnum = z.enum([
  "role",
  "context",
  "behavior",
  "tool_usage",
  "output_format",
  "safety",
  "other",
]);
export type Type = z.infer<typeof TypeEnum>;

export const RiskEnum = z.enum(["low", "medium", "high", "critical"]);
export type Risk = z.infer<typeof RiskEnum>;

export const ChannelEnum = z.enum(["global", "interview_prep", "other"]);
export type Channel = z.infer<typeof ChannelEnum>;

export const MaturityEnum = z.enum([
  "experimental",
  "alpha",
  "beta",
  "stable",
  "deprecated",
]);
export type Maturity = z.infer<typeof MaturityEnum>;

export const PriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export type Priority = z.infer<typeof PriorityEnum>;

// SemVer pattern: ^(\d+\.\d+\.\d+)$
export const SemVerPattern = /^\d+\.\d+\.\d+$/;
export const SemVer = z.string().regex(SemVerPattern, "Invalid semver format");
