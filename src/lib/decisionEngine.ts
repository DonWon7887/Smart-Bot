import { GoogleGenAI } from "@google/genai";

export interface Decision {
  action: string;
  confidence: number;
  reasoning: {
    summary: string;
    reasons: string[];
    suggestions: string[];
  };
  risk_level: number;
  timestamp: string;
}

export class DecisionEngine {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  async analyzeSituation(botType: string, data: any): Promise<Decision> {
    if (!this.ai) {
      return this.fallbackAnalysis(botType, data);
    }

    try {
      const prompt = `
        You are an AI decision engine for an intelligent bot.
        Bot Type: ${botType}
        Current Data: ${JSON.stringify(data)}

        Analyze the situation and provide a decision in JSON format:
        {
          "action": "string (e.g., buy, sell, hold, alert, ignore)",
          "confidence": number (0-1),
          "reasoning": {
            "summary": "string",
            "reasons": ["string"],
            "suggestions": ["string"]
          },
          "risk_level": number (0-1)
        }
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = (response.text || "{}").trim();
      const sanitized = text.replace(/```json\n?|```/g, "").trim();
      
      if (!sanitized || sanitized === "{}") {
        return this.fallbackAnalysis(botType, data);
      }

      const result = JSON.parse(sanitized);
      
      return {
        ...result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("AI Decision Error:", error);
      return this.fallbackAnalysis(botType, data);
    }
  }

  private fallbackAnalysis(botType: string, data: any): Decision {
    // Simple rule-based fallback
    let action = "wait";
    let confidence = 0.5;
    
    if (botType === 'trading') {
      const priceChange = data.market_data?.btc_price_change || 0;
      if (priceChange > 2) action = "buy";
      else if (priceChange < -2) action = "sell";
      else action = "hold";
    }

    return {
      action,
      confidence,
      reasoning: {
        summary: "Fallback rule-based analysis",
        reasons: ["AI engine unavailable or error occurred"],
        suggestions: ["Check API configuration"]
      },
      risk_level: 0.5,
      timestamp: new Date().toISOString()
    };
  }
}
