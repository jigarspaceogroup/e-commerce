import { Router, type IRouter } from "express";
import { authRouter } from "./auth.js";
import { adminAuthRouter } from "./admin-auth.js";
import { usersRouter } from "./users.js";
import { adminAuditLogRouter } from "./admin/audit-logs.js";
import { adminCategoryRouter } from "./admin/categories.js";
import { adminProductRouter } from "./admin/products.js";
import { adminInventoryRouter } from "./admin/inventory.js";
import { adminCustomerRouter } from "./admin/customers.js";
import { adminSearchRouter } from "./admin/search.js";
import { publicCategoryRouter } from "./categories.js";
import { publicProductRouter } from "./products.js";
import { oauthRouter } from "../oauth.js";

const v1Router: IRouter = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/auth", oauthRouter);
v1Router.use("/admin/auth", adminAuthRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/admin/audit-logs", adminAuditLogRouter);
v1Router.use("/admin/categories", adminCategoryRouter);
v1Router.use("/admin/products", adminProductRouter);
v1Router.use("/admin/inventory", adminInventoryRouter);
v1Router.use("/admin/customers", adminCustomerRouter);
v1Router.use("/admin/search", adminSearchRouter);
v1Router.use("/categories", publicCategoryRouter);
v1Router.use("/products", publicProductRouter);

export { v1Router };
