import { Router } from "express";
import {
  addMember,
  createProject,
  deleteProject,
  editMemberRole,
  listMembers,
  listProjects,
  projectDetails,
  removeMember,
  updateProject,
} from "../controllers/project.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  validateProjectExists,
  verifyMemberExists,
  verifyProjectPermission,
} from "../middleware/project.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  addMemberValidator,
  createProjectValidator,
  editMemberRoleValidator,
  updateProjectValidator,
} from "../validators/reqBody.validator.js";

const projectRouter = Router();

projectRouter.get("/", authMiddleware, listProjects);
projectRouter.post(
  "/",
  authMiddleware,
  createProjectValidator,
  validateRequest,
  createProject,
);

projectRouter.get(
  "/:projectId",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(),
  projectDetails,
);
projectRouter.put(
  "/:projectId",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
  updateProjectValidator,
  validateRequest,
  updateProject,
);
projectRouter.delete(
  "/:projectId",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
  deleteProject,
);

projectRouter.get(
  "/:projectId/members",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(),
  listMembers,
);
projectRouter.post(
  "/:projectId/members",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
  addMemberValidator,
  validateRequest,
  addMember,
);
projectRouter.put(
  "/:projectId/members/:userId",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
  verifyMemberExists,
  editMemberRoleValidator,
  validateRequest,
  editMemberRole,
);
projectRouter.delete(
  "/:projectId/members/:userId",
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
  verifyMemberExists,
  removeMember,
);

export default projectRouter;
