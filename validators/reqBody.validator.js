import { body } from "express-validator";
import { AvailableUserRoles } from "../models/projectMember.model.js";
import { AvailableTaskStatus } from "../models/task.model.js";

const emailvalidator = body("email")
  .trim()
  .notEmpty()
  .withMessage("email is required")
  .isEmail()
  .withMessage("email must be a valid email address");

export const validateReqBody = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("userName is required")
    .isLowercase()
    .withMessage("userName must be in lowercase"),
  emailvalidator,
  body("password")
    .trim()
    .notEmpty()
    .withMessage("password is required")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters long"),
];

export const loginVlidator = [
  emailvalidator,
  body("password").trim().notEmpty().withMessage("password is required"),
];

export const createProjectValidator = [
  body("name").trim().notEmpty().withMessage("project name is required"),
  body("description")
    .optional()
    .isString()
    .withMessage("project description must be a string")
    .trim(),
];

export const updateProjectValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("project name cannot be empty"),
  body("description")
    .optional()
    .isString()
    .withMessage("project description must be a string")
    .trim(),
];

export const addMemberValidator = [
  emailvalidator,
  body("role")
    .optional()
    .isIn(AvailableUserRoles)
    .withMessage("role must be admin, project_admin, or member"),
];

export const editMemberRoleValidator = [
  body("newRole")
    .trim()
    .notEmpty()
    .withMessage("newRole is required")
    .isIn(AvailableUserRoles)
    .withMessage("newRole must be admin, project_admin, or member"),
];

export const createTaskValidator = [
  body("title")
    .isString()
    .withMessage("Task title must be a string")
    .trim()
    .notEmpty()
    .withMessage("Task title is required"),
  body("description")
    .optional()
    .isString()
    .withMessage("Task description must be a string")
    .trim(),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("Task attachments must be an array"),
];

export const updateTaskValidator = [
  body("title")
    .optional()
    .isString()
    .withMessage("Task title must be a string")
    .trim()
    .notEmpty()
    .withMessage("Task title cannot be empty"),
  body("description")
    .optional()
    .isString()
    .withMessage("Task description must be a string")
    .trim(),
  body("status")
    .optional()
    .isIn(AvailableTaskStatus)
    .withMessage("Invalid task status"),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("Task attachments must be an array"),
];

export const createSubTaskValidator = [
  body("content")
    .isString()
    .withMessage("Subtask content must be a string")
    .trim()
    .notEmpty()
    .withMessage("Subtask content is required"),
];

export const updateSubTaskValidator = [
  body("content")
    .optional()
    .isString()
    .withMessage("Subtask content must be a string")
    .trim()
    .notEmpty()
    .withMessage("Subtask content cannot be empty"),
  body("isCompleted")
    .optional()
    .isBoolean()
    .withMessage("isCompleted must be a boolean")
    .toBoolean(),
];
