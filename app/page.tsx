"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatSidebar } from "@/components/ChatSidebar";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import { DEFAULT_DISCOVERY_CATEGORIES } from "@/lib/config/discoveryCategories";

type CategoryConfig = {
  id: string;
  name: string;
  icon: LucideIcon;
  prompt: string;
  description: string;
  isCustom?: boolean;
};

type CustomCategory = {
  id: string;
  name: string;
  description?: string;
};

type CategoryItem = {
  title: string;
  summary: string;
  link: string;
  categoryId: string;
  categoryName: string;
  sourceName?: string;
  reason?: string;
};

type CategoryResult = {
  id: string;
  title: string;
  description?: string;
  items: CategoryItem[];
  meta?: {
    fetchedSourceCount: number;
    rawItemCount: number;
    usedAI: boolean;
    sourceStatuses?: SourceStatus[];
  };
  retrievedAt?: string;
};

type CategoryState = {
  status: "idle" | "loading" | "ready" | "error";
  result?: CategoryResult;
  error?: string;
};

type SourceStatus = {
  id: string;
  title: string;
  status: "ok" | "fallback" | "error";
  usedFallback: boolean;
  fromCache: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  message?: string;
};

const RESULTS_PER_CATEGORY = 6;
const CUSTOM_CATEGORY_STORAGE_KEY = "customCategories";
const PRIMARY_CATEGORY_ID = DEFAULT_DISCOVERY_CATEGORIES[0]?.id ?? "ai";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  ai: Sparkles,
  tech: Code,
  business: Briefcase,
  product: Star,
  launch: Rocket,
  developer: BookOpen,
  remote: Activity,
  github: Code,
  producthunt: Star,
};

const BUILTIN_CATEGORIES: CategoryConfig[] = DEFAULT_DISCOVERY_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.name,
  icon: CATEGORY_ICON_MAP[category.id] ?? Layers,
  prompt: category.prompt,
  description: category.description,
}));

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategoryState] = useState(() => searchParams.get("tab") ?? PRIMARY_CATEGORY_ID);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const id = typeof (entry as CustomCategory).id === "string" ? (entry as CustomCategory).id : "";
          const name = typeof (entry as CustomCategory).name === "string" ? (entry as CustomCategory).name : "";
          if (!id || !name) return null;
          return {
            id,
            name,
            description: typeof (entry as CustomCategory).description === "string" ? (entry as CustomCategory).description : undefined
          } satisfies CustomCategory;
        })
        .filter(Boolean) as CustomCategory[];
    } catch (error) {
      console.warn("Failed to load custom categories", error);
      return [];
    }
  });
  const [categoryStates, setCategoryStates] = useState<Record<string, CategoryState>>({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  // Request deduplication
  const activeRequestsRef = useRef<Set<string>>(new Set());
  const pendingCategoryRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(customCategories));
    } catch (error) {
      console.warn("Failed to persist custom categories", error);
    }
  }, [customCategories]);

  const categories = useMemo(() => {
    return [
      ...BUILTIN_CATEGORIES,
      ...customCategories.map<CategoryConfig>((category) => ({
        id: category.id,
        name: category.name,
        icon: Layers,
        prompt: category.description?.trim() || category.name,
        description: category.description?.trim() || `AI curated stories for ${category.name}`,
        isCustom: true
      }))
    ];
  }, [customCategories]);

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  const normalizeItems = useCallback((items: unknown, fallback: CategoryConfig): CategoryItem[] => {
    if (!Array.isArray(items)) return [];

    return items.map((raw, index) => {
      const entry = raw as Partial<CategoryItem & { link?: string; sourceId?: string }>;
      const rawId = typeof entry.categoryId === "string" && entry.categoryId.trim() ? toSlug(entry.categoryId) : fallback.id;
      const rawName = typeof entry.categoryName === "string" && entry.categoryName.trim() ? entry.categoryName.trim() : undefined;
      const title = typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : `${fallback.name} 热门话题 ${index + 1}`;
      const summary = typeof entry.summary === "string" && entry.summary.trim() ? entry.summary.trim() : "";
      const link = typeof entry.link === "string" && entry.link.trim() && (entry.link.startsWith("http://") || entry.link.startsWith("https://"))
        ? entry.link.trim()
        : "#";
      const sourceName = typeof entry.sourceName === "string" && entry.sourceName.trim() ? entry.sourceName.trim() : undefined;
      const reason = typeof entry.reason === "string" && entry.reason.trim() ? entry.reason.trim() : undefined;

      return {
        title,
        summary,
        link,
        categoryId: rawId,
        categoryName: rawName ?? categoryNameMap[rawId] ?? fallback.name,
        sourceName: sourceName ?? (rawName ? undefined : fallback.name),
        reason,
      } satisfies CategoryItem;
    });
  }, [categoryNameMap]);

  const selectCategory = useCallback((categoryId: string) => {
    const exists = categories.some((category) => category.id === categoryId);
    const nextCategory = exists ? categoryId : PRIMARY_CATEGORY_ID;
    const currentParam = searchParams.get("tab");
    const shouldUpdateUrl =
      (nextCategory === PRIMARY_CATEGORY_ID && currentParam !== null) ||
      (nextCategory !== PRIMARY_CATEGORY_ID && currentParam !== nextCategory);

    if (nextCategory !== selectedCategory) {
      pendingCategoryRef.current = nextCategory;
      setSelectedCategoryState(nextCategory);
    } else if (shouldUpdateUrl) {
      pendingCategoryRef.current = nextCategory;
    } else {
      pendingCategoryRef.current = null;
    }

    if (shouldUpdateUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (nextCategory === PRIMARY_CATEGORY_ID) {
        params.delete("tab");
      } else {
        params.set("tab", nextCategory);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [categories, pathname, router, searchParams, selectedCategory]);

  useEffect(() => {
    const param = searchParams.get("tab");
    const candidate = param ?? PRIMARY_CATEGORY_ID;
    const exists = categories.some((category) => category.id === candidate);
    const nextCategory = exists ? candidate : PRIMARY_CATEGORY_ID;

    if (pendingCategoryRef.current) {
      const expectedParam = pendingCategoryRef.current === PRIMARY_CATEGORY_ID ? null : pendingCategoryRef.current;
      if (nextCategory === pendingCategoryRef.current || param === expectedParam) {
        pendingCategoryRef.current = null;
      } else {
        return;
      }
    }

    if (!exists && param) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    if (selectedCategory !== nextCategory) {
      setSelectedCategoryState(nextCategory);
    }
  }, [searchParams, categories, pathname, router, selectedCategory]);

  const fetchCategory = useCallback(async (categoryId: string, options: { force?: boolean } = {}) => {
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category) return null;

    // Prevent duplicate requests for the same category
    const requestKey = `${categoryId}-${options.force ? 'force' : 'normal'}`;
    if (activeRequestsRef.current.has(requestKey)) {
      return null;
    }

    // Use functional update to access current state without dependency
    let shouldSkip = false;
    setCategoryStates((prev) => {
      const existing = prev[categoryId];
      if (!options.force) {
        if (existing?.status === "loading" || existing?.status === "ready") {
          shouldSkip = true;
          return prev;
        }
      }
      return {
        ...prev,
        [categoryId]: {
          status: "loading",
          result: prev[categoryId]?.result
        }
      };
    });

    if (shouldSkip) return null;

    // Mark request as active
    activeRequestsRef.current.add(requestKey);

    const params = new URLSearchParams();
    // Use higher limits for GitHub and ProductHunt trending
    const limit = (categoryId === "github" || categoryId === "producthunt") ? 20 : RESULTS_PER_CATEGORY;
    params.set("limit", String(limit));
    params.set("categoryId", categoryId);
    params.set("categoryName", category.name);
    params.set("prompt", category.prompt);

    try {
      const response = await fetch(`/api/ai-search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${category.name}: ${response.status}`);
      }

      const payload = await response.json();
      const result: CategoryResult = {
        id: category.id,
        title: payload?.title || category.name,
        description: payload?.description || category.description,
        items: normalizeItems(payload?.items || [], category),
        meta: payload?.meta,
        retrievedAt: payload?.retrievedAt,
      };

      setCategoryStates((prev) => ({
        ...prev,
        [categoryId]: {
          status: "ready",
          result
        }
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setCategoryStates((prev) => ({
        ...prev,
        [categoryId]: {
          status: "error",
          error: message,
          result: {
            id: category.id,
            title: category.name,
            description: category.description,
            items: []
          }
        }
      }));
      return null;
    } finally {
      // Remove request from active list
      activeRequestsRef.current.delete(requestKey);
    }
  }, [categories, normalizeItems]);

  useEffect(() => {
    fetchCategory(selectedCategory);
  }, [selectedCategory, fetchCategory]);

  const activeState = categoryStates[selectedCategory];
  const activeResult = activeState?.result;
  const activeError = activeState?.status === "error" ? activeState.error : undefined;
  const isLoading = activeState?.status === "loading";
  const sourceStatuses = activeResult?.meta?.sourceStatuses ?? [];
  const degradedSources = sourceStatuses.filter((status) => status.status !== "ok");
  const activeCategoryConfig = useMemo(
    () => categories.find((category) => category.id === selectedCategory),
    [categories, selectedCategory]
  );

  const handleRefresh = () => {
    fetchCategory(selectedCategory, { force: true });
  };

  const startAddCategory = () => {
    setIsAddingCategory(true);
    setForm({ name: "", description: "" });
    setFormError("");
  };

  const cancelAddCategory = () => {
    setIsAddingCategory(false);
    setForm({ name: "", description: "" });
    setFormError("");
  };

  const submitCustomCategory = () => {
    const name = form.name.trim();
    if (!name) {
      setFormError("请输入分类名称");
      return;
    }

    const id = toSlug(name);
    if (!id) {
      setFormError("分类名称需要包含有效字符");
      return;
    }

    if (categoryNameMap[id]) {
      setFormError("该分类已存在");
      return;
    }

    const customCategory: CustomCategory = {
      id,
      name,
      description: form.description.trim() || undefined
    };

    setCustomCategories((prev) => [...prev, customCategory]);
    setIsAddingCategory(false);
    setForm({ name: "", description: "" });
    setFormError("");
    selectCategory(id);
  };

  const removeCategory = (categoryId: string) => {
    setCustomCategories((prev) => prev.filter((category) => category.id !== categoryId));
    setCategoryStates((prev) => {
      if (!(categoryId in prev)) return prev;
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    if (selectedCategory === categoryId) {
      selectCategory(PRIMARY_CATEGORY_ID);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <header className="flex flex-col gap-6 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-800 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Daily Agent</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">One-click AI sourcing for your daily brief</p>
              </div>
              <Badge variant="secondary" className="ml-1 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-200">
                Repository Alpha
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新当前分类
              </Button>
              <Button onClick={startAddCategory} variant="default" className="gap-2">
                <Plus className="h-4 w-4" />
                添加分类
              </Button>
            </div>
          </div>
          <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            点击任意分类即可获取来自该领域的实时热门内容。我们聚合了 Hacker News、GitHub Trending、Product Hunt、Reddit、知乎等平台的真实数据，为你提供高质量的热点信息。
          </p>
        </header>

        <section className="flex flex-wrap gap-2 pb-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const state = categoryStates[category.id];
            const isActive = selectedCategory === category.id;
            const hasError = state?.status === "error";
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.id)}
                className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white shadow"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
                {hasError && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Error</span>
                )}
                {category.isCustom && (
                  <span
                    role="button"
                    tabIndex={0}
                    className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] transition ${
                      isActive ? "border-white/30 text-white/70 hover:bg-white/10" : "border-gray-300 text-gray-400 hover:bg-gray-100"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeCategory(category.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        removeCategory(category.id);
                      }
                    }}
                    aria-label={`删除分类 ${category.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {isAddingCategory && (
          <Card className="mb-6 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">添加自定义分类</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">分类名称 *</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="例如：AI Agents"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">提示语 (可选)</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="描述你想关注的热点，AI 会据此搜索"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex items-center gap-2">
                <Button onClick={submitCustomCategory} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  确认添加
                </Button>
                <Button variant="ghost" onClick={cancelAddCategory}>取消</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <CardHeader className="flex flex-col gap-1 border-b border-gray-100 pb-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {activeResult?.title || categoryNameMap[selectedCategory] || "Loading"}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeResult?.description || activeCategoryConfig?.description || "AI generated insights"}
                </p>
              </div>
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
            </div>
            {activeError && (
              <p className="text-sm text-red-500">{activeError}</p>
            )}
            {degradedSources.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="font-medium">部分来源暂不可用：</p>
                <ul className="mt-1 space-y-1">
                  {degradedSources.map((status) => {
                    const label = status.status === "fallback" ? "已使用预设内容" : "抓取失败";
                    return (
                      <li key={status.id} className="flex flex-wrap gap-1">
                        <span className="font-medium">{status.title}</span>
                        <span>— {label}</span>
                        {status.message && (
                          <span className="text-amber-700/80 dark:text-amber-300/80">({status.message})</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!isLoading && (!activeResult || activeResult.items.length === 0) && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                暂无内容，尝试刷新或调整分类描述。
              </div>
            )}

            {isLoading && (!activeResult || activeResult.items.length === 0) && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在获取热门内容…
              </div>
            )}

            {activeResult?.items.map((item, index) => (
              <article key={`${item.link}-${index}`} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-950/80">
                <header className="flex items-center justify-between gap-3 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {item.categoryName}
                    </Badge>
                    {item.sourceName && (
                      <Badge variant="outline" className="border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.sourceName}
                      </Badge>
                    )}
                  </div>
                  <a
                    href={item.link}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    阅读原文
                  </a>
                </header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.summary}</p>
                )}
                {item.reason && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{item.reason}</p>
                )}
              </article>
            ))}
          </CardContent>
        </Card>
      </div>

      <ChatSidebar />
    </div>
  );
}
