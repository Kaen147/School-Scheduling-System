import express from 'express';
import { addRoom, getRooms, getRoom, updateRoom, deleteRoom, checkRoomAvailability } from '../controllers/roomController.js';

const router = express.Router();

router.post('/', addRoom);
router.get('/', getRooms);
router.get('/:id', getRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);
// availability: GET /api/rooms/:id/availability?day=Monday&startTime=08:00&endTime=09:30
router.get('/:id/availability', checkRoomAvailability);

export default router;
