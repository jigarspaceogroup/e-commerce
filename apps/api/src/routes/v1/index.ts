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
import { searchRouter } from "./search.js";
import { oauthRouter } from "../oauth.js";
import { cartRouter } from "./cart.js";

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
v1Router.use("/search", searchRouter);
v1Router.use("/cart", cartRouter);

export { v1Router };
