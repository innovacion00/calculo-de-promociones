// Router del módulo auth. Se monta en /api/auth desde server.js.

import { Router } from 'express';
import { login, googleLogin, me, logout } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/google', googleLogin);
authRouter.get('/me', me);
authRouter.post('/logout', logout);
