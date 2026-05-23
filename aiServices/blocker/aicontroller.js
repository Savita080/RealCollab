/**
 * aicontroller.js
 *
 * Express controllers that proxy requests from the Node backend to the
 * Python AI microservice.
 *
 * findBottleneck — new controller for the "Find Bottleneck" button (Option 2).
 *   The Node backend is responsible for:
 *     1. Querying MongoDB for all IN_PROGRESS tasks of the project + their comments.
 *     2. Querying MongoDB for completed tasks (DONE / IN_REVIEW) as the baseline.
 *     3. Calling this controller with the assembled payload.
 *
 *   The Python service runs the 4-step pipeline and returns a ranked list of
 *   blocked tasks + a global bottleneck user.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// ── Helper ────────────────────────────────────────────────────────────────────

async function forwardToAI(path, body, res) {
    try {
        const response = await fetch(`${AI_SERVICE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`AI Service responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error(`Error calling AI service at ${path}:`, error.message);
        res.status(500).json({ error: 'Failed to communicate with AI Service' });
    }
}


// ── Find Bottleneck (Option 2 — manual trigger) ───────────────────────────────

/**
 * POST /api/ai/find-bottleneck
 *
 * Expected req.body shape (assembled by the calling route/service):
 * {
 *   project_id:        string,
 *   project_name:      string,
 *   active_tasks:      TaskPayload[],   // IN_PROGRESS tasks + their comments
 *   historical_tasks:  TaskPayload[],   // DONE / IN_REVIEW tasks for the baseline
 * }
 *
 * The Python service runs Steps 1–4 and returns a ProjectAnalysisResponse
 * with results sorted by (severity_multiplier × urgency_score) descending.
 */
export const findBottleneck = async (req, res) => {
    const { projectId } = req.params;           // or req.body, depending on your router
    const { activeTasks, historicalTasks } = req.body;

    if (!activeTasks || activeTasks.length === 0) {
        return res.status(422).json({ error: 'No active tasks provided.' });
    }

    await forwardToAI('/find-bottleneck', {
        project_id: projectId,
        project_name: req.body.projectName || projectId,
        active_tasks: activeTasks,
        historical_tasks: historicalTasks || [],
    }, res);
};


// ── Existing controllers (unchanged) ─────────────────────────────────────────

export const reviewCode = async (req, res) => {
    const { code, language, snippetId } = req.body;
    await forwardToAI('/api/review-code', { code, language, snippetId }, res);
};

export const generateStandup = async (req, res) => {
    const { projectId } = req.body;
    await forwardToAI('/api/standup', { projectId }, res);
};

export const summarizeProject = async (req, res) => {
    const { projectId } = req.body;
    await forwardToAI('/api/summarize-project', { projectId }, res);
};

export const generateTasks = async (req, res) => {
    const { projectId, featureDescription } = req.body;
    await forwardToAI('/api/generate-tasks', { projectId, featureDescription }, res);
};
