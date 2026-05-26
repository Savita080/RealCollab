import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ReviewOrchestrator } from "./orchestrator.js";
import { runPreflight } from "./preflight.js";
import { ReviewInput } from "./models.js";
import { DEFAULT_AGENTS } from "./agents.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const orchestrator = new ReviewOrchestrator(null, true);

function addLineNumbers(code) {
  return code
    .split("\n")
    .map((line, i) => `[L${i + 1}] ${line}`)
    .join("\n");
}

function buildReviewInput(reqBody, preflight) {
  const numberedCode = addLineNumbers(reqBody.code);
  const deadCodeFree = preflight.dead_code_free_code || reqBody.code;
  const deadCodeFreeNumbered = addLineNumbers(deadCodeFree);

  return new ReviewInput({
    code: reqBody.code,
    language: reqBody.language,
    context: reqBody.context,
    numberedCode,
    deadCodeFreeNumberedCode: deadCodeFreeNumbered,
    preflight
  });
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", provider: process.env.LLM_PROVIDER || "groq" });
});

app.get("/agents", (req, res) => {
  res.json({
    agents: DEFAULT_AGENTS.map(Cls => {
      const a = new Cls();
      return { criteria: a.criteriaName, uses_fast_llm: a.useFastLlm };
    })
  });
});

app.post("/review", async (req, res) => {
  const { code, language, context, weights } = req.body;
  if (!code || !language) {
    return res.status(422).json({ detail: "code and language must not be empty" });
  }

  const t0 = Date.now();
  const preflight = runPreflight(code, language);

  if (preflight.has_fatal_syntax_error) {
    return res.json({
      language,
      fatal_syntax_error: preflight.errors,
      agent_results: [],
      raw_scores: {},
      weighted_score: null,
      duration_ms: Date.now() - t0
    });
  }

  const reviewInput = buildReviewInput(req.body, preflight);
  const report = await orchestrator.run(reviewInput);

  res.json({
    language: report.language,
    raw_scores: report.rawScores,
    weighted_score: report.weightedScore(weights),
    agent_results: report.agentResults,
    duration_ms: Date.now() - t0
  });
});

// SSE Streaming Route
app.post("/review/stream", async (req, res) => {
  const { code, language, context, weights } = req.body;
  if (!code || !language) {
    return res.status(422).json({ detail: "code and language must not be empty" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const t0 = Date.now();
  const preflight = runPreflight(code, language);

  if (preflight.has_fatal_syntax_error) {
    res.write(`data: ${JSON.stringify({ done: true, fatal_syntax_error: preflight.errors })}\n\n`);
    return res.end();
  }

  const reviewInput = buildReviewInput(req.body, preflight);
  const results = [];
  const rawScores = {};

  for (const agent of orchestrator._agents) {
    try {
      const result = await agent.review(reviewInput);
      results.push(result);
      rawScores[result.criteria] = result.score;
      res.write(`data: ${JSON.stringify({ done: false, result })}\n\n`);
    } catch (e) {
      const errRes = {
        criteria: agent.criteriaName,
        score: 0,
        issues: [`Error: ${e.message}`],
        suggestions: [],
        summary: "Error"
      };
      results.push(errRes);
      rawScores[errRes.criteria] = errRes.score;
      res.write(`data: ${JSON.stringify({ done: false, result: errRes })}\n\n`);
    }
  }

  // Calculate weighted score manually since we bypassed orchestrator.run
  const report = { rawScores };
  let weightedScore = null;
  if (weights) {
    let totalWeight = 0;
    for (const w of Object.values(weights)) totalWeight += w;
    if (totalWeight > 0) {
      let score = 0;
      for (const [criteria, weight] of Object.entries(weights)) {
        const agentScore = rawScores[criteria] || 0;
        score += agentScore * (weight / totalWeight);
      }
      weightedScore = score;
    }
  }

  const final = {
    done: true,
    raw_scores: rawScores,
    weighted_score: weightedScore,
    duration_ms: Date.now() - t0
  };
  res.write(`data: ${JSON.stringify(final)}\n\n`);
  res.end();
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`jsReviewer listening on port ${PORT}`);
});
