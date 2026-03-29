/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  Loader2,
  Moon,
  Heart
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Meal {
  name: string;
  type: 'carb' | 'vegetable' | 'protein';
  label_vi: string;
  cook_time: number;
  calories: number;
  parallelizable: boolean;
  short_description: string;
}

interface TimelineStep {
  step: number;
  time_range: string;
  actions: string[];
}

interface MealPlan {
  app_header: {
    title: string;
    tagline: string;
  };
  ui: {
    theme: 'dark' | 'pink';
    colors: {
      background: string;
      card: string;
      text_primary: string;
      text_secondary: string;
      accent: string;
    };
    style: string;
  };
  summary: {
    total_active_time: number;
    fit_within_time: boolean;
    note: string;
    preference_match: {
      matched: boolean;
      used_ingredients: string[];
      note: string;
    };
  };
  meals: Meal[];
  timeline: TimelineStep[];
}

const AI_MODEL = "gemini-3-flash-preview";

export default function App() {
  const [cookingTime, setCookingTime] = useState<number>(25);
  const [stoveCount, setStoveCount] = useState<number>(2);
  const [preferredIngredients, setPreferredIngredients] = useState<string>("");
  const [theme, setTheme] = useState<'dark' | 'pink'>('dark');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Apply theme colors to body
  useEffect(() => {
    if (result) {
      document.body.style.backgroundColor = result.ui.colors.background;
      document.body.style.color = result.ui.colors.text_primary;
    } else {
      document.body.style.backgroundColor = theme === 'dark' ? '#0F0F0F' : '#FFF1F5';
      document.body.style.color = theme === 'dark' ? '#F5F5F5' : '#2A2A2A';
    }
  }, [result, theme]);

  const generateMealPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
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
        model: AI_MODEL,
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
      setResult(data);

      // Gắn API theo yêu cầu người dùng (Tracking/Logging)
      try {
        const apiBaseUrl = "https://script.google.com/macros/s/AKfycbyi128fynvQ7ODL1ogqtERqjTykYGdpTIUxQt09OptHRAMK40Q58YLjQ36X9o4FRQEhjA/exec";
        const params = new URLSearchParams({
          cooking_time: cookingTime.toString(),
          stove_count: stoveCount.toString(),
          preferred_ingredients: preferredIngredients,
          theme: theme,
          total_calories: data.meals.reduce((acc: number, m: any) => acc + m.calories, 0).toString(),
          total_time: data.summary.total_active_time.toString(),
          note: data.summary.note
        });
        
        fetch(`${apiBaseUrl}?${params.toString()}`, { 
          method: 'GET',
          mode: 'no-cors' 
        }).catch(() => {}); // Silent fail for background logging
      } catch (e) {
        console.warn("External API call failed", e);
      }
    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra khi tạo thực đơn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const currentColors = result?.ui.colors || {
    background: theme === 'dark' ? '#0F0F0F' : '#FFF1F5',
    card: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    text_primary: theme === 'dark' ? '#F5F5F5' : '#2A2A2A',
    text_secondary: theme === 'dark' ? '#A0A0A0' : '#7A7A7A',
    accent: theme === 'dark' ? '#D4AF37' : '#E8A0BF'
  };

  return (
    <div 
      className="min-h-screen pb-24 transition-colors duration-700"
      style={{ backgroundColor: currentColors.background, color: currentColors.text_primary }}
    >
      {/* Header */}
      <header className="pt-20 pb-16 px-8 text-center max-w-3xl mx-auto">
        <motion.h1 
          key={result?.app_header.title || "default-title"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-serif mb-4 tracking-tight"
        >
          {result?.app_header.title || "Good Food Good Mood"}
        </motion.h1>
        <motion.p 
          key={result?.app_header.tagline || "default-tagline"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm uppercase tracking-[0.3em] opacity-40 font-medium italic"
        >
          {result?.app_header.tagline || "Modern Nutrition • Minimal Lifestyle"}
        </motion.p>
      </header>

      <main className="max-w-4xl mx-auto px-8">
        {/* Configuration Section */}
        <section 
          className="rounded-[2.5rem] p-12 mb-20 transition-all duration-500 shadow-sm"
          style={{ backgroundColor: currentColors.card }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-12">
            {/* Left Column */}
            <div className="space-y-12">
              {/* Time Slider */}
              <div className="space-y-8">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Thời gian nấu
                </label>
                <div className="relative pt-2">
                  <input 
                    type="range" 
                    min="10" 
                    max="60" 
                    step="5"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(Number(e.target.value))}
                    className="w-full h-0.5 bg-current opacity-10 rounded-full appearance-none cursor-pointer accent-current"
                    style={{ accentColor: currentColors.accent }}
                  />
                  <div className="flex justify-between items-center mt-6">
                    <span className="text-[10px] opacity-30 font-bold">10P</span>
                    <span className="text-3xl font-serif italic" style={{ color: currentColors.accent }}>{cookingTime} phút</span>
                    <span className="text-[10px] opacity-30 font-bold">60P</span>
                  </div>
                </div>
              </div>

              {/* Preferred Ingredients */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Nguyên liệu / Món mong muốn
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: bò, đậu phụ, cá hồi..."
                  value={preferredIngredients}
                  onChange={(e) => setPreferredIngredients(e.target.value)}
                  className="w-full py-4 bg-transparent border-b border-current opacity-60 focus:opacity-100 outline-none transition-opacity text-sm font-medium placeholder:opacity-30"
                  style={{ borderColor: `${currentColors.text_primary}20` }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Số lượng bếp
                </label>
                <div className="flex gap-4">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setStoveCount(num)}
                      className="flex-1 py-4 rounded-2xl border transition-all duration-300 text-xs font-bold tracking-widest"
                      style={{ 
                        borderColor: stoveCount === num ? currentColors.accent : 'transparent',
                        backgroundColor: stoveCount === num ? `${currentColors.accent}10` : 'transparent',
                        color: stoveCount === num ? currentColors.accent : currentColors.text_secondary
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Chủ đề
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTheme('dark')}
                    className="flex-1 py-4 rounded-2xl border transition-all duration-300 flex items-center justify-center gap-3 text-xs font-bold tracking-widest"
                    style={{ 
                      borderColor: theme === 'dark' ? currentColors.accent : 'transparent',
                      backgroundColor: theme === 'dark' ? `${currentColors.accent}10` : 'transparent',
                      color: theme === 'dark' ? currentColors.accent : currentColors.text_secondary
                    }}
                  >
                    <Moon className="w-3.5 h-3.5" /> DARK
                  </button>
                  <button
                    onClick={() => setTheme('pink')}
                    className="flex-1 py-4 rounded-2xl border transition-all duration-300 flex items-center justify-center gap-3 text-xs font-bold tracking-widest"
                    style={{ 
                      borderColor: theme === 'pink' ? currentColors.accent : 'transparent',
                      backgroundColor: theme === 'pink' ? `${currentColors.accent}10` : 'transparent',
                      color: theme === 'pink' ? currentColors.accent : currentColors.text_secondary
                    }}
                  >
                    <Heart className="w-3.5 h-3.5" /> PINK
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={generateMealPlan}
            disabled={loading}
            className="w-full py-6 rounded-3xl font-bold text-xs uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-4 shadow-lg shadow-current/5"
            style={{ 
              backgroundColor: currentColors.accent, 
              color: theme === 'dark' ? '#000' : '#fff',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Thiết kế thực đơn"
            )}
          </button>
        </section>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-24"
            >
              {/* Summary */}
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <p 
                    className="text-3xl font-serif italic leading-relaxed max-w-2xl mx-auto"
                    style={{ color: currentColors.text_primary }}
                  >
                    "{result.summary.note}"
                  </p>
                  {result.summary.preference_match.matched && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                      ✨ {result.summary.preference_match.note}
                    </p>
                  )}
                </div>
                <div className="flex justify-center gap-16 opacity-40">
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Thời gian</p>
                    <p className="text-xl font-medium">{result.summary.total_active_time}p</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Dinh dưỡng</p>
                    <p className="text-xl font-medium">
                      {result.meals.reduce((acc, m) => acc + m.calories, 0)} kcal
                    </p>
                  </div>
                </div>
              </div>

              {/* Meals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {result.meals.map((meal, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group space-y-6"
                  >
                    <div 
                      className="rounded-[2rem] p-8 transition-all duration-500"
                      style={{ backgroundColor: currentColors.card }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30">
                            {meal.label_vi}
                          </span>
                        </div>
                        <h3 className="text-2xl font-serif">{meal.name}</h3>
                        <p className="text-sm opacity-50 leading-relaxed font-medium">
                          {meal.short_description}
                        </p>
                        <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest opacity-20 pt-2">
                          <span>{meal.calories} kcal</span>
                          <span>{meal.cook_time}p</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Timeline */}
              <section 
                className="rounded-[3rem] p-16 transition-all duration-500 shadow-sm"
                style={{ backgroundColor: currentColors.card }}
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-20 opacity-30 text-center">
                  Quy trình nấu song song
                </h3>
                <div className="space-y-20 max-w-2xl mx-auto">
                  {result.timeline.map((step, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-10 md:gap-20">
                      <div className="md:w-32 shrink-0">
                        <span 
                          className="text-3xl font-serif italic"
                          style={{ color: currentColors.accent }}
                        >
                          {step.time_range}
                        </span>
                      </div>
                      <div className="space-y-6 flex-grow">
                        {step.actions.map((action, aIdx) => (
                          <div key={aIdx} className="flex items-start gap-5">
                            <div className="w-1 h-1 rounded-full bg-current opacity-20 mt-2.5 shrink-0" />
                            <p className="text-lg opacity-70 leading-relaxed font-medium">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <div className="py-40 text-center space-y-8">
            <Loader2 className="w-10 h-10 animate-spin mx-auto opacity-10" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-20">Đang thiết kế bữa ăn</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-40 pb-20 text-center opacity-10">
        <p className="text-[9px] font-bold uppercase tracking-[0.5em]">Good Food Good Mood • 2026</p>
      </footer>
    </div>
  );
}
