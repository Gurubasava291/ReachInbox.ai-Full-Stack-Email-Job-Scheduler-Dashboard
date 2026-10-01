import { Router } from 'express';
import { googleAuthHandler, getCurrentUserHandler } from '../controllers/authController';

const router = Router();

router.post('/google', googleAuthHandler);
router.get('/me', getCurrentUserHandler);

export default router;
