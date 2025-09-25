"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChatSidebar } from "@/components/ChatSidebar";
import {
  RefreshCw, Clock, TrendingUp, Briefcase, Code, Newspaper,
  Settings, Download, Share2, Filter, Search, ChevronRight,
  ExternalLink, Zap, Globe, BookOpen, BarChart3, Activity,
  CheckCircle2, AlertTriangle, Sparkles, Cpu, ArrowUpRight,
  Command, Star, Layers, Target, Play, Calendar, Menu, X,
  Eye, GitBranch, Users, Plus, Rss
} from "lucide-react";

type DailySourceItem = {
  title: string;
  link: string;
  summary: string;
};

type DailySourceResult = {
  id: string;
  title: string;
  description?: string;
  items: DailySourceItem[];
  error?: string;
};

type DailyReport = {
  generatedAt: string;
  summary: string;
  rawContent: string;
  sources: DailySourceResult[];
};

const formatDateTime = (timestamp?: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getSourceIcon = (sourceId: string) => {
  const iconMap = {
    zhihu: <TrendingUp className="w-4 h-4" />,
    "36kr": <Newspaper className="w-4 h-4" />,
    hn: <Code className="w-4 h-4" />,
    remote_ok: <Briefcase className="w-4 h-4" />,
    weworkremotely: <Briefcase className="w-4 h-4" />,
    producthunt: <TrendingUp className="w-4 h-4" />,
    github_trending: <Code className="w-4 h-4" />,
    devto: <BookOpen className="w-4 h-4" />,
  };
  return iconMap[sourceId as keyof typeof iconMap] || <Globe className="w-4 h-4" />;
};

const getSourceAccent = (sourceId: string) => {
  const accentMap = {
    zhihu: "bg-blue-600",
    "36kr": "bg-orange-600",
    hn: "bg-amber-600",
    remote_ok: "bg-green-600",
    weworkremotely: "bg-purple-600",
    producthunt: "bg-pink-600",
    github_trending: "bg-gray-900",
    devto: "bg-indigo-600",
  };
  return accentMap[sourceId as keyof typeof accentMap] || "bg-gray-600";
};

export default function Home() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"overview" | "sources">("overview");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [streamStatus, setStreamStatus] = useState<string>("");
  const [streamProgress, setStreamProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userPreferences, setUserPreferences] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = [
    { id: "all", name: "All", icon: <Globe className="w-4 h-4" />, count: 0 },
    { id: "tech", name: "Tech", icon: <Code className="w-4 h-4" />, count: 0 },
    { id: "business", name: "Business", icon: <Briefcase className="w-4 h-4" />, count: 0 },
    { id: "product", name: "Product", icon: <Sparkles className="w-4 h-4" />, count: 0 },
    { id: "dev", name: "Dev", icon: <BookOpen className="w-4 h-4" />, count: 0 },
    { id: "remote", name: "Remote", icon: <TrendingUp className="w-4 h-4" />, count: 0 }
  ];

  const fetchReportStream = useCallback(async () => {
    setIsStreaming(true);
    setLoading(true);
    setError(null);
    setReport(null);
    setStreamStatus("");
    setStreamProgress(0);

    try {
      const response = await fetch("/api/daily/stream");
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read stream data");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentReport: DailyReport = {
        generatedAt: new Date().toISOString(),
        summary: "",
        rawContent: "",
        sources: []
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'status':
                  setStreamStatus(data.message);
                  if (data.progress) setStreamProgress(data.progress);
                  break;
                case 'progress':
                  setStreamStatus(data.message);
                  setStreamProgress(data.progress);
                  break;
                case 'source_complete':
                  currentReport.sources.push(data.source);
                  setReport({ ...currentReport });
                  break;
                case 'source_error':
                  currentReport.sources.push(data.source);
                  setReport({ ...currentReport });
                  break;
                case 'data_complete':
                  currentReport.sources = data.sources;
                  currentReport.rawContent = data.rawContent;
                  setReport({ ...currentReport });
                  setStreamProgress(data.progress);
                  break;
                case 'summary_chunk':
                  currentReport.summary = data.fullContent;
                  setReport({ ...currentReport });
                  if (data.progress) setStreamProgress(data.progress);
                  break;
                case 'summary_complete':
                  currentReport.summary = data.content;
                  setReport({ ...currentReport });
                  setStreamProgress(100);
                  break;
                case 'summary_error':
                  currentReport.summary = data.error;
                  setReport({ ...currentReport });
                  break;
                case 'complete':
                  currentReport.generatedAt = data.generatedAt;
                  setReport({ ...currentReport });
                  setStreamStatus("Generation complete");
                  break;
                case 'error':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn("Failed to parse stream data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setReport(null);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamStatus("");
      setStreamProgress(0);
    }
  }, []);

  useEffect(() => {
    fetchReportStream();
  }, []);

  const filteredSources = useMemo(() => {
    if (!report?.sources) return [];

    let activeCategory = selectedCategory;
    if (userPreferences.length > 0 && selectedCategory === "all") {
      activeCategory = userPreferences[0];
    }

    if (activeCategory === "all") return report.sources;

    const categoryMap: Record<string, string[]> = {
      tech: ["github_trending", "hn", "devto"],
      business: ["36kr", "zhihu", "producthunt"],
      product: ["producthunt", "zhihu"],
      dev: ["github_trending", "hn", "devto"],
      remote: ["remote_ok", "weworkremotely"]
    };

    const sourceIds = categoryMap[activeCategory] || [];
    return report.sources.filter(source => sourceIds.includes(source.id));
  }, [report?.sources, selectedCategory, userPreferences]);

  const stats = useMemo(() => {
    if (!report?.sources) return { total: 0, success: 0, items: 0 };
    const successfulSources = report.sources.filter(s => !s.error && s.items?.length > 0);
    const totalItems = report.sources.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    return {
      total: report.sources.length,
      success: successfulSources.length,
      items: totalItems
    };
  }, [report]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Modern Vercel-Style Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white dark:text-black" />
                </div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Agent</h1>
                  <Badge variant="outline" className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                    Beta
                  </Badge>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-8">
                <button
                  onClick={() => setSelectedView("overview")}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    selectedView === "overview"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedView("sources")}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    selectedView === "sources"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  Sources
                </button>
              </div>
              <div className="flex items-center space-x-6">
                <a href="#" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  API
                </a>
                <a href="#" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Docs
                </a>
              </div>
            </nav>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>

              <Button
                onClick={fetchReportStream}
                disabled={loading || isStreaming}
                size="sm"
                className="bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isStreaming ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setSelectedView("overview");
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Overview
                </button>
                <button
                  onClick={() => {
                    setSelectedView("sources");
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Sources
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Category Filter Bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-4 overflow-x-auto">
            {categories.map(category => {
              const isActive = selectedCategory === category.id;
              const isPreferred = userPreferences.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full transition-all whitespace-nowrap border ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-md border-black dark:border-white"
                      : "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  {category.icon}
                  <span className="ml-2">{category.name}</span>
                  {isPreferred && (
                    <Star className="w-3 h-3 ml-1 fill-current" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Streaming Progress */}
        {isStreaming && (
          <div className="mb-8">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {streamStatus || "Processing..."}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Generating AI-powered insights
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {streamProgress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${streamProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {report ? (
          <>
            {selectedView === "overview" ? (
              <div className="space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.success}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Active Sources</p>
                        </div>
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.items}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Articles</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                          <Newspaper className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">AI</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Powered Summary</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Summary */}
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          <span>AI Summary</span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Generated from {stats.items} articles across {stats.success} sources
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="prose max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-900 dark:text-white">{children}</h3>,
                          p: ({children}) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>,
                          ul: ({children}) => <ul className="mb-4 space-y-2">{children}</ul>,
                          li: ({children}) => (
                            <li className="flex items-start space-x-2">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-700 dark:text-gray-300">{children}</span>
                            </li>
                          ),
                        }}
                      >
                        {report.summary}
                      </ReactMarkdown>
                    </div>
                    {report.generatedAt && (
                      <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>Generated: {formatDateTime(report.generatedAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {filteredSources.length} sources • {filteredSources.reduce((sum, s) => sum + s.items.length, 0)} articles
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>

                <div className="space-y-6">
                  {filteredSources.map(source => (
                    <Card key={source.id} className="border-0 shadow-sm bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200">
                      <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${getSourceAccent(source.id)}`}>
                              {getSourceIcon(source.id)}
                            </div>
                            <div>
                              <CardTitle className="flex items-center space-x-2 text-lg">
                                {source.title}
                                {source.items.length > 0 && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                              </CardTitle>
                              {source.description && (
                                <CardDescription className="mt-1">{source.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                            {source.items.length} articles
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4">
                        {source.error ? (
                          <div className="text-center py-8">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                            <p className="text-red-600 dark:text-red-400">{source.error}</p>
                          </div>
                        ) : source.items.length === 0 ? (
                          <div className="text-center py-8">
                            <Globe className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-500">No articles available</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {source.items.slice(0, 5).map((item, index) => (
                              <article
                                key={item.link || item.title}
                                className="group border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200"
                              >
                                <div className="flex items-start space-x-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full flex items-center justify-center">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center space-x-2 hover:underline"
                                      >
                                        <span className="line-clamp-2">{item.title || "Untitled Article"}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                      </a>
                                    </h3>
                                    {item.summary && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {item.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </article>
                            ))}
                            {source.items.length > 5 && (
                              <button className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center space-x-1 transition-colors bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <span>Show {source.items.length - 5} more articles</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : !loading && !error ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <Target className="w-10 h-10 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Generate Your Tech Report
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
              Click the generate button to let Grok AI analyze the latest tech trends and business insights for you.
            </p>
            <Button
              onClick={fetchReportStream}
              size="lg"
              className="bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 text-white font-semibold px-8 py-4 text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Play className="w-5 h-5 mr-2" />
              Generate Report
            </Button>
          </div>
        ) : null}
      </main>

      <ChatSidebar
        onPreferenceUpdate={(preferences) => {
          setUserPreferences(preferences);
          if (preferences.length > 0) {
            setSelectedCategory(preferences[0]);
          }
        }}
      />
    </div>
  );
}