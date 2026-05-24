import { DEFAULT_AGENTS } from "./agents.js";
import { ReviewReport } from "./models.js";

export class ReviewOrchestrator {
  constructor(agentClasses = null, parallel = true) {
    this._agentClasses = agentClasses || DEFAULT_AGENTS;
    this._parallel = parallel;
    this._agents = this._agentClasses.map(Cls => new Cls());
  }

  async run(input) {
    const results = this._parallel ? await this._runParallel(input) : await this._runSequential(input);
    const rawScores = {};
    for (const r of results) {
      rawScores[r.criteria] = r.score;
    }
    return new ReviewReport({ language: input.language, agentResults: results, rawScores });
  }

  async _runSequential(input) {
    const results = [];
    for (const agent of this._agents) {
      results.push(await agent.review(input));
    }
    return results;
  }

  async _runParallel(input) {
    const promises = this._agents.map(async (agent) => {
      try {
        return await agent.review(input);
      } catch (err) {
        return {
          criteria: agent.criteriaName,
          score: 0,
          issues: [`Agent raised an exception: ${err.message}`],
          suggestions: [],
          summary: "Agent error."
        };
      }
    });
    const results = await Promise.all(promises);
    
    // Sort to maintain deterministic order matching DEFAULT_AGENTS
    const order = {};
    this._agentClasses.forEach((Cls, idx) => {
      order[new Cls().criteriaName] = idx;
    });
    
    results.sort((a, b) => (order[a.criteria] ?? 99) - (order[b.criteria] ?? 99));
    return results;
  }
}
