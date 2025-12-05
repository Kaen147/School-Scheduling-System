import express from 'express';
import {
  createOffering,
  listOfferings,
  getOffering,
  updateOffering,
  deleteOffering
} from '../controllers/subjectOfferingController.js';

const router = express.Router();

router.post('/', createOffering);
router.get('/', listOfferings);
router.get('/:id', getOffering);
router.patch('/:id', updateOffering);
router.delete('/:id', deleteOffering);

export default router;
