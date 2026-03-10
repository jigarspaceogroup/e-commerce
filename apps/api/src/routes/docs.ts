import { Router, type IRouter } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger.js";

const docsRouter: IRouter = Router();

docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export { docsRouter };
