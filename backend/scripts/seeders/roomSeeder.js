import Room from '../../models/roomModel.js';

export const rooms = [
  { name: 'Room 101', code: 'R101', type: 'classroom', capacity: 40, location: 'Building A, 1st Floor' },
  { name: 'Room 102', code: 'R102', type: 'classroom', capacity: 40, location: 'Building A, 1st Floor' },
  { name: 'Room 201', code: 'R201', type: 'classroom', capacity: 35, location: 'Building A, 2nd Floor' },
  { name: 'Computer Lab 1', code: 'CL1', type: 'laboratory', capacity: 30, location: 'Building B, 1st Floor' },
  { name: 'Computer Lab 2', code: 'CL2', type: 'laboratory', capacity: 30, location: 'Building B, 1st Floor' },
  { name: 'Science Lab', code: 'SL1', type: 'laboratory', capacity: 25, location: 'Building B, 2nd Floor' },
  { name: 'Lecture Hall A', code: 'LHA', type: 'classroom', capacity: 100, location: 'Main Building' }
];

export async function seedRooms() {
  console.log('🏫 Seeding Rooms...');
  for (const room of rooms) {
    await Room.findOneAndUpdate(
      { name: room.name },
      room,
      { upsert: true, new: true }
    );
  }
  console.log(`   ✅ ${rooms.length} rooms seeded\n`);
}
