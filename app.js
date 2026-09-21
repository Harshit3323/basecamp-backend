import express from "express";
import cors from "cors";
import { connectDb } from "./db/index.js";
import healthRouter from "./routes/healthCheck.router.js";
import userRouter from "./routes/user.router.js";
import { errorHandler } from "./middleware/error.middleware.js";
import cookieParser from "cookie-parser";
import projectRouter from "./routes/project.router.js";
import taskRouter from "./routes/task.router.js";
import noteRouter from "./routes/note.router.js";

const app = express();

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

connectDb();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/api/v1/healthcheck/", healthRouter);

app.use("/api/v1/auth/", userRouter);

app.use("/api/v1/projects/", projectRouter);
app.use("/api/v1/tasks/", taskRouter);
app.use("/api/v1/notes/", noteRouter);

app.use(errorHandler);

app.get("/", async (req, res) => {
  res.send("hello from db");
});

export default app;
