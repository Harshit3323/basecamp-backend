import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 10000,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Note = mongoose.model("Note", noteSchema);
