import User from "../models/user.model.js";
import apiError from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import("dotenv/config");

export const authMiddleware = asyncHandler(async (req, res, next) => {
  const jwtToken =
    req.cookies?.accessToken ||
    req.header("authorization")?.replace("Bearer ", "") ||
    req.header("autherization")?.replace("Bearer ", "");

  if (!jwtToken) throw new apiError(401, "unauthorized request");

  try {
    const decodedToken = jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id);
    if (!user) throw new apiError(401, "invalid token");
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof apiError) throw error;
    throw new apiError(401, error?.message || "unauthorized request");
  }
});
