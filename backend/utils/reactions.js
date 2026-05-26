// Shared toggle logic for emoji reactions on chat messages and task comments.
// Mongoose subdoc shape: reactions: [{ emoji, users: [ObjectId] }]
//
// Returns the updated `reactions` array (lean) so the controller can broadcast it.
export async function toggleReaction(Model, docId, emoji, userId) {
    if (!emoji || typeof emoji !== 'string') {
        throw Object.assign(new Error('emoji is required'), { status: 400 });
    }
    const doc = await Model.findById(docId);
    if (!doc) throw Object.assign(new Error('Not found'), { status: 404 });

    const uid = userId.toString();
    let entry = doc.reactions.find(r => r.emoji === emoji);

    if (!entry) {
        // Brand-new reaction
        doc.reactions.push({ emoji, users: [userId] });
    } else {
        const idx = entry.users.findIndex(u => u.toString() === uid);
        if (idx >= 0) {
            // Toggle off
            entry.users.splice(idx, 1);
            if (entry.users.length === 0) {
                doc.reactions = doc.reactions.filter(r => r.emoji !== emoji);
            }
        } else {
            // Toggle on
            entry.users.push(userId);
        }
    }

    await doc.save();
    return doc.reactions;
}
