// One-time migration for the per-owner workspace/project naming + pretty URL refactor.
//
// What this does:
// 1. Workspaces:
//    - Backfill `owner` from members[] (the user with role: 'OWNER').
//    - Backfill `normalizedName` from existing `name`.
//    - Backfill `slug` if any are missing (auto-suffix on collision).
//    - Resolve owner+normalizedName collisions among existing docs by
//      auto-suffixing the duplicates' names + slugs (oldest one wins the bare name).
// 2. Projects:
//    - Backfill `normalizedName` from existing `name`.
//    - Backfill `slug` per workspace.
//    - Resolve workspace+normalizedName collisions the same way.
// 3. Drop legacy indexes that conflict, then create the new compound indexes.
//
// Run once after deploying the new code:
//   node scripts/migrate-workspace-slugs.js
//
// Idempotent — safe to re-run. Reads MONGO_URI from .env via dotenv.

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Workspace from '../models/workspace.js';
import Project from '../models/project.js';
import { slugifyBase, normalizeName, generateUniqueSlug } from '../utils/slug.js';
import crypto from 'crypto';

function shortSuffix() {
    return crypto.randomBytes(3).toString('hex').slice(0, 4);
}

async function migrateWorkspaces() {
    console.log('\n[Workspaces] Backfilling owner / normalizedName / slug...');

    // Disable schema validation during migration — older docs may temporarily violate
    // required fields until backfilled. We use updateOne with bypass.
    const cursor = Workspace.collection.find({});
    const docs = await cursor.toArray();
    console.log(`  Found ${docs.length} workspaces.`);

    // Pass 1: backfill owner and normalizedName per doc.
    for (const doc of docs) {
        const updates = {};

        if (!doc.owner) {
            const ownerMember = (doc.members || []).find(m => m.role === 'OWNER');
            if (!ownerMember) {
                console.warn(`  [skip] Workspace ${doc._id} has no OWNER in members[]`);
                continue;
            }
            updates.owner = ownerMember.user;
        }

        if (!doc.normalizedName) {
            updates.normalizedName = normalizeName(doc.name || '');
        }

        if (!doc.slug) {
            updates.slug = slugifyBase(doc.name || '') || `ws-${shortSuffix()}`;
        }

        if (Object.keys(updates).length) {
            await Workspace.collection.updateOne({ _id: doc._id }, { $set: updates });
        }
    }
    console.log('  Pass 1 done (owner/name backfill).');

    // Pass 2: resolve (owner, normalizedName) collisions BEFORE creating the unique index.
    // Group by (owner, normalizedName), keep the oldest, suffix the rest.
    const groups = await Workspace.collection.aggregate([
        { $group: { _id: { owner: '$owner', normalizedName: '$normalizedName' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (groups.length) {
        console.log(`  Resolving ${groups.length} owner+name collision group(s)...`);
        for (const g of groups) {
            // Keep the oldest doc (lowest ObjectId); suffix the rest.
            const sorted = [...g.ids].sort();
            const keepers = sorted.slice(0, 1);
            const dups = sorted.slice(1);
            for (const dupId of dups) {
                const dup = await Workspace.collection.findOne({ _id: dupId });
                const suffix = shortSuffix();
                const newName = `${dup.name} (${suffix})`;
                await Workspace.collection.updateOne(
                    { _id: dupId },
                    {
                        $set: {
                            name: newName,
                            normalizedName: normalizeName(newName),
                        }
                    }
                );
                console.log(`    Renamed ${dupId} → "${newName}"`);
            }
        }
    } else {
        console.log('  No owner+name collisions.');
    }

    // Pass 3: ensure slugs are globally unique (existing index already enforces it,
    // but we may have generated duplicate bare slugs in Pass 1). Detect + repair.
    const slugGroups = await Workspace.collection.aggregate([
        { $group: { _id: '$slug', ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (slugGroups.length) {
        console.log(`  Resolving ${slugGroups.length} slug collision(s)...`);
        for (const g of slugGroups) {
            const sorted = [...g.ids].sort();
            const dups = sorted.slice(1);
            for (const dupId of dups) {
                const newSlug = `${g._id}-${shortSuffix()}`;
                await Workspace.collection.updateOne({ _id: dupId }, { $set: { slug: newSlug } });
                console.log(`    Reslugged ${dupId} → "${newSlug}"`);
            }
        }
    }

    console.log('[Workspaces] Backfill complete.');
}

async function migrateProjects() {
    console.log('\n[Projects] Backfilling normalizedName / slug per workspace...');

    const cursor = Project.collection.find({});
    const docs = await cursor.toArray();
    console.log(`  Found ${docs.length} projects.`);

    for (const doc of docs) {
        const updates = {};
        if (!doc.normalizedName) updates.normalizedName = normalizeName(doc.name || '');
        if (!doc.slug) updates.slug = slugifyBase(doc.name || '') || `proj-${shortSuffix()}`;
        if (Object.keys(updates).length) {
            await Project.collection.updateOne({ _id: doc._id }, { $set: updates });
        }
    }
    console.log('  Pass 1 done.');

    // Resolve workspace+normalizedName collisions
    const nameGroups = await Project.collection.aggregate([
        { $group: { _id: { workspace: '$workspace', normalizedName: '$normalizedName' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (nameGroups.length) {
        console.log(`  Resolving ${nameGroups.length} workspace+name collision group(s)...`);
        for (const g of nameGroups) {
            const sorted = [...g.ids].sort();
            const dups = sorted.slice(1);
            for (const dupId of dups) {
                const dup = await Project.collection.findOne({ _id: dupId });
                const suffix = shortSuffix();
                const newName = `${dup.name} (${suffix})`;
                await Project.collection.updateOne(
                    { _id: dupId },
                    { $set: { name: newName, normalizedName: normalizeName(newName) } }
                );
                console.log(`    Renamed project ${dupId} → "${newName}"`);
            }
        }
    } else {
        console.log('  No workspace+name collisions.');
    }

    // Resolve workspace+slug collisions
    const slugGroups = await Project.collection.aggregate([
        { $group: { _id: { workspace: '$workspace', slug: '$slug' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (slugGroups.length) {
        console.log(`  Resolving ${slugGroups.length} workspace+slug collision(s)...`);
        for (const g of slugGroups) {
            const sorted = [...g.ids].sort();
            const dups = sorted.slice(1);
            for (const dupId of dups) {
                const dup = await Project.collection.findOne({ _id: dupId });
                const newSlug = `${dup.slug}-${shortSuffix()}`;
                await Project.collection.updateOne({ _id: dupId }, { $set: { slug: newSlug } });
                console.log(`    Reslugged project ${dupId} → "${newSlug}"`);
            }
        }
    }

    console.log('[Projects] Backfill complete.');
}

async function syncIndexes() {
    console.log('\n[Indexes] Syncing schema indexes (drops obsolete, creates new)...');
    await Workspace.syncIndexes();
    await Project.syncIndexes();
    console.log('[Indexes] Done.');
}

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set in env. Aborting.');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    try {
        await migrateWorkspaces();
        await migrateProjects();
        await syncIndexes();
        console.log('\n✓ Migration complete.');
    } catch (err) {
        console.error('\n✗ Migration failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();
