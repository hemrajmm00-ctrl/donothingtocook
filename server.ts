import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies
app.use(express.json({ limit: "50mb" }));

// Lazy initializer for Google GenAI SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in the Secrets panel in AI Studio Settings.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Robust wrapper for generateContent that implements:
 * 1. Immediate retries on 503/Spike/Overload errors with exponential backoff.
 * 2. Multi-model fallback sequence ('gemini-3.1-flash-lite' and 'gemini-flash-latest') 
 *    on ANY error (demand spikes, unavailability, quota limits, etc.) to guarantee high availability.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: {
    model: string;
    contents: any;
    config?: any;
  }
) {
  const primaryModel = options.model;
  const fallbacks = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Gemini API] Requesting ${primaryModel} (Attempt ${attempt}/2)`);
      return await ai.models.generateContent({
        model: primaryModel,
        contents: options.contents,
        config: options.config,
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || "";
      const isTemporary = errMsg.includes("503") || 
                          errMsg.toLowerCase().includes("demand") || 
                          errMsg.toLowerCase().includes("busy") || 
                          errMsg.toLowerCase().includes("unavailable") || 
                          errMsg.toLowerCase().includes("limit") ||
                          errMsg.toLowerCase().includes("overloaded");

      if (isTemporary && attempt < 2) {
        const delay = attempt * 1500;
        console.log(`[Gemini API] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  // If primary model failed for ANY reason, try the highly stable fallback models
  console.log(`[Gemini API] Primary model ${primaryModel} failed. Attempting fallback sequence to ensure a response...`);
  for (const fallbackModel of fallbacks) {
    if (fallbackModel === primaryModel) continue;
    try {
      console.log(`[Gemini API] Adjusting model to: ${fallbackModel}`);
      return await ai.models.generateContent({
        model: fallbackModel,
        contents: options.contents,
        config: options.config,
      });
    } catch (err: any) {
      console.log(`[Gemini API] Route attempt through ${fallbackModel} was unsuccessful:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError;
}

// -----------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------

/**
 * Health Check API
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", keyAvailable: !!process.env.GEMINI_API_KEY });
});

/**
 * API: Generate Pantry Ideas
 * Suggests 3 appetizing dish ideas based on entered ingredients.
 */
app.post("/api/pantry-ideas", async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || ingredients.length === 0) {
      res.status(400).json({ error: "Please provide some ingredients to suggest ideas." });
      return;
    }

    const ai = getAI();
    const ingredientsList = Array.isArray(ingredients) ? ingredients.join(", ") : ingredients;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `You are CookGPT, an expert AI chef. Based ONLY on these available ingredients: "${ingredientsList}", suggest 3 creative, delicious, and highly appetizing recipe ideas that can be made. For each idea, provide a catchy title, 1-sentence mouth-watering description, estimated time, the ingredients used, the cuisine type, and a representative food emoji. Return the ideas in a structured JSON format.`,
      config: {
        systemInstruction: "You are a professional culinary development chef. You excel at suggesting creative, tasty, and practical meals based on limited pantry ingredients.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique lowercase slug or ID" },
              title: { type: Type.STRING, description: "Catchy, appetizing title" },
              description: { type: Type.STRING, description: "A 1-sentence descriptive summary of the dish" },
              estimatedTime: { type: Type.STRING, description: "E.g., '20 mins', '45 mins'" },
              matchingIngredientsUsed: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Sub-list of user's entered ingredients that are featured in this dish"
              },
              cuisineType: { type: Type.STRING, description: "E.g., Italian, Mexican, Asian Fusion, American" },
              emoji: { type: Type.STRING, description: "A single food or utensil emoji representing the dish" }
            },
            required: ["id", "title", "description", "estimatedTime", "matchingIngredientsUsed", "cuisineType", "emoji"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const ideas = JSON.parse(text.trim());
    res.json({ ideas });
  } catch (err: any) {
    console.error("Error generating pantry ideas:", err);
    res.status(500).json({ error: err.message || "Failed to generate pantry ideas." });
  }
});

/**
 * API: Generate Full Recipe
 * Generates a full, highly-detailed recipe.
 */
app.post("/api/recipe/generate", async (req, res) => {
  try {
    const { 
      title, 
      ingredients, 
      cuisine, 
      dietaryRestrictions, 
      mealType, 
      timeAvailable, 
      skillLevel 
    } = req.body;

    const ai = getAI();

    // Construct custom prompt
    let promptText = `Generate a highly detailed, professional, and culinary-sound recipe. `;
    if (title) {
      promptText += `The recipe is for: "${title}". `;
    } else if (ingredients && ingredients.length > 0) {
      promptText += `The recipe should feature the following key ingredients: ${ingredients.join(", ")}. `;
    }

    if (cuisine) promptText += `Cuisine style: ${cuisine}. `;
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      promptText += `Dietary restrictions / goals to accommodate: ${dietaryRestrictions.join(", ")}. `;
    }
    if (mealType) promptText += `Meal classification: ${mealType}. `;
    if (timeAvailable) promptText += `Maximum total preparation/cooking time: ${timeAvailable}. `;
    if (skillLevel) promptText += `Chef skill difficulty level: ${skillLevel}. `;

    promptText += `Please generate the recipe including title, description, timings, a clear difficulty rating, exact ingredient measurements (with numeric amounts and standard kitchen units), kitchen equipment needed, step-by-step instructions (with optional duration minutes if a step requires timed cooking or simmering), comprehensive macronutrient nutrition estimates per serving, helpful general chef tips, and a beverage pairing suggestion. Provide this as a structured JSON object.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are CookGPT, an elite Michelin-star chef and master culinary instructor. You build recipes that are delicious, functionally correct, and mathematically precise in measurements. All step directions must be extremely easy to follow, detailing techniques clearly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "A unique ID or slug" },
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "A delicious description of the final dish" },
            cuisine: { type: Type.STRING, description: "The style of cuisine" },
            prepTimeMinutes: { type: Type.INTEGER },
            cookTimeMinutes: { type: Type.INTEGER },
            servings: { type: Type.INTEGER },
            difficulty: { type: Type.STRING, description: "Must be 'Easy', 'Medium', or 'Hard'" },
            dietaryTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "E.g., Vegan, Gluten-Free, High-Protein"
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING, description: "E.g., '2', '1/2', '450'" },
                  unit: { type: Type.STRING, description: "E.g., 'pcs', 'tbsp', 'g', 'cups'" }
                },
                required: ["name", "amount", "unit"]
              }
            },
            equipment: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  instruction: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER, description: "Omit or leave blank if there is no specific countdown timer associated with this step (e.g. simmer for 15 mins has durationMinutes: 15, chop onions has none)." },
                  tip: { type: Type.STRING, description: "Optional. Pro tip for this step." }
                },
                required: ["stepNumber", "instruction"]
              }
            },
            nutrition: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.INTEGER },
                proteinGrams: { type: Type.INTEGER },
                carbsGrams: { type: Type.INTEGER },
                fatGrams: { type: Type.INTEGER }
              },
              required: ["calories", "proteinGrams", "carbsGrams", "fatGrams"]
            },
            chefTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            wineOrDrinkPairing: { type: Type.STRING, description: "Suggested drink pairings" }
          },
          required: [
            "id", "title", "description", "cuisine", "prepTimeMinutes", "cookTimeMinutes",
            "servings", "difficulty", "dietaryTags", "ingredients", "equipment", "steps",
            "nutrition", "chefTips"
          ]
        }
      }
    });

    const text = response.text || "{}";
    const recipe = JSON.parse(text.trim());
    res.json({ recipe });
  } catch (err: any) {
    console.error("Error generating recipe:", err);
    res.status(500).json({ error: err.message || "Failed to generate recipe." });
  }
});

/**
 * API: Chef Chat
 * Conversational culinary assistant with context of the current recipe.
 */
app.post("/api/recipe/chat", async (req, res) => {
  try {
    const { messages, activeRecipe } = req.body;
    if (!messages || messages.length === 0) {
      res.status(400).json({ error: "Missing conversation messages." });
      return;
    }

    const ai = getAI();

    // Construct the chat system instruction & prompt based on recipe context
    let recipeContextPrompt = "";
    if (activeRecipe) {
      recipeContextPrompt = `You are discussing the active recipe: "${activeRecipe.title}".
Recipe description: ${activeRecipe.description}
Ingredients: ${activeRecipe.ingredients.map((i: any) => `${i.amount} ${i.unit} ${i.name}`).join(", ")}
Steps: ${activeRecipe.steps.map((s: any) => `${s.stepNumber}. ${s.instruction}`).join(" | ")}
Provide helpful, expert advice, ingredient substitutions (e.g., if they are missing something), culinary techniques, timing advice, or flavor pairings specific to this recipe. Make sure your replies are encouraging, highly knowledgeable, and conversational like a warm master chef. Keep responses relatively concise and focused.`;
    } else {
      recipeContextPrompt = `You are CookGPT, an encouraging, incredibly knowledgeable master chef assistant. Help the user with any cooking questions, meal plans, ingredient substitutions, or basic kitchen queries they have.`;
    }

    // Prepare system instruction and contents
    // Translate message format to Gemini API format if needed, or simply pass a chat log
    const chatHistoryText = messages
      .map((msg: any) => `${msg.sender === "user" ? "User" : "CookGPT"}: ${msg.text}`)
      .join("\n");

    const promptText = `Here is our cooking discussion log so far:\n${chatHistoryText}\n\nCookGPT, write your next highly encouraging, professional chef response directly to the user's last message. Do not prefix your reply with "CookGPT:" or anything else, just reply directly.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: recipeContextPrompt,
        temperature: 0.7,
      }
    });

    const reply = response.text || "I'm sorry, I couldn't formulate a culinary tip for that. What else can I help you cook today?";
    res.json({ reply: reply.trim() });
  } catch (err: any) {
    console.error("Error in chef chat:", err);
    res.status(500).json({ error: err.message || "Failed to fetch response from Chef CookGPT." });
  }
});

/**
 * API: Generate Recipe Image (Paid flow)
 * Generates an appetizing picture of the dish.
 */
app.post("/api/recipe/generate-image", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: "Missing recipe title for image generation." });
      return;
    }

    const ai = getAI();
    const prompt = `A professional, mouth-watering food photography of a completed gourmet dish: "${title}". Description: "${description || 'A gourmet meal'}". Shot on DSLR, high resolution, rustic table setting, elegant plating, soft warm natural lighting, appetizing presentation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    let base64Image = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } else {
      res.status(500).json({ error: "Could not retrieve image data from the generator model." });
    }
  } catch (err: any) {
    console.error("Error generating recipe image:", err);
    res.status(500).json({ 
      error: err.message || "Failed to generate recipe image.",
      isPaidFlowError: err.message?.toLowerCase().includes("premium") || err.message?.toLowerCase().includes("paid")
    });
  }
});

// -----------------------------------------------------------------
// Static File Hosting and Vite Integration
// -----------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static assets from /dist in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CookGPT server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CookGPT server:", err);
});
