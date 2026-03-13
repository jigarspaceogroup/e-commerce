import { Router, type IRouter } from "express";
import { authRouter } from "./auth.js";
import { adminAuthRouter } from "./admin-auth.js";
import { usersRouter } from "./users.js";
import { adminAuditLogRouter } from "./admin/audit-logs.js";
import { adminCategoryRouter } from "./admin/categories.js";
import { publicCategoryRouter } from "./categories.js";
import { oauthRouter } from "../oauth.js";

const v1Router: IRouter = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/auth", oauthRouter);
v1Router.use("/admin/auth", adminAuthRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/admin/audit-logs", adminAuditLogRouter);
v1Router.use("/admin/categories", adminCategoryRouter);
v1Router.use("/categories", publicCategoryRouter);

export { v1Router };
