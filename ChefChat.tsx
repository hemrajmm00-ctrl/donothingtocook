import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User, ChefHat, Sparkles } from "lucide-react";
import { ChatMessage, Recipe } from "../types";

const chefLogo = new URL("../assets/images/chef_logo_1784042631401.jpg", import.meta.url).href;

interface ChefChatProps {
  activeRecipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "What is a substitution for buttermilk?",
  "How can I scale this to 6 servings?",
  "Can I prep this dish the night before?",
  "Is there a dairy-free substitute for butter here?"
];

export default function ChefChat({ activeRecipe, isOpen, onClose }: ChefChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "chef",
      text: activeRecipe
        ? `Bonjour! I am your AI Chef from Do Nothing To Cook. I see you are cooking the "${activeRecipe.title}". Ask me any questions about substitutions, scaling, or techniques for this recipe!`
        : "Bonjour! I am your personal AI culinary coach from Do Nothing To Cook. What are we planning to cook today? Ask me about cooking methods, substitutions, or meal ideas!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Restart chat if the active recipe changes
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "chef",
        text: activeRecipe
          ? `Bonjour! I am your AI Chef from Do Nothing To Cook. I see you are cooking the "${activeRecipe.title}". Ask me any questions about substitutions, scaling, or techniques for this recipe!`
          : "Bonjour! I am your personal AI culinary coach from Do Nothing To Cook. What are we planning to cook today? Ask me about cooking methods, substitutions, or meal ideas!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [activeRecipe]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/recipe/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          activeRecipe,
        }),
      });

      if (!res.ok) {
        throw new Error("I had a small chef slip-up. Let me try again.");
      }

      const data = await res.json();
      const chefMsg: ChatMessage = {
        id: `msg-${Date.now()}-reply`,
        sender: "chef",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, chefMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          sender: "chef",
          text: err.message || "The AI Chef Advisor is temporarily away from the counter. Check your connection and try asking again shortly!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="chef-chat-panel" className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl border-l border-gray-100 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg overflow-hidden border border-gray-700 bg-white flex items-center justify-center">
            <img 
              src={chefLogo} 
              alt="AI Chef Advisor Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">AI Chef Advisor</h3>
            <p className="text-[10px] text-gray-300">Live Culinary Advisor</p>
          </div>
        </div>
        <button
          id="btn-close-chef-chat"
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages scrolling container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isChef = msg.sender === "chef";
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isChef ? "justify-start" : "justify-end"}`}>
              {isChef && (
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200/80 bg-white flex items-center justify-center flex-shrink-0">
                  <img 
                    src={chefLogo} 
                    alt="AI Chef" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="max-w-[80%] flex flex-col">
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isChef
                      ? "bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-3xs"
                      : "bg-amber-500 text-white rounded-tr-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span className={`text-[9px] text-gray-400 mt-1 ${!isChef ? "text-right" : ""}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs flex-shrink-0 font-bold animate-pulse">
              👨‍🍳
            </div>
            <div className="bg-white text-gray-400 border border-gray-100 p-3 rounded-2xl text-xs rounded-tl-none shadow-3xs flex items-center gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce delay-100">●</span>
              <span className="animate-bounce delay-200">●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggest helper questions */}
      {messages.length < 4 && !isLoading && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Ask ideas:
          </span>
          <div className="flex flex-col gap-1.5">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                id={`quick-chat-q-${idx}`}
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-left text-[11px] bg-white hover:bg-amber-50 hover:text-amber-800 border border-gray-150 p-2 rounded-lg text-gray-600 font-medium transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer message editor */}
      <div className="p-3 border-t border-gray-150 bg-white">
        <div className="flex gap-2">
          <input
            id="chat-input-text"
            type="text"
            placeholder="Ask something..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 bg-gray-50 focus:bg-white text-xs rounded-xl border border-gray-250 focus:border-amber-500 focus:outline-none transition-all"
          />
          <button
            id="btn-send-chat-message"
            onClick={() => handleSendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className={`p-2.5 rounded-xl text-white transition-all flex items-center justify-center cursor-pointer ${
              !inputText.trim() || isLoading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 active:scale-95"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
