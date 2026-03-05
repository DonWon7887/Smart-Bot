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
  private getAI(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  async analyzeSituation(botType: string, data: any): Promise<Decision> {
    const ai = this.getAI();
    if (!ai) {
      return this.fallbackAnalysis(botType, data);
    }

    try {
      const prompt = `
        You are an AI decision engine for an intelligent bot.
        Bot Type: ${botType}
        Current Data: ${JSON.stringify(data)}

        Analyze the situation and provide a decision in JSON format:
        {
          "action": "string (e.g., buy, sell, hold, alert, ignore, query)",
          "confidence": number (0-1),
          "reasoning": {
            "summary": "string",
            "reasons": ["string"],
            "suggestions": ["string"]
          },
          "risk_level": number (0-1)
        }

        If a 'user_command' is provided, prioritize interpreting it. 
        - If the user is asking for information (e.g., "what is your balance?", "show status"), set action to "query".
        - If the user provides a command starting with "custom:" (e.g., "custom:scan_network"), interpret the intent and set an appropriate action.
        - If the command is unknown, set action to "unknown_command" and explain why in the reasoning.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
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
    let summary = "Fallback rule-based analysis";

    if (data.user_command) {
      const cmd = data.user_command.toLowerCase();
      if (cmd.includes('status') || cmd.includes('report') || cmd.includes('balance') || cmd.includes('query')) {
        action = "query";
        summary = `Interpreted command: ${data.user_command}`;
      } else if (cmd.startsWith('custom:')) {
        action = cmd.split(':')[1] || "custom_action";
        summary = `Executing custom command: ${data.user_command}`;
      }
    } else if (botType === 'trading') {
      const priceChange = data.market_data?.btc_price_change || 0;
      if (priceChange > 2) action = "buy";
      else if (priceChange < -2) action = "sell";
      else action = "hold";
    }

    return {
      action,
      confidence,
      reasoning: {
        summary,
        reasons: ["AI engine unavailable or error occurred"],
        suggestions: ["Check API configuration"]
      },
      risk_level: 0.5,
      timestamp: new Date().toISOString()
    };
  }
}
