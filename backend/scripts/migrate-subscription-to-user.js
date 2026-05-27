// One-time migration for moving subscription from Workspace → User.
//
// Before: Workspace.subscription.{ plan, currentPeriodEnd, ... }
// After:  User.subscription.{ plan, currentPeriodEnd, ... }
//
// What this does:
// 1. Find any workspace where the OLD field `subscription.plan === 'PRO'` exists
//    on the raw document (model schema no longer declares it, but Mongo still
//    has the data).
// 2. For each such workspace, find the OWNER (member with role: 'OWNER') and
//    set User.subscription.plan = 'PRO' along with the period end and any
//    razorpay payment id we can recover.
// 3. Strip the legacy `subscription` subdoc from all workspaces ($unset).
//
// Idempotent — safe to re-run.
//
//   node scripts/migrate-subscription-to-user.js

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user.js';

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not set');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const wsColl = db.collection('workspaces');

    // Find workspaces still carrying the legacy subscription subdoc.
    const cursor = wsColl.find({ 'subscription.plan': { $exists: true } });
    let upgraded = 0;
    let scanned = 0;

    while (await cursor.hasNext()) {
        const ws = await cursor.next();
        scanned += 1;

        const sub = ws.subscription || {};
        const isPro = sub.plan === 'PRO';

        if (isPro) {
            const ownerMember = (ws.members || []).find(m => m.role === 'OWNER');
            if (!ownerMember) {
                console.warn(`  - Workspace ${ws._id} (${ws.name}) is PRO but has no OWNER member; skipping`);
                continue;
            }
            const owner = await User.findById(ownerMember.user);
            if (!owner) {
                console.warn(`  - Workspace ${ws._id} owner user ${ownerMember.user} not found; skipping`);
                continue;
            }
            // Don't downgrade an already-PRO user, and don't shorten an existing period.
            if (owner.subscription?.plan !== 'PRO') {
                // Use $set instead of .save() so a stray validator on an unrelated
                // field (e.g., a legacy user without password) doesn't abort the
                // whole migration mid-run.
                await User.updateOne(
                    { _id: owner._id },
                    {
                        $set: {
                            'subscription.plan': 'PRO',
                            'subscription.razorpayPaymentId': sub.razorpaySubscriptionId || null,
                            'subscription.currentPeriodEnd': sub.currentPeriodEnd || null,
                        }
                    }
                );
                upgraded += 1;
                console.log(`  ✓ User ${owner.email} upgraded to PRO (from ws ${ws.name})`);
            }
        }
    }

    // Strip the legacy field from every workspace doc.
    const stripped = await wsColl.updateMany(
        { subscription: { $exists: true } },
        { $unset: { subscription: '' } }
    );

    console.log('---');
    console.log(`Workspaces scanned with legacy subscription: ${scanned}`);
    console.log(`Users newly upgraded to PRO:                 ${upgraded}`);
    console.log(`Workspace docs stripped of legacy field:     ${stripped.modifiedCount}`);

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
