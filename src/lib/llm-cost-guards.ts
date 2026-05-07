/**
 * Cost guards for the LLM synthesis layer.
 *
 *   • In-memory query cache (1h TTL) — collapses repeat queries.
 *   • Per-IP rate limit (10 calls/min) — protects against abuse.
 *   • Daily budget ($5/day) — hard stop, callers fall back to keyword mode.
 *
 * Everything is in-process and survives only as long as the serverless
 * container instance. That is fine for the basic-protection use-case
 * Phase 2A asks for; Vercel KV / Redis can drop in later for cluster-wide
 * accounting.
 */

import type { SynthesisResult } from "./llm-synthesis";

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  value: SynthesisResult;
  expiresAt: number;
}

const synthesisCache = new Map<string, CacheEntry>();

function normalizeQueryForCache(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function cacheKey(query: string, mode: string): string {
  return `${mode}::${normalizeQueryForCache(query)}`;
}

export function getCached(key: string): SynthesisResult | null {
  const entry = synthesisCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    synthesisCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key: string, value: SynthesisResult): void {
  if (synthesisCache.size >= CACHE_MAX_ENTRIES) {
    // Evict oldest — Map preserves insertion order.
    const firstKey = synthesisCache.keys().next().value;
    if (firstKey !== undefined) synthesisCache.delete(firstKey);
  }
  synthesisCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ── Rate limit ─────────────────────────────────────────────────────────────

const RATE_LIMIT_PER_MIN = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const rateLimitBuckets = new Map<string, number[]>();

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_PER_MIN) {
    const oldest = recent[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: RATE_LIMIT_WINDOW_MS - (now - oldest),
    };
  }

  recent.push(now);
  rateLimitBuckets.set(ip, recent);
  return {
    allowed: true,
    remaining: RATE_LIMIT_PER_MIN - recent.length,
    resetMs: RATE_LIMIT_WINDOW_MS,
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

// ── Daily budget ───────────────────────────────────────────────────────────

const DAILY_BUDGET_USD = 5.0;

interface BudgetState {
  date: string; // YYYY-MM-DD UTC
  spentUsd: number;
}

let budgetState: BudgetState = {
  date: today(),
  spentUsd: 0,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollIfNewDay(): void {
  const t = today();
  if (budgetState.date !== t) {
    budgetState = { date: t, spentUsd: 0 };
  }
}

export function isBudgetExceeded(): boolean {
  rollIfNewDay();
  return budgetState.spentUsd >= DAILY_BUDGET_USD;
}

export function recordSpend(usd: number): void {
  rollIfNewDay();
  budgetState.spentUsd += usd;
}

export function getBudgetSnapshot(): {
  date: string;
  spentUsd: number;
  limitUsd: number;
  remainingUsd: number;
} {
  rollIfNewDay();
  return {
    date: budgetState.date,
    spentUsd: budgetState.spentUsd,
    limitUsd: DAILY_BUDGET_USD,
    remainingUsd: Math.max(0, DAILY_BUDGET_USD - budgetState.spentUsd),
  };
}
