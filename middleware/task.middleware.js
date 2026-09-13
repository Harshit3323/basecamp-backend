import { SubTask } from "../models/subTask.model.js";
import { Task } from "../models/task.model.js";
import apiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const validTaskExists = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) throw new apiError(404, "Task doesn't exist");
  if (req.project && !task.project.equals(req.project._id)) {
    throw new apiError(404, "Task doesn't belong to this project");
  }

  req.task = task;
  next();
});

export const validSubTaskExists = asyncHandler(async (req, res, next) => {
  const subTask = await SubTask.findById(req.params.subTaskId);

  if (!subTask) throw new apiError(404, "Subtask doesn't exist");

  if (req.task && !subTask.task.equals(req.task._id)) {
    throw new apiError(404, "Subtask doesn't belong to this task");
  }

  if (req.project) {
    const taskInProject = await Task.exists({
      _id: subTask.task,
      project: req.project._id,
    });

    if (!taskInProject) {
      throw new apiError(404, "Subtask doesn't belong to this project");
    }
  }

  req.subTask = subTask;
  next();
});
