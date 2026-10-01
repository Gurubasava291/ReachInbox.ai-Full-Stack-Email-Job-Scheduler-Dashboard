import { Router } from 'express';
import multer from 'multer';
import {
  scheduleEmailsHandler,
  getScheduledEmailsHandler,
  getSentEmailsHandler,
  searchEmailsHandler,
  cancelEmailJobHandler,
  parseCsvHandler,
  getQueueMetricsHandler,
  getConfigHandler,
  updateConfigHandler,
} from '../controllers/emailController';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/schedule', scheduleEmailsHandler);
router.get('/scheduled', getScheduledEmailsHandler);
router.get('/sent', getSentEmailsHandler);
router.get('/search', searchEmailsHandler);
router.delete('/:id', cancelEmailJobHandler);
router.post('/parse-csv', upload.single('file'), parseCsvHandler);
router.get('/queue-metrics', getQueueMetricsHandler);
router.get('/config', getConfigHandler);
router.post('/config', updateConfigHandler);

export default router;
