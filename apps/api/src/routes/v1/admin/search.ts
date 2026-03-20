import { Router, type IRouter } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { createSynonymGroup, listSynonymGroups, deleteSynonymGroup } from "../../../services/synonym.js";

export const adminSearchRouter: IRouter = Router();

adminSearchRouter.use(authenticate, requirePermission("search:manage"));

const createSynonymSchema = z.object({
  words: z.array(z.string().min(1)).min(2, "At least 2 words required"),
});

adminSearchRouter.post("/synonyms", async (req, res, next) => {
  try {
    const { words } = createSynonymSchema.parse(req.body);
    const group = await createSynonymGroup(words);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

adminSearchRouter.get("/synonyms", async (_req, res, next) => {
  try {
    const groups = await listSynonymGroups();
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
});

adminSearchRouter.delete("/synonyms/:id", async (req, res, next) => {
  try {
    await deleteSynonymGroup(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});
