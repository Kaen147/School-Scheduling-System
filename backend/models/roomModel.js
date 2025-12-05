import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  type: { type: String, enum: ['classroom', 'laboratory', 'both'], default: 'classroom' },
  capacity: { type: Number, default: 0 },
  location: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

roomSchema.index({ name: 1 }, { unique: true });
roomSchema.index({ type: 1 });

export default mongoose.model('Room', roomSchema);
