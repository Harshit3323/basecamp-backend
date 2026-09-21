import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import User from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { SubTask } from "../models/subTask.model.js";
import { Note } from "../models/note.model.js";

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: { user: req.user._id },
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: "$project" },
    {
      $lookup: {
        from: "projectmembers",
        localField: "project._id",
        foreignField: "project",
        as: "allMembers",
      },
    },
    {
      $addFields: {
        "project.memberCount": { $size: "$allMembers" },
        myRole: "$role",
      },
    },
    {
      $project: {
        _id: 1,
        myRole: 1,
        project: {
          _id: 1,
          name: 1,
          description: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
          memberCount: 1,
        },
      },
    },
  ]);
  if (Object.entries(projects).length === 0)
    throw new apiError(404, "no projects found");
  return res
    .status(200)
    .json(new apiResponse(200, projects, "Projects fetched successfully"));
});

export const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const existingProject = await Project.exists({
    name,
    createdBy: req.user._id,
  });

  if (existingProject) {
    throw new apiError(409, "You already have a project with this name");
  }

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
  });

  await ProjectMember.create({
    project: project._id,
    user: req.user._id,
    role: "admin",
  });

  return res
    .status(201)
    .json(new apiResponse(201, project, "Project created successfully"));
});

export const projectDetails = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ project: req.project._id })
    .select("title status assignedTo assignedBy")
    .lean();

  const subtasks = await SubTask.find({
    task: { $in: tasks.map((task) => task._id) },
  })
    .select("task content isCompleted createdBy")
    .lean();

  const project = {
    ...req.project.toObject(),
    tasks: tasks.map((task) => ({
      ...task,
      subtasks: subtasks
        .filter((subtask) => subtask.task.equals(task._id))
        .map(({ _id, content, isCompleted, createdBy }) => ({
          _id,
          title: content,
          isCompleted,
          createdBy,
        })),
    })),
  };

  return res.status(200).json(new apiResponse(200, project));
});

export const listMembers = asyncHandler(async (req, res) => {
  const members = await ProjectMember.aggregate([
    {
      $match: { project: req.project._id },
    },
    {
      $lookup: {
        from: "usertables",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $addFields: {
        roleOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$role", "admin"] }, then: 1 },
              { case: { $eq: ["$role", "project_admin"] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    { $sort: { roleOrder: 1, "user.userName": 1 } },
    {
      $project: {
        _id: 0,
        userId: "$user._id",
        userName: "$user.userName",
        name: "$user.name",
        role: 1,
      },
    },
  ]);
  if (Object.entries(members).length === 0)
    throw new apiError(404, "no members present");
  return res
    .status(200)
    .json(
      new apiResponse(200, members, "Project members fetched successfully"),
    );
});

export const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = req.project;

  if (name !== undefined) {
    project.name = name;
  }

  if (description !== undefined) {
    project.description = description;
  }

  await project.save();
  return res.status(200).json(new apiResponse(200));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const tasks = await Task.find({ project: projectId }).select("_id");
  const taskIds = tasks.map((task) => task._id);

  await SubTask.deleteMany({ task: { $in: taskIds } });
  await Task.deleteMany({ project: projectId });

  await Note.deleteMany({ project: projectId });

  await ProjectMember.deleteMany({ project: projectId });

  await Project.findByIdAndDelete(projectId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Project deleted successfully"));
});

export const addMember = asyncHandler(async (req, res) => {
  const { email, role = "member" } = req.body;
  const user = await User.findOne({ email });

  if (!user) throw new apiError(404, "user not found");

  const existing = await ProjectMember.findOne({
    project: req.project._id,
    user: user._id,
  });
  if (existing)
    throw new apiError(409, "User is already a member of this project");

  const member = await ProjectMember.create({
    project: req.project._id,
    user: user._id,
    role,
  });

  return res
    .status(201)
    .json(new apiResponse(201, member, "member added successfully"));
});

export const editMemberRole = asyncHandler(async (req, res) => {
  const { newRole } = req.body;
  if (
    req.targetMembership.role === "admin" &&
    !req.project.isOwner(req.user._id)
  ) {
    throw new apiError(
      403,
      "Only the project creator can change another admin's role",
    );
  }

  if (req.targetMembership.role === "admin" && newRole !== "admin") {
    const wouldOrphan = await ProjectMember.isLastAdmin(
      req.params.projectId,
      req.params.userId,
    );
    if (wouldOrphan)
      throw new apiError(
        400,
        "Cannot change role — this is the project's only admin",
      );
  }

  req.targetMembership.role = newRole;
  await req.targetMembership.save();

  return res
    .status(200)
    .json(new apiResponse(200, req.targetMembership, "Member role updated"));
});

export const removeMember = asyncHandler(async (req, res) => {
  if (
    req.targetMembership.role === "admin" &&
    !req.project.isOwner(req.user._id)
  ) {
    throw new apiError(403, "Only the owner can remove an admin");
  }

  if (req.targetMembership.role === "admin") {
    const wouldOrphan = await ProjectMember.isLastAdmin(
      req.params.projectId,
      req.params.userId,
    );

    if (wouldOrphan) {
      throw new apiError(400, "Cannot remove the project's only admin");
    }
  }

  await req.targetMembership.deleteOne();

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Member removed from project"));
});
