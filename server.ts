import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Shared Gemini API setup (server-side only)
const apiKey = process.env.GEMINI_API_KEY;

// Create standard Gemini client with appropriate telemetry header
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiEnabled: !!ai });
  });

  // AI Theme Generator Endpoint using Gemini
  app.post("/api/ai-theme", async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "A valid textual prompt is required." });
      }

      if (!ai) {
        // Fallback gracefully if API Key is not set yet in environment
        return res.status(503).json({
          error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.",
          fallback: {
            title: "Default Cyberpunk (No API Key)",
            colors: ["#ff007f", "#00f0ff", "#ffe600"],
            glowColor: "#00f0ff",
            fftSize: 256,
            particleCount: 600,
            speedMultiplier: 1.2,
            mode: "particle-storm",
            bassSensitivity: 1.3,
            midSensitivity: 1.0,
            trebleSensitivity: 1.0,
            glowIntensity: 1.5,
            explanation: "API Key is missing. This is a local cyberpunk backup styling.",
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Design a high-fidelity visualizer configuration based on the user's aesthetic mood, music genre, or text description: "${prompt}"`,
        config: {
          systemInstruction: `You are an elite synesthesia designer and visual stylist for a real-time high-performance music visualizer. 
Your job is to translate a user's description of music, atmosphere, or aesthetic mood into a precise, beautifully harmonized set of visualizer configurations and color schemas.
Be creative! Choose highly specific, vivid, glowing colors. Mix modes wisely:
- 'circular-ring': Best for geometric, structured, ambient, orchestral, acoustic, or vocal music.
- '3d-terrain': Best for progressive house, deep house, rolling basslines, journey music, epic cinematic tracks.
- 'particle-storm': Best for fast-paced music, electronic, heavy synth, dubstep, hyperpop, chaotic or energetic tracks.
- 'synthwave-horizon': Best for retro synth, lo-fi beats, 80s pop, chillwave, lounge tracks.
- 'kaleidoscope': Best for psychedelic, instrumental rock, trance, dream pop, multi-layered complex soundscapes.

Return the configuration strictly as a JSON object matching the provided schema.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A short, stylized 2-3 word name for this generated visual style.",
              },
              colors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Three beautiful, high-contrast hex color codes matching the theme (e.g. ['#ff0055', '#00ffcc', '#aa00ff']) used for rendering gradients and particle particles.",
              },
              glowColor: {
                type: Type.STRING,
                description: "A single hex color code used as the main neon glow highlight.",
              },
              fftSize: {
                type: Type.INTEGER,
                description: "FFT size (audio frequency resolution). Must be exactly one of: 128, 256, 512, 1024. Pick larger sizes for detailed, slow music; smaller sizes for high-tempo, heavy beats.",
              },
              particleCount: {
                type: Type.INTEGER,
                description: "Number of particles to render. Range: 200 to 1200.",
              },
              speedMultiplier: {
                type: Type.NUMBER,
                description: "Speed multiplier for animations/rotations. Range: 0.4 (chill/slow) to 2.5 (frenetic/fast).",
              },
              mode: {
                type: Type.STRING,
                description: "The visualizer engine mode. Must be exactly one of: 'circular-ring', '3d-terrain', 'particle-storm', 'synthwave-horizon', 'kaleidoscope'.",
              },
              bassSensitivity: {
                type: Type.NUMBER,
                description: "Bass reactive scaling. Range: 0.5 to 2.0.",
              },
              midSensitivity: {
                type: Type.NUMBER,
                description: "Mids reactive scaling. Range: 0.5 to 2.0.",
              },
              trebleSensitivity: {
                type: Type.NUMBER,
                description: "Treble reactive scaling. Range: 0.5 to 2.0.",
              },
              glowIntensity: {
                type: Type.NUMBER,
                description: "Glow opacity and density factor. Range: 0.5 to 3.0.",
              },
              explanation: {
                type: Type.STRING,
                description: "A single, highly imaginative, poetic sentence explaining how the visual choices reflect the requested theme or music.",
              },
            },
            required: [
              "title",
              "colors",
              "glowColor",
              "fftSize",
              "particleCount",
              "speedMultiplier",
              "mode",
              "bassSensitivity",
              "midSensitivity",
              "trebleSensitivity",
              "glowIntensity",
              "explanation",
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini API");
      }

      const generatedConfig = JSON.parse(responseText.trim());
      res.json(generatedConfig);
    } catch (error: any) {
      console.error("AI Theme generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI visualizer theme" });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite dev server middleware");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving static files from ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running at http://0.0.0.0:${PORT} (Production: ${process.env.NODE_ENV === "production"})`);
  });
}

startServer();
