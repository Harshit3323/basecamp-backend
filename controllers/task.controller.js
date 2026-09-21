import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Task } from "../models/task.model.js";
import { SubTask } from "../models/subTask.model.js";

export const listProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ project: req.project._id })
    .select("title status assignedTo assignedBy")
    .lean();

  if (tasks.length === 0) {
    throw new apiError(404, "project doesn't have any tasks");
  }

  const subtasks = await SubTask.find({
    task: { $in: tasks.map((task) => task._id) },
  })
    .select("task content isCompleted createdBy")
    .lean();

  const tasksWithSubtasks = tasks.map((task) => ({
    ...task,
    subtasks: subtasks
      .filter((subtask) => subtask.task.equals(task._id))
      .map(({ _id, content, isCompleted, createdBy }) => ({
        _id,
        title: content,
        content,
        isCompleted,
        createdBy,
      })),
  }));

  return res
    .status(200)
    .json(
      new apiResponse(200, tasksWithSubtasks, "Tasks fetched successfully"),
    );
});

export const createTask = asyncHandler(async (req, res) => {
  const { title, description, attachments } = req.body;

  const existingTask = await Task.findOne({ title, project: req.project._id });

  if (existingTask)
    throw new apiError(409, "a task with the same title already exists");

  const task = await Task.create({
    title,
    description,
    attachments,
    project: req.project._id,
    assignedBy: req.user._id,
  });

  return res
    .status(201)
    .json(new apiResponse(201, task, "task created successfully"));
});

export const getTaskDetails = asyncHandler(async (req, res) => {
  const subtasks = await SubTask.find({ task: req.task._id })
    .select("_id content isCompleted createdBy")
    .lean();

  const task = {
    ...req.task.toObject(),
    subtasks: subtasks.map(({ _id, content, isCompleted, createdBy }) => ({
      _id,
      title: content,
      content,
      isCompleted,
      createdBy,
    })),
  };

  return res
    .status(200)
    .json(new apiResponse(200, task, "Task details fetched successfully"));
});

export const updateTaskDetails = asyncHandler(async (req, res) => {
  const { title, description, status, attachments } = req.body;
  if (title !== undefined) req.task.title = title;
  if (description !== undefined) req.task.description = description;
  if (status !== undefined) req.task.status = status;
  if (attachments !== undefined) req.task.attachments = attachments;

  await req.task.save();

  return res
    .status(200)
    .json(new apiResponse(200, req.task, "Task updated successfully"));
});

export const deleteTask = asyncHandler(async (req, res) => {
  await SubTask.deleteMany({ task: req.task._id });
  await req.task.deleteOne();

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Task deleted successfully"));
});

export const createSubTask = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const existingSubTask = await SubTask.findOne({
    content,
    task: req.task._id,
  });

  if (existingSubTask)
    throw new apiError(409, "a subtask with the same content already exists");

  const subTask = await SubTask.create({
    content,
    task: req.task._id,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new apiResponse(201, subTask, "Subtask created successfully"));
});

export const updateSubTask = asyncHandler(async (req, res) => {
  const { content, isCompleted } = req.body;
  const isMember = req.projectMembership.role === "member";

  if (isMember && content !== undefined) {
    throw new apiError(403, "Members can only update subtask completion");
  }

  if (content === undefined && isCompleted === undefined) {
    throw new apiError(400, "At least one subtask field is required");
  }

  if (content !== undefined) req.subTask.content = content;
  if (isCompleted !== undefined) req.subTask.isCompleted = isCompleted;

  await req.subTask.save();

  return res
    .status(200)
    .json(new apiResponse(200, req.subTask, "Subtask updated successfully"));
});

export const deleteSubTask = asyncHandler(async (req, res) => {
  await req.subTask.deleteOne();

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Subtask deleted successfully"));
});
