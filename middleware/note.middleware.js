import { Note } from "../models/note.model.js";
import apiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const validNoteExists = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.noteId);

  if (!note) throw new apiError(404, "Note doesn't exist");
  if (req.project && !note.project.equals(req.project._id)) {
    throw new apiError(404, "Note doesn't belong to this project");
  }

  req.note = note;
  next();
});
