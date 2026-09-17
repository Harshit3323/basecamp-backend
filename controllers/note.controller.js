import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Note } from "../models/note.model.js";

export const listProjectNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ project: req.project._id })
    .sort({ createdAt: -1 })
    .lean();

  if (notes.length === 0) {
    throw new apiError(404, "project doesn't have any notes");
  }

  return res
    .status(200)
    .json(new apiResponse(200, notes, "Notes fetched successfully"));
});

export const createNote = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const note = await Note.create({
    content,
    project: req.project._id,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new apiResponse(201, note, "Note created successfully"));
});

export const getNoteDetails = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.note, "Note details fetched successfully"));
});

export const updateNoteDetails = asyncHandler(async (req, res) => {
  const { content } = req.body;
  req.note.content = content;

  await req.note.save();

  return res
    .status(200)
    .json(new apiResponse(200, req.note, "Note updated successfully"));
});

export const deleteNote = asyncHandler(async (req, res) => {
  await req.note.deleteOne();

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Note deleted successfully"));
});
