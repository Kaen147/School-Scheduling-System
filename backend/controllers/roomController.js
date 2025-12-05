import Room from '../models/roomModel.js';
import Schedule from '../models/scheduleModel.js';

export const addRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const updated = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Room not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Check availability for a room during a given day/time window (simple overlap check)
export const checkRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params; // room id
    const { day, startTime, endTime, courseId, yearLevel, semester, excludeScheduleId } = req.query;

    if (!day || !startTime || !endTime) {
      return res.status(400).json({ message: 'day, startTime and endTime are required' });
    }

    // Convert times to minutes for numeric comparison
    function timeToMinutes(t) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    // Find schedules that are active and in the same semester/year/course (or global) that contain events using this room
    const schedules = await Schedule.find({ isActive: true });

    let conflicts = [];

    for (const s of schedules) {
      for (const ev of s.events || []) {
        // compare room by name or by room id if you've migrated
        if (!ev.room) continue; // skip if event has no room reference yet
        // if ev.room is an id or object, compare
        const roomMatches = ev.room.toString() === id.toString();
        if (!roomMatches) continue;
        if (ev.day !== day) continue;

        const [sh, sm] = ev.startTime.split(':').map(Number);
        const [eh, em] = ev.endTime.split(':').map(Number);
        const evStart = sh * 60 + sm;
        const evEnd = eh * 60 + em;

        const overlap = startMin < evEnd && evStart < endMin;
        if (overlap) {
          conflicts.push({ scheduleId: s._id, scheduleName: s.name, event: ev });
        }
      }
    }

    res.json({ available: conflicts.length === 0, conflicts });
  } catch (err) {
    console.error('checkRoomAvailability error', err);
    res.status(500).json({ message: err.message });
  }
};
