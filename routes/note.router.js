import { Router } from "express";
import {
  createNote,
  deleteNote,
  getNoteDetails,
  listProjectNotes,
  updateNoteDetails,
} from "../controllers/note.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  validateProjectExists,
  verifyProjectPermission,
} from "../middleware/project.middleware.js";
import { validNoteExists } from "../middleware/note.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  createNoteValidator,
  updateNoteValidator,
} from "../validators/reqBody.validator.js";

const noteRouter = Router();

const projectContext = [
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(),
];

const adminProjectContext = [
  authMiddleware,
  validateProjectExists,
  verifyProjectPermission(["admin"]),
];

noteRouter.get("/:projectId", ...projectContext, listProjectNotes);

noteRouter.post(
  "/:projectId",
  ...adminProjectContext,
  createNoteValidator,
  validateRequest,
  createNote,
);

noteRouter.get(
  "/:projectId/n/:noteId",
  ...projectContext,
  validNoteExists,
  getNoteDetails,
);

noteRouter.put(
  "/:projectId/n/:noteId",
  ...adminProjectContext,
  validNoteExists,
  updateNoteValidator,
  validateRequest,
  updateNoteDetails,
);

noteRouter.delete(
  "/:projectId/n/:noteId",
  ...adminProjectContext,
  validNoteExists,
  deleteNote,
);

export default noteRouter;
