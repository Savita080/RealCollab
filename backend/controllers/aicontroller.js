export const reviewCode = async (req, res) => {
    try {
        const { code, language, snippetId } = req.body;
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        const response = await fetch(`${aiServiceUrl}/api/review-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, snippetId })
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const generateStandup = async (req, res) => {
    try {
        const { projectId } = req.body;
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        const response = await fetch(`${aiServiceUrl}/api/standup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const summarizeProject = async (req, res) => {
    try {
        const { projectId } = req.body;
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        const response = await fetch(`${aiServiceUrl}/api/summarize-project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const generateTasks = async (req, res) => {
    try {
        const { projectId, featureDescription } = req.body;
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        const response = await fetch(`${aiServiceUrl}/api/generate-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, featureDescription })
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};
