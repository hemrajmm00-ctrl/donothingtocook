import React, { useState, useEffect } from "react";
import { Sparkles, Compass, Flame, ShieldAlert, Heart, Trophy, Clock } from "lucide-react";
import { PantryIdea, Recipe } from "../types";

interface RecipeGeneratorProps {
  selectedIdea: PantryIdea | null;
  onClearIdea: () => void;
  onRecipeGenerated: (recipe: Recipe) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const CUISINES = [
  "Any Cuisine", "Italian", "Mexican", "Japanese", "Indian", "Mediterranean", 
  "French", "Thai", "American", "Spanish", "Korean", "Middle Eastern"
];

const DIETARY_PLANS = [
  { id: "Vegan", label: "Vegan", icon: "🌱" },
  { id: "Vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "Gluten-Free", label: "Gluten-Free", icon: "🌾" },
  { id: "Dairy-Free", label: "Dairy-Free", icon: "🥛" },
  { id: "Keto", label: "Keto / Low-Carb", icon: "🥑" },
  { id: "Nut-Free", label: "Nut-Free", icon: "🥜" },
];

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const TIMES = ["Any Time", "Under 15 mins", "Under 30 mins", "Under 60 mins", "2+ Hours"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function RecipeGenerator({
  selectedIdea,
  onClearIdea,
  onRecipeGenerated,
  isLoading,
  setIsLoading,
}: RecipeGeneratorProps) {
  const [manualTitle, setManualTitle] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("Any Cuisine");
  const [dietary, setDietary] = useState<string[]>([]);
  const [mealType, setMealType] = useState("Dinner");
  const [time, setTime] = useState("Any Time");
  const [difficulty, setDifficulty] = useState("Easy");
  const [error, setError] = useState<string | null>(null);

  // Sync state if a PantryIdea is selected
  useEffect(() => {
    if (selectedIdea) {
      setManualTitle(selectedIdea.title);
      setSelectedCuisine(selectedIdea.cuisineType);
      // Try to estimate or match some parameters
      if (selectedIdea.estimatedTime.includes("15") || selectedIdea.estimatedTime.includes("10")) {
        setTime("Under 15 mins");
      } else if (selectedIdea.estimatedTime.includes("30") || selectedIdea.estimatedTime.includes("20")) {
        setTime("Under 30 mins");
      } else {
        setTime("Under 60 mins");
      }
    }
  }, [selectedIdea]);

  const toggleDietary = (id: string) => {
    if (dietary.includes(id)) {
      setDietary(dietary.filter((d) => d !== id));
    } else {
      setDietary([...dietary, id]);
    }
  };

  const handleGenerateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const recipeTitle = selectedIdea ? selectedIdea.title : manualTitle;

    try {
      const response = await fetch("/api/recipe/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipeTitle || undefined,
          cuisine: selectedCuisine === "Any Cuisine" ? undefined : selectedCuisine,
          dietaryRestrictions: dietary,
          mealType,
          timeAvailable: time === "Any Time" ? undefined : time,
          skillLevel: difficulty,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to craft your recipe.");
      }

      const data = await response.json();
      if (!data.recipe) {
        throw new Error("No recipe was returned by the master chef.");
      }
      onRecipeGenerated(data.recipe);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to CookGPT server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="recipe-generator" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Recipe Crafting Engine</h2>
          <p className="text-xs text-gray-500">Fine-tune options to generate precise, interactive step-by-step recipes.</p>
        </div>
      </div>

      <form onSubmit={handleGenerateRecipe} className="space-y-5">
        {/* Active Idea / Title Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            What are we cooking?
          </label>
          {selectedIdea ? (
            <div id="selected-idea-indicator" className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{selectedIdea.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-amber-900 leading-tight">
                    {selectedIdea.title}
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium">
                    Pantry Match • {selectedIdea.cuisineType}
                  </div>
                </div>
              </div>
              <button
                id="btn-remove-selected-idea"
                type="button"
                onClick={onClearIdea}
                className="p-1.5 hover:bg-amber-100/60 rounded-lg text-amber-700 transition-colors cursor-pointer"
                title="Use custom title instead"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <input
              id="manual-title-input"
              type="text"
              placeholder="e.g., Avocado Cream Pasta, Garlic Glazed Salmon, Beef Wellington..."
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-sm rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-none transition-all"
            />
          )}
        </div>

        {/* Cuisine Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Cuisine Flavor Profile
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {CUISINES.slice(0, 6).map((cuisine) => (
              <button
                id={`cuisine-btn-${cuisine.toLowerCase().replace(/\s+/g, '-')}`}
                key={cuisine}
                type="button"
                onClick={() => setSelectedCuisine(cuisine)}
                className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all truncate cursor-pointer ${
                  selectedCuisine === cuisine
                    ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                    : "bg-gray-50/50 hover:bg-gray-100/70 border-gray-200 text-gray-700"
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
          {/* Custom dropdown for other options if they want more */}
          <select
            id="cuisine-select-more"
            value={CUISINES.includes(selectedCuisine) ? selectedCuisine : "Other"}
            onChange={(e) => {
              if (e.target.value !== "Other") {
                setSelectedCuisine(e.target.value);
              }
            }}
            className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:border-amber-500"
          >
            <option value="" disabled>More Cuisines...</option>
            {CUISINES.map((cuisine) => (
              <option key={cuisine} value={cuisine}>
                {cuisine}
              </option>
            ))}
          </select>
        </div>

        {/* Dietary Plans */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Dietary Constraints & Goals
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_PLANS.map((plan) => {
              const isSelected = dietary.includes(plan.id);
              return (
                <button
                  id={`dietary-btn-${plan.id.toLowerCase()}`}
                  key={plan.id}
                  type="button"
                  onClick={() => toggleDietary(plan.id)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                      : "bg-gray-50/50 hover:bg-gray-100/70 border-gray-200 text-gray-600"
                  }`}
                >
                  <span className="text-sm leading-none">{plan.icon}</span>
                  <span>{plan.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid for meal type, time limit, skill level */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Meal Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Meal Timing
            </label>
            <select
              id="meal-type-select"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-amber-500 transition-colors"
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Time Available */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Time Available
            </label>
            <select
              id="time-select"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-amber-500 transition-colors"
            >
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Cooking Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Difficulty
            </label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-amber-500 transition-colors"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Action */}
        <button
          id="btn-generate-recipe"
          type="submit"
          disabled={isLoading || (!selectedIdea && !manualTitle)}
          className={`w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
            isLoading || (!selectedIdea && !manualTitle)
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10 active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              Craft Custom Interactive Recipe
            </>
          )}
        </button>

        {error && (
          <div id="recipe-error" className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex flex-col gap-1.5">
            <span className="font-semibold">Failed to Generate Recipe:</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}

import { X } from "lucide-react";
