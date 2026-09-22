import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendMail,
  emailVerificationTemplate,
  forgotPasswordEmailTemplate,
} from "../utils/mail.js";
import { tokenGenerator } from "../utils/tokenGenerator.js";
import { createHmac } from "crypto";
import jwt from "jsonwebtoken";

export const registerUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  const existingUser = await User.findOne({ $or: [{ userName }, { email }] });
  if (existingUser)
    throw new apiError(409, `user with the same email/username already exists`);
  const user = await User.create({
    userName,
    email,
    password,
    isEmailVerified: false,
  });

  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  sendMail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationTemplate(
      user.userName,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  }).catch((error) => {
    console.error("Email verification message was not sent:", error);
  });

  const createdUser = await User.findById(user._id).select(
    "-password -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry",
  );

  return res
    .status(201)
    .json(new apiResponse(201, createdUser, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email });

  if (!user) throw new apiError(401, "Invalid email or password");

  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) throw new apiError(401, "Invalid email or password");

  const { accessToken, refreshToken } = await tokenGenerator(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new apiResponse(200, null, "Login successful"));
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: "" },
  });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  return res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", { ...cookieOptions, path: "/api/v1/auth" })
    .clearCookie("refreshToken", { ...cookieOptions, path: "/api/v1/auth" })
    .status(200)
    .json(new apiResponse(200, null, "Logout successful"));
});

export const currentUser = asyncHandler(async (req, res) => {
  const safeUser = await User.findById(req.user._id).select(
    "-password -refreshToken -forgotPasswordToken -forgotPasswordTokenExpiry -emailVerificationToken -emailVerificationTokenExpiry",
  );
  return res
    .status(200)
    .json(
      new apiResponse(200, safeUser, "current user data fetched successfully"),
    );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken)
    throw new apiError(400, "Email verification token is required");

  const hashedVerificationToken = createHmac("sha256", process.env.JWT_SECRET)
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedVerificationToken,
    emailVerificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new apiError(400, "token is invalid or expired");

  user.isEmailVerified = true;

  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, undefined, "Email verification complete"));
});

export const resendVerificationMail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) throw new apiError(404, "User doesn't exist");

  if (user.isEmailVerified)
    throw new apiError(409, "Email is already verified");
  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  sendMail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationTemplate(
      user.userName,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  }).catch((error) => {
    console.error("Email verification message was not sent:", error);
  });

  return res
    .status(200)
    .json(new apiResponse(200, null, "Verification email sent successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.body.refreshToken || req.cookies.refreshToken;
  if (!incomingRefreshToken) throw new apiError(401, "Unauthorized request");

  // Only jwt.verify needs the try/catch — it's the only thing that
  // throws for a genuinely "bad token" reason (malformed/expired signature)
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (err) {
    throw new apiError(401, "Invalid or expired refresh token");
  }

  const currentUser = await User.findById(decodedToken._id);
  if (!currentUser) throw new apiError(401, "Invalid token");

  if (incomingRefreshToken !== currentUser.refreshToken) {
    // Mismatch = either a stale token (old tab, harmless) or a stolen
    // token being reused (malicious). Since you're on single-session
    // storage right now, treat it as reuse and force re-login —
    // safer default until you move to per-session tokens.
    currentUser.refreshToken = undefined;
    await currentUser.save({ validateBeforeSave: false });
    throw new apiError(
      401,
      "Refresh token expired or already used, please login again",
    );
  }

  const { accessToken, refreshToken: newRefreshToken } = await tokenGenerator(
    currentUser._id,
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new apiResponse(200, { accessToken }, "Access token refreshed"));
});

export const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) throw new apiError(404, "user with the given email doesn't exist");

  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  sendMail({
    email: user.email,
    subject: "Password Reset",
    mailgenContent: forgotPasswordEmailTemplate(
      user.userName,
      `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password/${unhashedToken}`,
    ),
  }).catch((error) => {
    console.error("Password reset message was not sent:", error);
  });
  console.log(unhashedToken);
  return res.status(200).json(new apiResponse(200, {}, "Check your inbox "));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashedforgotPasswordToken = createHmac("sha256", process.env.JWT_SECRET)
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedforgotPasswordToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new apiError(401, "token is invalid or expired");

  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password has been reset successfully"));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  const isCurrentPasswordValid = await user.verifyPassword(currentPassword);

  if (!isCurrentPasswordValid) {
    throw new apiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  user.refreshToken = undefined;

  await user.save();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Password changed successfully"));
});
