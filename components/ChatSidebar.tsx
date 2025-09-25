"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  User,
  Bot,
  Settings,
  Trash2,
  Copy
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  onPreferenceUpdate?: (preferences: string[]) => void;
}

export function ChatSidebar({ onPreferenceUpdate }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 你好！我是你的 Daily Agent 助手。我可以帮你:\n\n• 自定义资讯偏好\n• 解释数据源内容\n• 调整分类筛选\n• 提供个性化建议\n\n你想了解什么？",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // 模拟AI回复，实际项目中可以调用OpenRouter API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getSimulatedResponse(userMessage.content),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSimulatedResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes("偏好") || input.includes("喜欢") || input.includes("关注")) {
      return "我了解你想设置偏好！你可以告诉我你感兴趣的领域:\n\n• 💻 技术创新 - AI、区块链、云计算\n• 💼 商业动态 - 融资、IPO、市场分析\n• 🚀 产品发布 - 新产品、功能更新\n• 👨‍💻 开发者工具 - 编程语言、框架、库\n• 🏠 远程工作 - 远程职位、工作方式\n\n请告诉我你最感兴趣的1-2个领域？";
    }

    if (input.includes("技术") || input.includes("ai") || input.includes("开发")) {
      onPreferenceUpdate?.(["tech", "dev"]);
      return "✅ 已为你设置技术创新和开发者偏好！\n\n现在你会优先看到:\n• GitHub 热门项目\n• Hacker News 技术讨论\n• Dev.to 开发者文章\n• AI 和技术创新资讯\n\n顶部导航已更新，你可以快速切换到这些分类查看相关内容。";
    }

    if (input.includes("商业") || input.includes("创业") || input.includes("投资")) {
      onPreferenceUpdate?.(["business"]);
      return "✅ 已设置商业动态偏好！\n\n你将优先获取:\n• 36氪商业快讯\n• 知乎商业话题\n• 投资融资消息\n• 创业公司动态\n\n可以点击顶部的商业动态分类查看相关资讯。";
    }

    if (input.includes("远程") || input.includes("工作") || input.includes("职位")) {
      onPreferenceUpdate?.(["remote"]);
      return "✅ 已设置远程工作偏好！\n\n为你筛选:\n• RemoteOK 远程职位\n• WeWorkRemotely 工作机会\n• 远程工作相关资讯\n• 数字游民内容\n\n点击远程工作分类查看最新职位信息。";
    }

    if (input.includes("清除") || input.includes("重置") || input.includes("删除")) {
      onPreferenceUpdate?.([]);
      return "✅ 已清除所有偏好设置！\n\n现在显示所有分类的内容。你可以随时告诉我你的新偏好来重新定制内容。";
    }

    if (input.includes("帮助") || input.includes("功能") || input.includes("怎么")) {
      return "🤖 Daily Agent 功能介绍:\n\n📊 **智能聚合**: 自动获取多个科技资讯源\n🔍 **分类筛选**: 按技术、商业、产品等分类\n⚡ **实时生成**: 流式输出，实时显示进度\n🎯 **个性化**: 根据你的偏好调整内容\n📧 **邮件推送**: 定时发送日报到邮箱\n\n想了解具体哪个功能？";
    }

    return "我理解你的需求。作为 Daily Agent 助手，我可以帮你:\n\n• 设置个性化偏好\n• 解释数据源内容  \n• 优化资讯筛选\n• 解答使用问题\n\n还有什么我可以帮助你的吗？";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages(messages.slice(0, 1)); // 保留欢迎消息
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        >
          <MessageCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">AI 助手</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-6 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized
          ? "bottom-6 w-80 h-14"
          : "bottom-6 top-20 w-96"
      }`}
    >
      <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm">AI 助手</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">在线</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg group relative ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-line leading-relaxed">
                      {message.content}
                    </div>
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {message.role === "user" && (
                    <div className="w-7 h-7 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white animate-pulse" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="询问 AI 助手..."
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '100px' }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">
                  偏好设置
                </Badge>
                <Badge variant="outline" className="text-xs">
                  数据解释
                </Badge>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Enter 发送
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}