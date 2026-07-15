import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, Flame, Users, Trophy, Sparkles, Check, CheckSquare, Square, 
  RotateCcw, Play, Pause, Compass, MessageSquare, ListTodo, HelpCircle, AlertTriangle, Image as ImageIcon
} from "lucide-react";
import { Recipe } from "../types";

interface RecipeDisplayProps {
  recipe: Recipe;
  onOpenChat: () => void;
}

interface StepTimer {
  timeLeft: number; // in seconds
  isRunning: boolean;
  totalDuration: number; // in seconds
  isCompleted: boolean;
}

export default function RecipeDisplay({ recipe, onOpenChat }: RecipeDisplayProps) {
  // Prep checklist state
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [checkedEquipment, setCheckedEquipment] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Timers state - maps stepNumber -> timer state
  const [timers, setTimers] = useState<Record<number, StepTimer>>({});

  // Image state
  const [imageUrl, setImageUrl] = useState<string | undefined>(recipe.imageUrl);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Synchronous interval for all running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let updated = false;

        Object.keys(next).forEach((key) => {
          const stepNum = parseInt(key, 10);
          const timer = next[stepNum];
          if (timer.isRunning && timer.timeLeft > 0) {
            next[stepNum] = {
              ...timer,
              timeLeft: timer.timeLeft - 1,
            };
            updated = true;

            // Trigger chime if just completed
            if (next[stepNum].timeLeft === 0) {
              next[stepNum].isRunning = false;
              next[stepNum].isCompleted = true;
              playChime();
            }
          }
        });

        return updated ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync image if recipe changes
  useEffect(() => {
    setImageUrl(recipe.imageUrl);
    setImageError(null);
    setTimers({}); // Reset timers for new recipe
    setCheckedIngredients([]);
    setCheckedEquipment([]);
    setCompletedSteps([]);
  }, [recipe]);

  // Self-contained synthesizer chime when a timer hits zero
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      // CookGPT chime (A chime sequence: C5 to G5)
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
      
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.warn("Chime play error:", err);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const response = await fetch("/api/recipe/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: recipe.title, 
          description: recipe.description 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.isPaidFlowError) {
          throw new Error("This high-fidelity image generator model requires a paid API key configured in AI Studio. Please set it up in Settings > Secrets to unlock gourmet visual generations.");
        }
        throw new Error(data.error || "Could not generate recipe picture.");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        throw new Error("No image data returned from generator.");
      }
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || "Something went wrong while drawing the dish.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Toggle ingredient checklist
  const toggleIngredient = (name: string) => {
    if (checkedIngredients.includes(name)) {
      setCheckedIngredients(checkedIngredients.filter((i) => i !== name));
    } else {
      setCheckedIngredients([...checkedIngredients, name]);
    }
  };

  // Toggle equipment checklist
  const toggleEquipment = (item: string) => {
    if (checkedEquipment.includes(item)) {
      setCheckedEquipment(checkedEquipment.filter((i) => i !== item));
    } else {
      setCheckedEquipment([...checkedEquipment, item]);
    }
  };

  // Toggle step complete
  const toggleStepCompleted = (stepNum: number) => {
    if (completedSteps.includes(stepNum)) {
      setCompletedSteps(completedSteps.filter((s) => s !== stepNum));
    } else {
      setCompletedSteps([...completedSteps, stepNum]);
    }
  };

  // Timer actions
  const startTimer = (stepNum: number, durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    setTimers((prev) => ({
      ...prev,
      [stepNum]: {
        timeLeft: prev[stepNum]?.timeLeft ?? durationSeconds,
        totalDuration: durationSeconds,
        isRunning: true,
        isCompleted: false,
      },
    }));
  };

  const pauseTimer = (stepNum: number) => {
    setTimers((prev) => ({
      ...prev,
      [stepNum]: {
        ...prev[stepNum],
        isRunning: false,
      },
    }));
  };

  const resetTimer = (stepNum: number, durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    setTimers((prev) => ({
      ...prev,
      [stepNum]: {
        timeLeft: durationSeconds,
        totalDuration: durationSeconds,
        isRunning: false,
        isCompleted: false,
      },
    }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div id={`recipe-display-${recipe.id}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
      {/* Recipe Hero Banner */}
      <div className="relative h-64 md:h-80 bg-slate-900 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            id="recipe-gourmet-image"
            src={imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover opacity-90 transition-opacity"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 to-orange-950/95 flex flex-col items-center justify-center p-6 text-center">
            <span className="text-4xl mb-3">🍳</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">CookGPT Presentation</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">{recipe.title}</h1>
            <p className="text-xs text-amber-200/80 max-w-md mt-2 line-clamp-2">{recipe.description}</p>
            
            {/* Generate Image Trigger */}
            <button
              id="btn-generate-food-photo"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="mt-5 px-4 py-2 bg-white/10 hover:bg-white/20 hover:scale-102 active:scale-98 border border-white/25 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
            >
              {isGeneratingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Photo...
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  Generate Finished Dish Photo
                </>
              )}
            </button>
          </div>
        )}

        {/* Floating Tags Overlay if image is loaded */}
        {imageUrl && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-white max-w-[80%]">
              <h1 className="text-base md:text-lg font-bold leading-tight truncate">{recipe.title}</h1>
              <p className="text-[10px] text-gray-300 truncate mt-0.5">{recipe.cuisine} Cuisine</p>
            </div>
            <button
              id="btn-re-generate-photo"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white border border-white/10 transition-colors cursor-pointer"
              title="Regenerate food image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Image Generation Error Display */}
      {imageError && (
        <div id="image-gen-error" className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Image Generation Info:</span>
            <span>{imageError}</span>
          </div>
        </div>
      )}

      {/* Main Recipe Info Panel */}
      <div className="p-6">
        {/* Quick details block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Prep Time</span>
              <span className="text-xs font-bold text-gray-800">{recipe.prepTimeMinutes} mins</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Cook Time</span>
              <span className="text-xs font-bold text-gray-800">{recipe.cookTimeMinutes} mins</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Servings</span>
              <span className="text-xs font-bold text-gray-800">{recipe.servings} people</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Trophy className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Difficulty</span>
              <span className="text-xs font-bold text-gray-800">{recipe.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Dietary Labels */}
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {recipe.dietaryTags.map((tag, idx) => (
              <span key={idx} className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full">
                🌱 {tag}
              </span>
            ))}
            <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1 rounded-full">
              🍽️ {recipe.cuisine} Style
            </span>
          </div>
        )}

        {/* Bento Nutritional Breakdown */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            Nutritional Facts (Per Serving)
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100 text-center">
              <span className="text-lg font-extrabold text-amber-800 block">{recipe.nutrition.calories}</span>
              <span className="text-[9px] font-bold text-amber-600 uppercase">Calories</span>
            </div>
            <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 text-center">
              <span className="text-lg font-extrabold text-emerald-800 block">{recipe.nutrition.proteinGrams}g</span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Protein</span>
            </div>
            <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-center">
              <span className="text-lg font-extrabold text-blue-800 block">{recipe.nutrition.carbsGrams}g</span>
              <span className="text-[9px] font-bold text-blue-600 uppercase font-mono">Carbs</span>
            </div>
            <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100 text-center">
              <span className="text-lg font-extrabold text-rose-800 block">{recipe.nutrition.fatGrams}g</span>
              <span className="text-[9px] font-bold text-rose-600 uppercase">Fat</span>
            </div>
          </div>
        </div>

        {/* Prep Board (Ingredients & Equipment) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Ingredients Needed (7 cols) */}
          <div className="md:col-span-7">
            <div className="flex items-center gap-2 mb-3">
              <ListTodo className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-800">Ingredients Checklist</h3>
            </div>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-gray-50/10 p-2">
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients.includes(ing.name);
                return (
                  <button
                    id={`ing-check-${idx}`}
                    key={idx}
                    type="button"
                    onClick={() => toggleIngredient(ing.name)}
                    className="w-full text-left py-2.5 px-3 flex items-center justify-between group hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-0.5 rounded-md transition-colors ${isChecked ? "bg-amber-500 text-white" : "text-gray-300"}`}>
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs text-gray-700 font-medium truncate ${isChecked ? "line-through text-gray-400" : ""}`}>
                        {ing.name}
                      </span>
                    </div>
                    <span className="text-xs bg-white text-gray-600 font-semibold border border-gray-100 px-2 py-0.5 rounded-md flex-shrink-0">
                      {ing.amount} {ing.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kitchen Equipment (5 cols) */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-800">Kitchen Tools</h3>
            </div>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-gray-50/10 p-2">
              {recipe.equipment.map((item, idx) => {
                const isChecked = checkedEquipment.includes(item);
                return (
                  <button
                    id={`equip-check-${idx}`}
                    key={idx}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className="w-full text-left py-2.5 px-3 flex items-center gap-2.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className={`transition-colors ${isChecked ? "text-amber-500" : "text-gray-300"}`}>
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs text-gray-600 font-medium ${isChecked ? "line-through text-gray-400 font-normal" : ""}`}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step-By-Step Directions */}
        <div className="mb-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Cooking Instructions
          </h3>
          <div className="space-y-4">
            {recipe.steps.map((step) => {
              const isCompleted = completedSteps.includes(step.stepNumber);
              const timer = timers[step.stepNumber];
              const hasDuration = typeof step.durationMinutes === "number" && step.durationMinutes > 0;

              return (
                <div
                  id={`step-container-${step.stepNumber}`}
                  key={step.stepNumber}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    isCompleted 
                      ? "bg-gray-50/50 border-gray-100 opacity-60" 
                      : "bg-white border-gray-100 hover:border-amber-200 shadow-3xs"
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Checkmark circle */}
                    <button
                      id={`step-complete-btn-${step.stepNumber}`}
                      onClick={() => toggleStepCompleted(step.stepNumber)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-gray-200 text-gray-400 hover:border-amber-400 hover:text-amber-600"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                    </button>

                    <div className="flex-1">
                      <p className={`text-xs text-gray-800 leading-relaxed font-medium ${isCompleted ? "line-through text-gray-400" : ""}`}>
                        {step.instruction}
                      </p>

                      {/* Display Step Tip if available */}
                      {step.tip && !isCompleted && (
                        <div className="mt-2.5 p-2 bg-amber-50/40 rounded-lg text-[11px] text-amber-800 border-l-2 border-amber-400 font-medium">
                          💡 Chef Tip: {step.tip}
                        </div>
                      )}

                      {/* Integrated Step Timer */}
                      {hasDuration && step.durationMinutes && (
                        <div className="mt-3.5 flex flex-wrap items-center gap-3 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100 w-fit">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span className="text-xs font-bold font-mono text-gray-700">
                              {timer ? formatTime(timer.timeLeft) : `${step.durationMinutes}:00`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {!timer || !timer.isRunning ? (
                              <button
                                id={`step-${step.stepNumber}-start-timer`}
                                onClick={() => startTimer(step.stepNumber, step.durationMinutes!)}
                                className="p-1 text-gray-500 hover:text-amber-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                                title="Start Timer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            ) : (
                              <button
                                id={`step-${step.stepNumber}-pause-timer`}
                                onClick={() => pauseTimer(step.stepNumber)}
                                className="p-1 text-gray-500 hover:text-amber-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                                title="Pause Timer"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}

                            <button
                              id={`step-${step.stepNumber}-reset-timer`}
                              onClick={() => resetTimer(step.stepNumber, step.durationMinutes!)}
                              className="p-1 text-gray-500 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                              title="Reset Timer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {timer?.isCompleted && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold animate-bounce">
                              🔔 Time's Up!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* General Chef Tips & Wine Pairing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          {/* General Chef Tips */}
          <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-100/60">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> General Chef Secrets
            </h4>
            <ul className="space-y-1.5">
              {recipe.chefTips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-600 list-disc list-inside">
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Beverage Pairing */}
          {recipe.wineOrDrinkPairing && (
            <div className="bg-orange-50/10 p-4 rounded-xl border border-orange-100">
              <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                🥂 Sommelier Beverage Pairings
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {recipe.wineOrDrinkPairing}
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Coach Assist CTA */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button
            id="btn-coach-chat-cta"
            onClick={onOpenChat}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all hover:shadow-xs cursor-pointer active:scale-98"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Ask Chef CookGPT for Substitutions & Advice
          </button>
        </div>
      </div>
    </div>
  );
}
