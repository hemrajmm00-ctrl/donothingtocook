/**
 * Shared Type Definitions for CookGPT
 */

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  durationMinutes?: number; // Optional timer for this step
  tip?: string; // Optional chef's tip for this specific step
}

export interface NutritionInfo {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  dietaryTags: string[];
  ingredients: Ingredient[];
  equipment: string[];
  steps: RecipeStep[];
  nutrition: NutritionInfo;
  chefTips: string[];
  wineOrDrinkPairing?: string;
  imageGenerated?: boolean;
  imageUrl?: string;
}

export interface PantryIdea {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  matchingIngredientsUsed: string[];
  cuisineType: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "chef";
  text: string;
  timestamp: string;
}
