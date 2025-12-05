// backend/models/courseModel.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    abbreviation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
