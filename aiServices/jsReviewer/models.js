import { z } from "zod";

export const AgentResultSchema = z.object({
  criteria:    z.string().describe("Name of the criteria being evaluated"),
  score:       z.number().min(0).max(100).describe("Score out of 100"),  // ← was max(10)
  issues:      z.array(z.string()).describe("List of issues found"),
  suggestions: z.array(z.string()).describe("List of suggestions for improvement"),
  summary:     z.string().describe("Overall summary of the review for this criteria"),
});

export class ReviewInput {
  constructor({ code, language, context, numberedCode, deadCodeFreeNumberedCode, preflight }) {
    this.code = code;
    this.language = language;
    this.context = context;
    this.numberedCode = numberedCode;
    this.deadCodeFreeNumberedCode = deadCodeFreeNumberedCode;
    this.preflight = preflight;
  }
}

export class ReviewReport {
  constructor({ language, agentResults, rawScores }) {
    this.language = language;
    this.agentResults = agentResults;
    this.rawScores = rawScores;
  }

  weightedScore(weights) {
    if (!weights) return null;
    let totalWeight = 0;
    for (const w of Object.values(weights)) totalWeight += w;
    if (totalWeight === 0) return null;

    let score = 0;
    for (const [criteria, weight] of Object.entries(weights)) {
      const agentScore = this.rawScores[criteria] || 0;
      score += agentScore * (weight / totalWeight);
    }
    return score;
  }
}
