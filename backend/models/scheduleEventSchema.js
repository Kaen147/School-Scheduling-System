import mongoose from 'mongoose';

const scheduleEventSchema = new mongoose.Schema({
	day: {
		type: String,
		required: true,
		enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
	},
	startTime: {
		type: String,
		required: true,
		match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
	},
	endTime: {
		type: String,
		required: true,
		match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
	},
	subjectId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Subject',
		required: true
	},
	subjectName: { type: String, trim: true },
	subjectCode: { type: String, trim: true },
	sessionType: { type: String, required: true, enum: ['lecture','lab'], default: 'lecture' },
	room: { type: String, trim: true },
	assignedTeacher: {
		teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		teacherName: String
	}
});

export default scheduleEventSchema;
