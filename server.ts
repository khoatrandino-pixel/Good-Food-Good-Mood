import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for generating meal plan
  app.post("/api/generate-meal", async (req, res) => {
    const { cookingTime, stoveCount, preferredIngredients, theme, apiData } = req.body;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key không khả dụng trên server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const prompt = `Bạn là một chuyên gia dinh dưỡng, lifestyle coach và product designer dành cho nhân viên văn phòng bận rộn tại Việt Nam.

NHIỆM VỤ:
* Gợi ý 1 bữa ăn gồm 3 món: Tinh bột (carb), Rau (vegetable), Đạm (protein).
* Tối ưu thời gian nấu dựa trên: Thời gian người dùng có (${cookingTime} phút) và Số lượng bếp (${stoveCount} bếp).
* Trả về dữ liệu để render UI theo phong cách: Minimal – Modern Classic.

INPUT:
* Thời gian nấu (phút): ${cookingTime}
* Số lượng bếp: ${stoveCount}
* Nguyên liệu hoặc món mong muốn: ${preferredIngredients || "Không có"}
* Theme giao diện: ${theme}
* Dữ liệu bổ sung từ hệ thống (API Context): ${apiData ? JSON.stringify(apiData) : "Không có"}

YÊU CẦU CHÍNH:
1. Món ăn: Phù hợp người Việt, nguyên liệu dễ tìm, nấu đơn giản, ít bước.
2. Thời gian: Không tính thời gian chờ cơm chín, nấu song song theo số bếp, tổng thời gian thực tế ≤ ${cookingTime}.
3. Dinh dưỡng: Cân bằng carb – rau – đạm, có calories ước tính từng món.
4. Ưu tiên nguyên liệu người dùng: 
   * Nếu có "Nguyên liệu hoặc món mong muốn", hãy cố gắng chọn ít nhất 1–2 món có chứa nguyên liệu đó.
   * Ưu tiên phân bổ vào món đạm hoặc rau.
   * KHÔNG phá vỡ cấu trúc 3 món (carb - rau - đạm).
   * Nếu KHÔNG thể match hoàn toàn hoặc không khả thi trong thời gian, hãy chọn món gần nhất hoặc đảm bảo bữa ăn hợp lý và note rõ trong preference_match.
5. UI/UX: Ngôn ngữ ngắn gọn, tinh tế, không dài dòng, dễ đọc, dễ scan.

HEADER APP:
* Title: "Good Food Good Mood"
* Tagline: 1 câu ngắn tinh tế (≤ 10 từ)

THEME UI:
Dựa trên ${theme}, trả thêm config:
IF theme = "dark":
* background: "#0F0F0F", card: "#1A1A1A", text_primary: "#F5F5F5", text_secondary: "#A0A0A0", accent: "#D4AF37"
IF theme = "pink":
* background: "#FFF1F5", card: "#FFFFFF", text_primary: "#2A2A2A", text_secondary: "#7A7A7A", accent: "#E8A0BF"

Chỉ trả về JSON hợp lệ.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              app_header: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  tagline: { type: Type.STRING }
                },
                required: ["title", "tagline"]
              },
              ui: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  colors: {
                    type: Type.OBJECT,
                    properties: {
                      background: { type: Type.STRING },
                      card: { type: Type.STRING },
                      text_primary: { type: Type.STRING },
                      text_secondary: { type: Type.STRING },
                      accent: { type: Type.STRING }
                    },
                    required: ["background", "card", "text_primary", "text_secondary", "accent"]
                  },
                  style: { type: Type.STRING }
                },
                required: ["theme", "colors", "style"]
              },
              summary: {
                type: Type.OBJECT,
                properties: {
                  total_active_time: { type: Type.NUMBER },
                  fit_within_time: { type: Type.BOOLEAN },
                  note: { type: Type.STRING },
                  preference_match: {
                    type: Type.OBJECT,
                    properties: {
                      matched: { type: Type.BOOLEAN },
                      used_ingredients: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      note: { type: Type.STRING }
                    },
                    required: ["matched", "used_ingredients", "note"]
                  }
                },
                required: ["total_active_time", "fit_within_time", "note", "preference_match"]
              },
              meals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["carb", "vegetable", "protein"] },
                    label_vi: { type: Type.STRING },
                    cook_time: { type: Type.NUMBER },
                    calories: { type: Type.NUMBER },
                    parallelizable: { type: Type.BOOLEAN },
                    short_description: { type: Type.STRING }
                  },
                  required: ["name", "type", "label_vi", "cook_time", "calories", "parallelizable", "short_description"]
                }
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.NUMBER },
                    time_range: { type: Type.STRING },
                    actions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["step", "time_range", "actions"]
                }
              }
            },
            required: ["app_header", "ui", "summary", "meals", "timeline"]
          }
        }
      });

      const data = JSON.parse(response.text);
      res.json(data);
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Không thể thiết kế thực đơn lúc này. Vui lòng thử lại." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
