import mongoose, { Schema } from "mongoose";

export const AvailableTaskStatus = ["todo", "in_progress", "done"];
const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: AvailableTaskStatus,
      default: "todo",
    },
    attachments: [
      {
        url: String,
        MimeType: String,
        size: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Task = mongoose.model("Task", taskSchema);
