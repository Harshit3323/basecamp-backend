import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getTaskDetails,
  listProjectTasks,
  updateSubTask,
  updateTaskDetails,
} from "../controllers/task.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  validateProjectExists,
  verifyProjectPermission,
} from "../middleware/project.middleware.js";
import {
  validSubTaskExists,
  validTaskExists,
} from "../middleware/task.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  createSubTaskValidator,
  createTaskValidator,
  updateSubTaskValidator,
  updateTaskValidator,
} from "../validators/reqBody.validator.js";

const taskRouter = Router();
const taskManagers = ["admin", "project_admin"];

const projectContext = [
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(),
];

const managedProjectContext = [
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(taskManagers),
];

taskRouter.get("/:projectId", ...projectContext, listProjectTasks);

taskRouter.post(
  "/:projectId",
  ...managedProjectContext,
  createTaskValidator,
  validateRequest,
  createTask,
);

taskRouter.get(
  "/:projectId/t/:taskId",
  ...projectContext,
  validTaskExists,
  getTaskDetails,
);
taskRouter.put(
  "/:projectId/t/:taskId",
  ...managedProjectContext,
  validTaskExists,
  updateTaskValidator,
  validateRequest,
  updateTaskDetails,
);
taskRouter.delete(
  "/:projectId/t/:taskId",
  ...managedProjectContext,
  validTaskExists,
  deleteTask,
);

taskRouter.post(
  "/:projectId/t/:taskId/subtasks",
  ...managedProjectContext,
  validTaskExists,
  createSubTaskValidator,
  validateRequest,
  createSubTask,
);
taskRouter.put(
  "/:projectId/st/:subTaskId",
  ...projectContext,
  validSubTaskExists,
  updateSubTaskValidator,
  validateRequest,
  updateSubTask,
);
taskRouter.delete(
  "/:projectId/st/:subTaskId",
  ...managedProjectContext,
  validSubTaskExists,
  deleteSubTask,
);

export default taskRouter;
