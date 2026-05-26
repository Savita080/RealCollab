import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

// ── Public entry point ────────────────────────────────────────────────────────

export function runPreflight(code, language) {
  const lang = language.toLowerCase();
  const isTs = lang.includes("typescript") || lang === "ts" || lang === "tsx";
  const ext = isTs ? ".ts" : ".js";

  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `preflight-${Date.now()}${ext}`);
  fs.writeFileSync(tmpFile, code, "utf8");

  const errors = [];
  const deadCode = [];
  let hasFatalSyntaxError = false;

  // ── Step 1: Biome lint — syntax + unused vars/imports ─────────────────────
  // Biome returns exit code 1 when it finds lint issues (not a real error),
  // so we always read stdout regardless of whether execSync throws.

  function parseBiome(stdout) {
    if (!stdout) return;
    try {
      // Biome may prepend non-JSON warnings — find the first '{'
      const jsonStart = stdout.indexOf("{");
      if (jsonStart === -1) return;
      const out = JSON.parse(stdout.substring(jsonStart));

      for (const diag of out.diagnostics || []) {
        const msg   = diag.description || diag.message || "Unknown issue";
        const line  = diag.location?.span?.start ?? diag.location?.start?.line ?? null;
        const cat   = diag.category ?? "";

        if (cat.includes("parse") || cat.includes("syntax")) {
          hasFatalSyntaxError = true;
          errors.push({ line, message: msg, type: "syntax" });

        } else if (
          cat.includes("noUnusedVariables") ||
          cat.includes("noUnusedImports")   ||
          cat.includes("noUnusedParameters")
        ) {
          deadCode.push({ line, message: msg });

        } else if (cat.includes("lint")) {
          errors.push({ line, message: msg, type: "lint" });
        }
      }
    } catch (_) {
      // Biome output wasn't valid JSON — ignore, fallback handles it
    }
  }

  try {
    const stdout = execSync(
      `./node_modules/.bin/biome lint --reporter=json "${tmpFile}"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    parseBiome(stdout);
  } catch (err) {
    // execSync throws when exit code !== 0
    // Biome exits 1 for lint violations — stdout still has the JSON report
    if (err.stdout) {
      parseBiome(err.stdout);
    }
    // If no stdout at all, Biome itself failed — fall back to node -c
    if (!err.stdout && !hasFatalSyntaxError) {
      try {
        execSync(`node --check "${tmpFile}"`, { stdio: "ignore" });
      } catch (_) {
        hasFatalSyntaxError = true;
        errors.push({ line: 1, message: "Fatal syntax error (node --check failed)", type: "syntax" });
      }
    }
  }

  // ── Early exit on fatal syntax error ─────────────────────────────────────
  if (hasFatalSyntaxError) {
    fs.unlinkSync(tmpFile);
    return {
      has_fatal_syntax_error: true,
      errors,
      dead_code: [],
      commented_out_blocks: [],
      dead_code_free_code: code,
    };
  }

  fs.unlinkSync(tmpFile);

  // ── Step 2: Find commented-out code blocks ────────────────────────────────
  const commentedOutBlocks = findCommentedOutBlocks(code);

  // ── Step 3: Build dead-code-free code view ────────────────────────────────
  // Dead lines = lines flagged by Biome as unused imports/vars
  // These line numbers come from Biome so they're 1-indexed
  const deadLineNums = new Set(
    deadCode
      .map(d => d.line)
      .filter(l => typeof l === "number" && l > 0)
  );
  const deadCodeFreeCode = removeDeadLines(code, deadLineNums, commentedOutBlocks);

  return {
    has_fatal_syntax_error: false,
    errors,
    dead_code: deadCode,
    commented_out_blocks: commentedOutBlocks,
    dead_code_free_code: deadCodeFreeCode,
  };
}


// ── Commented-out block detector ──────────────────────────────────────────────
// Uses regex heuristics (tree-sitter not available in Node without native builds)
// Identifies consecutive // comment lines whose content looks like executable code.

const CODE_PATTERNS = [
  /^(const|let|var)\s+\w+/,
  /^function\s+\w+\s*\(/,
  /^class\s+\w+/,
  /^return\b/,
  /^import\s+/,
  /^export\s+/,
  /^if\s*\(/,
  /^else\s*[{:]/,
  /^elif\s*\(/,
  /^for\s*\(/,
  /^while\s*\(/,
  /^try\s*{/,
  /^catch\s*\(/,
  /^finally\s*{/,
  /^throw\s+/,
  /^await\s+/,
  /^async\s+/,
  /^\w+\s*=\s*[^=]/,          // assignment (not ==)
  /^\w+\s*\+=/,               // augmented assignment
  /^\w+\s*\(\s*.*\)\s*;?$/,   // function call
  /^\w+\.\w+\s*\(/,           // method call
  /^console\.(log|error|warn|info)\s*\(/,
  /^\/\/ \[.*\]/,             // already a placeholder
];

const REAL_COMMENT_PREFIXES = [
  "todo", "fixme", "note", "hack", "xxx", "bug",
  "see", "cf.", "e.g.", "i.e.", "http", "https",
  "copyright", "license", "@param", "@return", "@type",
  "eslint", "prettier", "biome",
];

function looksLikeCode(text) {
  if (!text || text.trim().length < 3) return false;
  const t = text.trim().toLowerCase();
  if (REAL_COMMENT_PREFIXES.some(p => t.startsWith(p))) return false;
  return CODE_PATTERNS.some(p => p.test(text.trim()));
}

function findCommentedOutBlocks(code) {
  const lines  = code.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const stripped = lines[i].trim();

    if (stripped.startsWith("//")) {
      const blockStart = i;

      // Consume all consecutive // lines
      while (i < lines.length && lines[i].trim().startsWith("//")) {
        i++;
      }
      const blockEnd   = i - 1;
      const blockLines = lines.slice(blockStart, blockEnd + 1);

      // Strip the // prefix to get content
      const contents = blockLines.map(l =>
        l.trim().replace(/^\/\/+\s?/, "")
      );
      const codeLikeCount = contents.filter(looksLikeCode).length;

      // Flag if majority of lines look like code and block is 2+ lines
      const threshold = Math.max(1, Math.floor(contents.length / 2));
      if (blockLines.length >= 2 && codeLikeCount >= threshold) {
        result.push({
          start_line: blockStart + 1,   // 1-indexed
          end_line:   blockEnd   + 1,
          lines:      blockLines,
          message:    `Commented-out code block (${blockLines.length} lines)`,
        });
      }
    } else {
      i++;
    }
  }

  return result;
}


// ── Dead-code-free code builder ───────────────────────────────────────────────
// Replaces dead import/variable lines and commented-out blocks with
// placeholder comments so line numbers stay consistent.

function removeDeadLines(code, deadLineNums, commentedOutBlocks) {
  const lines = code.split("\n");

  // Build a set of all lines covered by commented-out blocks
  const blockCoveredLines = new Set();
  for (const block of commentedOutBlocks) {
    for (let ln = block.start_line; ln <= block.end_line; ln++) {
      blockCoveredLines.add(ln);
    }
  }

  // Map start_line → block for quick lookup
  const blockByStart = new Map();
  for (const block of commentedOutBlocks) {
    blockByStart.set(block.start_line, block);
  }

  const result = [];
  let i = 0;

  while (i < lines.length) {
    const ln1 = i + 1;   // 1-indexed line number

    if (blockByStart.has(ln1)) {
      // Start of a commented-out block — replace whole block with one placeholder
      const block = blockByStart.get(ln1);
      result.push("// [commented-out code block removed by preflight]");
      // Push empty lines to preserve total line count
      const blockLen = block.end_line - block.start_line;
      for (let j = 0; j < blockLen; j++) result.push("");
      i = block.end_line;   // skip to end of block

    } else if (blockCoveredLines.has(ln1)) {
      // Middle of a block already handled above — skip
      result.push("");
      i++;

    } else if (deadLineNums.has(ln1)) {
      // Unused import or variable line flagged by Biome
      result.push("// [dead code removed by preflight]");
      i++;

    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join("\n");
}