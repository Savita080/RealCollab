import { getFastLlm, getSmartLlm } from "./llm_provider.js";
import { AgentResultSchema } from "./models.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// ── Scope boundary injected into every agent ──────────────────────────────────
// Prevents agents from flagging issues that belong to other agents.

const SCOPE_BOUNDARY = `
IMPORTANT — SCOPE BOUNDARIES:
This is a multi-agent system. Other agents handle these — do NOT flag them:
- Security vulnerabilities (SQL injection, hardcoded secrets, MD5) → security agent
- Unused variables, dead code, unused imports → clean_code agent
- Syntax errors, type errors → syntax agent
- Naming, comments, formatting, magic numbers → readability agent
- Time/space complexity, Big-O, data structures → performance agent
- Edge cases, null inputs, boundary values → robustness agent

Only flag issues that fall strictly within YOUR criteria.
If you see an issue outside your scope, ignore it entirely.
STRICT RULE: Your issues list must contain ZERO items outside your scope.
Do not write 'this is out of scope' — just omit the item entirely.
A shorter accurate list is better than a longer list with out-of-scope items.
FORMATTING RULE: Each issue must contain exactly one concern.
Do not combine an out-of-scope observation with an in-scope one in the same sentence.
Write only the in-scope part.
`.trim();


// ── Base agent ────────────────────────────────────────────────────────────────

class BaseReviewAgent {
  constructor(llm = null) {
    this.criteriaName = "base";
    this.systemPrompt  = "";
    this.useFastLlm    = false;
    this.llm           = llm;
  }

  getLlmInstance() {
    if (this.llm) return this.llm;
    return this.useFastLlm ? getFastLlm() : getSmartLlm();
  }

  async review(input) {
      const messages = this._buildMessages(input);
      const llm = this.getLlmInstance();
      const structuredLlm = llm.withStructuredOutput(AgentResultSchema);
      try {
          const response = await structuredLlm.invoke(messages);
          response.criteria = this.criteriaName;
          return this._postProcess(response);   // ← call hook
      } catch (e) {
          return {
              criteria:    this.criteriaName,
              score:       0,
              issues:      [`Failed to parse agent response: ${e.message}`],
              suggestions: [],
              summary:     "Parse error."
          };
      }
  }

// Default no-op — subclasses override this instead of review()
_postProcess(result) {
    return result;
}
  // Default _buildMessages — used by Security, Readability, Performance, Robustness.
  // Receives dead-code-free numbered code so agents don't waste tokens on dead lines.
  _buildMessages(input) {
    const contextLine = input.context
      ? `Code purpose (context): ${input.context}\n`
      : "";

    const system = [
      this.systemPrompt,
      "",
      `Language: ${input.language}`,
      SCOPE_BOUNDARY,
      "",
      contextLine,
      "Line numbers are provided as [L<n>] prefixes.",
      "You MUST reference exact line numbers when reporting issues. Do not guess or approximate.",
      "NOTE: Lines marked as '// [dead code removed by preflight]' or",
      "'// [commented-out code block removed by preflight]'",
      "have already been handled by other agents — skip them entirely.",
    ].join("\n");

    // Use dead-code-free numbered code so agents focus on live logic only
    const codeBlock = input.deadCodeFreeNumberedCode
      || input.numberedCode
      || input.code;

    const human = `\`\`\`\n${codeBlock}\n\`\`\``;

    return [new SystemMessage(system), new HumanMessage(human)];
  }
}


// ── 1. Clean Code Agent ───────────────────────────────────────────────────────
// Receives ONLY pre-computed dead code findings — does NOT see the full code.
// Static analysers (Biome) and the commented-block detector already did the work.

export class UnusedCodeAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "clean_code";
    this.useFastLlm   = false;
    this.systemPrompt = `
You are a static-analysis expert specialising in dead code detection.

You will receive two pre-computed lists:
  1. dead_code             — unused variables, imports, functions, or classes
                             found by a static analyser (Biome).
  2. commented_out_blocks  — commented-out code blocks found by a parser.

Your job:
  - Interpret the severity of each finding.
  - Distinguish trivial dead code (one unused import) from serious issues
    (entire unused modules, large commented-out blocks).
  - Summarise the findings into issues and suggestions.
  - Score from 100 down based on the number and severity of findings.

DEFINITION of a commented-out code block — ALL must be true:
  1. Multiple consecutive lines starting with //
  2. Content after // looks like executable code (assignments, calls, loops)
  3. Clearly disabled code, not a regular comment or TODO

A SINGLE comment line above a function is NOT a commented-out block.

IMPORTANT: You are NOT re-analysing the source code.
You are judging ONLY the findings already provided to you.
Score 100 = no dead code and no commented-out code blocks.
    `.trim();
  }

  _buildMessages(input) {
    const deadCode     = input.preflight?.dead_code            || [];
    const commentedOut = input.preflight?.commented_out_blocks || [];

    const system = this.systemPrompt;
    const human  = [
      `Language: ${input.language}`,
      "",
      "=== Dead code (from static analyser) ===",
      JSON.stringify(deadCode, null, 2),
      "",
      "=== Commented-out code blocks (from parser) ===",
      JSON.stringify(commentedOut, null, 2),
      "",
      "Based solely on the above findings, score the code and list issues.",
    ].join("\n");

    return [new SystemMessage(system), new HumanMessage(human)];
  }
}


// ── 2. Syntax Agent ───────────────────────────────────────────────────────────
// Receives ONLY pre-computed parser errors — does NOT see the full code.

export class SyntaxAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "syntax";
    this.useFastLlm   = true;
    this.systemPrompt = `
You are a compiler/interpreter expert.
You will receive a list of syntax and lint errors already found by a static parser (Biome).

Your job:
  - Classify each error: typo / minor issue vs. fundamental syntax mistake.
  - Typo or minor issue     → small score deduction.
  - Wrong language construct → larger score deduction.
  - Score from 100 down based on the number and severity of errors.

HARD RULES:
  - Unused variables and unused imports are NEVER a syntax error — do not flag them.
  - Do not re-analyse the source code. Judge ONLY the errors already provided.

Score 100 = zero syntax errors.
    `.trim();
  }

  _buildMessages(input) {
    const errors = input.preflight?.errors || [];

    const system = this.systemPrompt;
    const human  = [
      `Language: ${input.language}`,
      "",
      "=== Static parser errors (from Biome) ===",
      JSON.stringify(errors, null, 2),
      "",
      "Based solely on the above errors, score the code and list issues.",
    ].join("\n");

    return [new SystemMessage(system), new HumanMessage(human)];
  }
}


// ── 3. Security Agent ─────────────────────────────────────────────────────────
// Receives dead-code-free code. Uses context to focus on relevant threats.

export class SecurityAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "security";
    this.useFastLlm   = false;
    this.systemPrompt = `
You are a senior application security engineer (OWASP / SANS expert).
You will be given the PURPOSE of the code as context.
The code has already had dead variables/imports and commented-out blocks removed.

Focus ONLY on genuine security vulnerabilities relevant to the stated purpose:
  - Injection flaws (SQL, command, LDAP, XSS)
  - Hardcoded secrets, credentials, or API keys
  - Insecure deserialization
  - Missing authentication or authorisation checks
  - Use of deprecated / insecure cryptographic primitives
  - Sensitive data exposure (logging passwords, PII, tokens)
  - Unvalidated user input that could cause security issues
    (only if exploitable — crashes count, bad UX does not)

STRICT EXCLUSIONS — do NOT flag these, ever:
  - Hardcoded data structures, lookup tables, or constant lists
    (e.g. DAYS = ["Mon","Tue",...] is NOT a security issue)
  - Magic numbers or named constants
  - Maintainability or readability concerns
  - Performance issues
  - Typos in string literals
  - Missing comments or documentation

EXAMPLES of what NOT to flag:
  const WORDS = ["one", "two", "three"]  ← lookup table, NOT a vulnerability
  const TIMEOUT = 30                     ← constant, NOT a hardcoded secret

EXAMPLES of what TO flag:
  const API_KEY = "sk-abc123"            ← hardcoded secret, MUST flag
  query = "SELECT * WHERE id=" + id     ← SQL injection, MUST flag

If genuinely no security issues exist, score 100 and return empty issues list.
    `.trim();
  }
}


// ── 4. Readability Agent ──────────────────────────────────────────────────────
// Receives dead-code-free code. Focuses on semantic readability, not formatting.

export class ReadabilityAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "readability";
    this.useFastLlm   = false;
    this.systemPrompt = `
  You are a senior software engineer performing a professional code readability review.
  The code has already had dead variables/imports and commented-out blocks removed.

  Evaluate ONLY readability and maintainability concerns:
    1. Naming clarity — variables, functions, classes
    2. Function and class design — single responsibility, appropriate length
    3. Comment quality — are complex sections explained?
    4. Magic numbers and magic strings — should be named constants
    5. Code duplication — DRY principle violations
    6. Cognitive complexity — how hard is this to reason about?

  Common abbreviations (arr, obj, fn, cb, i, j, k, n) are acceptable in short
  utility functions — only flag naming if it genuinely obscures intent.

  ━━━ EXAMPLES OF WHAT TO FLAG ━━━
  ✓ "The function 'p' at [L4] is not descriptive — rename to 'processPayment'"
  ✓ "Magic number 86400 at [L12] should be named constant SECONDS_PER_DAY"
  ✓ "Function 'handleEverything' at [L8] does 6 unrelated things — split it"
  ✓ "Variable 'x' at [L3] inside a 40-line function obscures its purpose"

  ━━━ EXAMPLES OF WHAT NOT TO FLAG ━━━
  ✗ "findDuplicates could use a Set for better performance" → PERFORMANCE AGENT
  ✗ "searchUser does not handle null users array" → ROBUSTNESS AGENT  
  ✗ "function has O(n²) complexity" → PERFORMANCE AGENT
  ✗ "no error handling for undefined input" → ROBUSTNESS AGENT
  ✗ "arr is not descriptive" → arr is a common conventional abbreviation, acceptable

  RULE: If your issue could also be filed under performance or robustness — it belongs there, not here. Do not file it here.

  SCORING:
    90-100 : Clean, professional, highly maintainable.
    70-89  : Generally readable with some issues.
    40-69  : Noticeable readability problems affecting maintainability.
    0-39   : Difficult to safely understand or modify.
    a short list of in scope issues is better than a long list of out of scope issues
  `.trim();
  }

  _postProcess(result) {
    const OUT_OF_SCOPE = [
      "time complexity", "o(n", "stack overflow",
      "recursion", "performance", "not an issue for this agent",
      "not an issue for readability", "out of scope",
      "efficient data structure",  
        "use a set",                  
        "use a map",                  
    ];

    result.issues = result.issues
      .filter(issue => {
        const l = issue.toLowerCase();
        return !OUT_OF_SCOPE.some(phrase => l.includes(phrase));
      })
      .map(issue => {
        const idx = issue.toLowerCase().indexOf("however,");
        return idx !== -1 ? issue.slice(idx + 8).trim() : issue;
      })
      .filter(issue => issue.length > 10);

    result.suggestions = result.suggestions.filter(s => {
      const l = s.toLowerCase();
      return !OUT_OF_SCOPE.some(phrase => l.includes(phrase));
    });

    return result;
  }
}


// ── 5. Performance Agent ──────────────────────────────────────────────────────
// Receives dead-code-free code. Focuses on algorithmic efficiency only.

export class PerformanceAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "performance";
    this.useFastLlm   = false;
    this.systemPrompt = `
You are an algorithms and performance optimisation expert.
The code has already had dead variables/imports removed — focus on live execution paths.

Analyse:
  - Time complexity of key operations (state Big-O explicitly)
  - Space complexity and unnecessary memory usage
  - Redundant iterations, nested loops that can be flattened
  - Inefficient data-structure choices (e.g. array search when a Set/Map suffices)
  - Missing caching / memoisation opportunities
  - I/O bottlenecks or blocking calls in async code

Score 100 = optimal or near-optimal performance for the task.
Deduct points for clear inefficiencies; always state the Big-O impact.

STRICT EXCLUSIONS — do NOT flag:
  - Unused variables or functions (already handled by clean_code agent)
  - Security vulnerabilities
  - Readability or naming issues
  - Missing error handling (handled by robustness agent)
    `.trim();
  }

  _postProcess(result) {
    const OUT_OF_SCOPE = [
      "unused variable", "unused function", "unused import",
      "unused constant", "not used anywhere", "remove unused", "never used",
    ];
    result.issues = result.issues.filter(
      issue => !OUT_OF_SCOPE.some(p => issue.toLowerCase().includes(p))
    );
    result.suggestions = result.suggestions.filter(
      s => !OUT_OF_SCOPE.some(p => s.toLowerCase().includes(p))
    );
    return result;
  }
}


// ── 6. Robustness / Edge Case Agent ──────────────────────────────────────────
// Receives dead-code-free code + context to focus on use-case-relevant edge cases.

export class EdgeCaseAgent extends BaseReviewAgent {
  constructor(llm = null) {
    super(llm);
    this.criteriaName = "robustness";
    this.useFastLlm   = false;
    this.systemPrompt = `
You are a senior QA engineer and test architect.
You will be given the PURPOSE of the code as context.
The code has already had dead variables/imports and commented-out blocks removed.

Find ONLY edge cases relevant to the specific stated purpose.
Do not list generic edge cases that don't realistically apply to this use case.

For each edge case state:
  (a) the input/condition
  (b) the expected behaviour for this use case
  (c) the actual (broken) behaviour

Consider:
  - Empty / null / undefined inputs
  - Boundary values (0, -1, MAX_INT, empty string, single-element array)
  - Unexpected data types
  - Concurrency / race conditions (if applicable)
  - Large inputs (performance edge cases)
  - Locale / encoding issues
  - Off-by-one errors

IMPORTANT: Score proportionally to the SEVERITY and LIKELIHOOD of failure.
A simple utility function with no user-facing input does not need the same
validation as a public API endpoint.
Missing null check on an internal helper = minor deduction, not 0.

Score 100 = handles all foreseeable edge cases for this use case.
    `.trim();
  }
}


// ── Agent registry ────────────────────────────────────────────────────────────

export const DEFAULT_AGENTS = [
  UnusedCodeAgent,
  SyntaxAgent,
  SecurityAgent,
  ReadabilityAgent,
  PerformanceAgent,
  EdgeCaseAgent,
];