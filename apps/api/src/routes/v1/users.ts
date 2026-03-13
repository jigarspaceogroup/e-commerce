import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  getProfile,
  updateProfile,
  initiateEmailChange,
  changePassword,
  initiatePhoneChange,
} from "../../services/user-profile.js";
import { sendSuccess } from "../../utils/response.js";
import { badRequest, unauthorized } from "../../middleware/error-handler.js";
import {
  updateProfileSchema,
  changeEmailSchema,
  changePasswordSchema,
  changePhoneSchema,
} from "../../schemas/user.js";

const usersRouter: IRouter = Router();

usersRouter.use(authenticate);

// ─── GET /users/me ──────────────────────────────────────────────────────────
usersRouter.get("/me", async (req: Request, res: Response) => {
  const profile = await getProfile(req.user!.sub);
  if (!profile) throw unauthorized("User not found");
  sendSuccess(res, profile);
});

// ─── PATCH /users/me ────────────────────────────────────────────────────────
usersRouter.patch(
  "/me",
  validate({ body: updateProfileSchema }),
  async (req: Request, res: Response) => {
    const updated = await updateProfile(req.user!.sub, req.body);
    sendSuccess(res, updated);
  },
);

// ─── POST /users/me/change-email ────────────────────────────────────────────
usersRouter.post(
  "/me/change-email",
  validate({ body: changeEmailSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await initiateEmailChange(req.user!.sub, req.body.newEmail, req.body.password);
      sendSuccess(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg === "Invalid password") throw unauthorized(msg);
      if (msg === "Email already in use") throw badRequest(msg);
      throw err;
    }
  },
);

// ─── POST /users/me/change-password ─────────────────────────────────────────
usersRouter.post(
  "/me/change-password",
  validate({ body: changePasswordSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
      sendSuccess(res, result);
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid current password") {
        throw unauthorized(err.message);
      }
      throw err;
    }
  },
);

// ─── POST /users/me/change-phone ────────────────────────────────────────────
usersRouter.post(
  "/me/change-phone",
  validate({ body: changePhoneSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await initiatePhoneChange(req.user!.sub, req.body.newPhone, req.body.password);
      sendSuccess(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg === "Invalid password") throw unauthorized(msg);
      if (msg === "Phone number already in use") throw badRequest(msg);
      throw err;
    }
  },
);

export { usersRouter };
