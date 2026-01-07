import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
  userId: {
    type: String, // Clerk userId is string → OK
    required: true,
    index: true
  },

  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },

  completedLectures: [
    {
      type:String 
    }
  ],

  isCompleted: {
    type: Boolean,
    default: false
  },

  completedAt: {
    type: Date
  },

  certificateUrl: {
    type: String
  },
  quizPassed: { type: Boolean, default: false }


}, { timestamps: true });

export const CourseProgress = mongoose.model(
  'CourseProgress',
  courseProgressSchema
);
