import React, { useState, useEffect } from "react";
import { 
  ChefHat, Sparkles, Flame, MessageSquare, Compass, UtensilsCrossed, 
  BookOpen, Star, HelpCircle, Heart, CheckCircle2, ShoppingBag, Coffee, CookingPot
} from "lucide-react";
import PantryHelper from "./components/PantryHelper";
import RecipeGenerator from "./components/RecipeGenerator";
import RecipeDisplay from "./components/RecipeDisplay";
import ChefChat from "./components/ChefChat";
import { PantryIdea, Recipe } from "./types";

const chefLogo = new URL("./assets/images/chef_logo_1784042631401.jpg", import.meta.url).href;

const TRENDING_PRESETS = [
  { title: "Truffle Mushroom Risotto", cuisine: "Italian", emoji: "🍄", desc: "Creamy, buttery arborio rice infused with gourmet earthy mushrooms and truffle oil.", difficulty: "Medium" },
  { title: "Garlic Butter Glazed Salmon", cuisine: "American", emoji: "🐟", desc: "Pan-seared crisp salmon fillets drenched in garlic lemon herb butter.", difficulty: "Easy" },
  { title: "Authentic Shrimp Pad Thai", cuisine: "Thai", emoji: "🍤", desc: "Classic stir-fried rice noodles with sweet-savory tamarind glaze, egg, sprouts, and peanuts.", difficulty: "Medium" },
  { title: "Gooey Molten Chocolate Lava", cuisine: "Dessert", emoji: "🍫", desc: "Rich single-portion decadent chocolate cake with a warm flowing fudge center.", difficulty: "Easy" }
];

const LOADING_MESSAGES = [
  "👩‍🍳 Consulting the secret spice archives...",
  "🔥 Calibrating oven temperature to perfection...",
  "🥣 Whisking the batter with absolute vigor...",
  "🍋 Squeezing fresh organic citrus fruits...",
  "🧂 Adding a perfect chef's pinch of flaky sea salt...",
  "🥘 Tasting the sauce and adjusting seasoning...",
  "🍷 Finding the perfect sommelier pairing..."
];

export default function App() {
  const [selectedIdea, setSelectedIdea] = useState<PantryIdea | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Loading states
  const [isPantryLoading, setIsPantryLoading] = useState(false);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  // Cycling loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecipeLoading) {
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isRecipeLoading]);

  // Handle preset recipe quick click
  const handlePresetClick = async (preset: typeof TRENDING_PRESETS[0]) => {
    setIsRecipeLoading(true);
    setSelectedIdea(null);
    setGeneratedRecipe(null);

    try {
      const response = await fetch("/api/recipe/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preset.title,
          cuisine: preset.cuisine,
          skillLevel: preset.difficulty,
          mealType: preset.cuisine === "Dessert" ? "Dessert" : "Dinner"
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Could not generate recipe.");
      }

      const data = await response.json();
      if (data.recipe) {
        setGeneratedRecipe(data.recipe);
      }
    } catch (err) {
      console.error(err);
      alert("Error generating recipe. Please verify your GEMINI_API_KEY is configured.");
    } finally {
      setIsRecipeLoading(false);
    }
  };

  const handleSelectIdea = (idea: PantryIdea) => {
    setSelectedIdea(idea);
    // Clear recipe when changing ideas so user knows they need to click generate
    setGeneratedRecipe(null);
    // Auto scroll to generator form
    const generatorEl = document.getElementById("recipe-generator");
    generatorEl?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="cookgpt-app" className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col antialiased">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-150/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-gray-200/60 flex items-center justify-center bg-white">
              <img 
                src={chefLogo} 
                alt="Do Nothing To Cook Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Do Nothing To Cook</h1>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">v3.5</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Your Interactive AI Culinary Companion & Sous Chef</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick check for API key (Informational) */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-100/70 border border-gray-200 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              AI Chef Brain: Connected
            </span>

            <button
              id="btn-nav-chef-chat"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 active:scale-97 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Ask Chef</span>
              {generatedRecipe && (
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
          {/* Left Panel: Recipe Controls (Pantry input + Config Generator) */}
          <div className="lg:col-span-4 space-y-6">
            <PantryHelper
              onSelectIdea={handleSelectIdea}
              isLoading={isPantryLoading}
              setIsLoading={setIsPantryLoading}
            />

            <RecipeGenerator
              selectedIdea={selectedIdea}
              onClearIdea={() => setSelectedIdea(null)}
              onRecipeGenerated={(recipe) => {
                setGeneratedRecipe(recipe);
                // Scroll down to display on mobile
                setTimeout(() => {
                  const displayEl = document.getElementById(`recipe-display-${recipe.id}`);
                  displayEl?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              isLoading={isRecipeLoading}
              setIsLoading={setIsRecipeLoading}
            />
          </div>

          {/* Right Panel: Recipe Display & Cooking Board */}
          <div className="lg:col-span-8">
            {isRecipeLoading ? (
              /* Custom Culinary Loading State */
              <div id="recipe-loader" className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[450px]">
                <div className="relative mb-6">
                  {/* Decorative rotating pot */}
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100/50 animate-bounce">
                    <CookingPot className="w-10 h-10" />
                  </div>
                  <div className="absolute top-0 right-0 p-1.5 bg-amber-500 rounded-full text-white animate-spin">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">The AI Chef is in the Kitchen</h3>
                <p className="text-sm font-semibold text-amber-700 animate-pulse max-w-md h-6">
                  {LOADING_MESSAGES[loadingMessageIdx]}
                </p>
                <div className="w-64 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-6">
                  <div className="bg-amber-500 h-full animate-progress rounded-full" style={{ width: "65%" }}></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider">Taking ~10-15 seconds to formulate the gastronomy</p>
              </div>
            ) : generatedRecipe ? (
              /* High Fidelity Interactive Recipe Display */
              <RecipeDisplay
                recipe={generatedRecipe}
                onOpenChat={() => setIsChatOpen(true)}
              />
            ) : (
              /* Delightful Empty State / Discover presets board */
              <div id="recipe-welcome-board" className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs min-h-[500px] flex flex-col justify-between">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Your Culinary Masterpiece Awaits</h2>
                  <p className="text-sm text-gray-500 max-w-lg mx-auto mt-2 leading-relaxed">
                    Enter ingredients on the left, refine your style settings, or tap one of our trending gourmet recipes below to begin an interactive kitchen session.
                  </p>
                </div>

                {/* Trending preset recipes */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Trending Gourmet Presets</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {TRENDING_PRESETS.map((preset) => (
                      <button
                        id={`preset-card-${preset.title.toLowerCase().replace(/\s+/g, '-')}`}
                        key={preset.title}
                        onClick={() => handlePresetClick(preset)}
                        className="group text-left border border-gray-100 hover:border-amber-200 bg-gray-50/50 hover:bg-amber-50/10 p-4 rounded-xl transition-all duration-200 cursor-pointer flex gap-3.5"
                      >
                        <div className="text-2xl p-2.5 bg-white rounded-xl border border-gray-150/60 shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
                          {preset.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900 group-hover:text-amber-800 transition-colors truncate">
                              {preset.title}
                            </h4>
                            <span className="text-[9px] bg-white text-gray-400 font-semibold border border-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              {preset.difficulty}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-normal">
                            {preset.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aesthetic design credits/footprint */}
                <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    Crafted with Michelin Standards
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                    Interactive Cooking Timers Included
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-out Coach chat panel */}
      <ChefChat
        activeRecipe={generatedRecipe}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
