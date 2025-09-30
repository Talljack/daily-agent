import { NextRequest } from "next/server";
import {
  fetchAggregatedInsights,
  fetchCategoryInsights,
  fetchDynamicCategoryInsights,
  getDefaultCategoriesSnapshot,
} from "@/lib/services/discoveryAggregator";
import { getDefaultCategoryById } from "@/lib/config/discoveryCategories";

export const runtime = "nodejs";

type ParsedCategory = {
  id: string;
  name: string;
  prompt: string;
};

function clampLimit(value: number | undefined, fallback = 6) {
  if (!Number.isFinite(value) || !value) {
    return fallback;
  }
  return Math.max(3, Math.min(Math.round(value), 16));
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function parseCategoriesParam(raw: string | null): ParsedCategory[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const idSource = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : undefined;
        const nameSource = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : undefined;
        const promptSource = typeof entry.prompt === "string" && entry.prompt.trim() ? entry.prompt.trim() : undefined;

        const resolvedId = idSource ? toSlug(idSource) : nameSource ? toSlug(nameSource) : undefined;
        if (!resolvedId || seen.has(resolvedId)) return null;

        seen.add(resolvedId);

        const defaultCategory = getDefaultCategoryById(resolvedId);

        return {
          id: resolvedId,
          name: nameSource ?? defaultCategory?.name ?? resolvedId,
          prompt: promptSource ?? defaultCategory?.prompt ?? (nameSource ?? resolvedId),
        } satisfies ParsedCategory;
      })
      .filter(Boolean) as ParsedCategory[];
  } catch (error) {
    console.warn("Failed to parse categories param", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = clampLimit(limitParam);

    const categoryIdParam = url.searchParams.get("categoryId")?.trim();
    const categoryNameParam = url.searchParams.get("categoryName")?.trim();
    const promptParam = url.searchParams.get("prompt")?.trim();
    const categoriesParam = url.searchParams.get("categories");
    const sitesParam = url.searchParams.get("sites");

    const fallbackCategoryId = getDefaultCategoriesSnapshot()[0]?.id ?? "ai";
    const resolvedCategoryId = toSlug(categoryIdParam ?? fallbackCategoryId);
    const defaultCategory = getDefaultCategoryById(resolvedCategoryId);
    const resolvedCategoryName = categoryNameParam ?? defaultCategory?.name ?? resolvedCategoryId;
    const resolvedPrompt = promptParam ?? defaultCategory?.prompt ?? resolvedCategoryName;
    const relatedSites = sitesParam
      ? sitesParam.split(",").map((site) => site.trim()).filter(Boolean)
      : [];

    if (resolvedCategoryId === "all") {
      const parsedCategories = parseCategoriesParam(categoriesParam);
      const categories = parsedCategories.length > 0 ? parsedCategories : getDefaultCategoriesSnapshot();

      const aggregate = await fetchAggregatedInsights(categories, limit);
      return Response.json(aggregate);
    }

    if (!defaultCategory) {
      const dynamicResult = await fetchDynamicCategoryInsights({
        categoryName: resolvedCategoryName,
        userPrompt: resolvedPrompt,
        limit,
        relatedSites,
      });

      return Response.json(dynamicResult);
    }

    const result = await fetchCategoryInsights({
      categoryId: resolvedCategoryId,
      categoryName: resolvedCategoryName,
      userPrompt: resolvedPrompt,
      limit,
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Discovery API error:", error);

    return Response.json(
      {
        id: "ai_search_error",
        title: "AI Search Error",
        error: `Failed to perform search: ${message}`,
        items: [],
      },
      { status: 500 }
    );
  }
}
