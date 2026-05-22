import Task from '../models/task.js';

export const createTask = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, status, priority, assignee, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Task title is required" });
        }

        const lastTask = await Task.findOne({ project: projectId, status: status || 'TODO' })
            .sort('-position')
            .exec();
        
        const position = lastTask ? lastTask.position + 1024 : 1024;

        const newTask = await Task.create({
            project: projectId,
            title,
            description,
            status: status || 'TODO',
            priority: priority || 'P2',
            assignee: assignee || null,
            dueDate: dueDate || null,
            position
        });

        res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });
    } catch (error) {
        console.error("Error creating task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await Task.find({ project: projectId }).sort('position');
        res.status(200).json({ tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $set: updates },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const deletedTask = await Task.findByIdAndDelete(taskId);

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
