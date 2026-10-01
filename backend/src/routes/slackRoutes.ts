import { Router } from 'express';
import {
  saveSlackWebhookHandler,
  getSlackStatusHandler,
  disconnectSlackHandler,
  testSlackNotificationHandler,
  slackOAuthRedirectHandler,
  slackOAuthCallbackHandler,
} from '../controllers/slackController';

const router = Router();

router.post('/webhook', saveSlackWebhookHandler);
router.get('/status', getSlackStatusHandler);
router.post('/disconnect', disconnectSlackHandler);
router.post('/test', testSlackNotificationHandler);
router.get('/auth', slackOAuthRedirectHandler);
router.get('/callback', slackOAuthCallbackHandler);

export default router;
