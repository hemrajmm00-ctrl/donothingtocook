import React, { useState } from "react";
import { Plus, X, Sparkles, ChefHat, Clock, Compass } from "lucide-react";
import { PantryIdea } from "../types";

interface PantryHelperProps {
  onSelectIdea: (idea: PantryIdea) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const COMMON_INGREDIENTS = [
  "Chicken Breast", "Eggs", "Tomato", "Garlic", "Onion", 
  "Cheese", "Spinach", "Pasta", "Rice", "Potatoes", 
  "Salmon", "Avocado", "Lemon", "Mushrooms", "Bell Pepper"
];

export default function PantryHelper({ onSelectIdea, isLoading, setIsLoading }: PantryHelperProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [ideas, setIdeas] = useState<PantryIdea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (ingredients.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    setIngredients([...ingredients, trimmed]);
    setInputValue("");
    setError(null);
  };

  const handleRemoveIngredient = (indexToRemove: number) => {
    setIngredients(ingredients.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIngredient(inputValue);
    }
  };

  const handleBrainstorm = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient first!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIdeas([]);

    try {
      const res = await fetch("/api/pantry-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate ideas.");
      }

      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while connecting to CookGPT.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="pantry-helper" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
          <ChefHat className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Fridge & Pantry Helper</h2>
          <p className="text-xs text-gray-500">Input what you have, and CookGPT will invent recipes for you.</p>
        </div>
      </div>

      {/* Input section */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            id="ingredient-input"
            type="text"
            placeholder="Add e.g., Chicken, Zucchini, Cream..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-sm rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-none transition-colors"
          />
          <button
            id="btn-add-ingredient"
            onClick={() => handleAddIngredient(inputValue)}
            disabled={isLoading}
            className="p-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Add Ingredient"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Tags */}
        <div>
          <span className="text-xs font-medium text-gray-400 block mb-2">Quick Add Suggestions:</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {COMMON_INGREDIENTS.filter(item => !ingredients.some(i => i.toLowerCase() === item.toLowerCase())).map((item) => (
              <button
                id={`quick-add-${item.toLowerCase().replace(/\s+/g, '-')}`}
                key={item}
                onClick={() => handleAddIngredient(item)}
                disabled={isLoading}
                className="text-xs bg-gray-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Ingredients List */}
        {ingredients.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-700">Your Ingredients ({ingredients.length}):</span>
              <button
                id="btn-clear-ingredients"
                onClick={() => setIngredients([])}
                className="text-xs text-rose-500 hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-amber-50/70 border border-amber-100 text-amber-900 text-xs font-medium px-2.5 py-1 rounded-lg"
                >
                  {ing}
                  <button
                    id={`remove-ing-${idx}`}
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="text-amber-600 hover:text-amber-900 p-0.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brainstorm Button */}
        <button
          id="btn-brainstorm"
          onClick={handleBrainstorm}
          disabled={isLoading || ingredients.length === 0}
          className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
            ingredients.length === 0 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/10 active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Brainstorm Recipe Ideas
            </>
          )}
        </button>

        {error && (
          <div id="pantry-error" className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <div className="font-semibold">Error:</div>
            <div>{error}</div>
          </div>
        )}
      </div>

      {/* Recommended Ideas Board */}
      {ideas.length > 0 && (
        <div id="ideas-board" className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Recommended for You</span>
          </div>
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                id={`idea-card-${idea.id}`}
                key={idea.id}
                onClick={() => onSelectIdea(idea)}
                className="group border border-gray-100 hover:border-amber-200 bg-gray-50/40 hover:bg-amber-50/10 p-3.5 rounded-xl transition-all duration-200 cursor-pointer flex gap-3.5 items-start relative hover:shadow-xs"
              >
                <div className="text-2xl p-2 bg-white rounded-xl border border-gray-100 shadow-2xs flex-shrink-0 group-hover:scale-110 transition-transform">
                  {idea.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-amber-800 transition-colors truncate">
                      {idea.title}
                    </h3>
                    <span className="text-[10px] font-medium bg-white text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3 text-amber-500" /> {idea.estimatedTime}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {idea.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                      {idea.cuisineType}
                    </span>
                    {idea.matchingIngredientsUsed.slice(0, 3).map((ing, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                        ✓ {ing}
                      </span>
                    ))}
                    {idea.matchingIngredientsUsed.length > 3 && (
                      <span className="text-[10px] text-gray-400 px-1 py-0.5 font-medium">
                        +{idea.matchingIngredientsUsed.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
