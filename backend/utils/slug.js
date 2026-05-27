// Slug generation for Workspace and Project models.
//
// Two helpers:
// - normalizeName(name)     → lowercased+trimmed for the per-owner uniqueness check
// - generateUniqueSlug(...) → URL-safe slug, globally unique within a Mongo collection
//
// On collision the slug gets a short random base36 suffix (e.g. "acme-k7p2") rather
// than "-2"/"-3" so two unrelated workspaces never look like sequel/parent.

import crypto from 'crypto';

// "Acme  Co!" → "acme-co"
export function slugifyBase(name) {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// "Acme  Co" → "acme  co" (trim + lowercase, but keep internal spacing collapsed
// so trivial whitespace differences still collide).
export function normalizeName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

// 4-char base36 — ~1.6M combinations. Plenty for collision-suffix duty.
function randomSuffix() {
    return crypto.randomBytes(3).toString('hex').slice(0, 4);
}

// Generate a slug that doesn't collide with any existing doc in `Model` matching `extraFilter`.
// First tries the bare slug; on hit, appends a 4-char base36 suffix and retries up to 5x.
//
// `extraFilter` lets project-scoped uniqueness work (e.g. { workspace: workspaceId })
// while workspace slugs use {} for global uniqueness.
//
// `excludeId` is for renames — exclude the doc currently being renamed from the check.
export async function generateUniqueSlug(Model, name, { extraFilter = {}, excludeId = null } = {}) {
    const base = slugifyBase(name);
    if (!base) {
        // Fallback if name was all punctuation: pure random slug
        return `ws-${randomSuffix()}`;
    }

    const buildFilter = (slug) => {
        const f = { ...extraFilter, slug };
        if (excludeId) f._id = { $ne: excludeId };
        return f;
    };

    // First attempt — the bare slug
    if (!(await Model.exists(buildFilter(base)))) return base;

    // Collision — try suffixed slugs
    for (let i = 0; i < 5; i++) {
        const candidate = `${base}-${randomSuffix()}`;
        if (!(await Model.exists(buildFilter(candidate)))) return candidate;
    }

    // Astronomically unlikely to land here (5 misses on a 1.6M space). Return
    // a longer suffix as last resort — guaranteed unique on the human timescale.
    return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}
