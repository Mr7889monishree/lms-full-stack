import { CourseProgress } from "../models/CourseProgress.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import axios from "axios";
import Feedback from "../models/Feedback.js";

export const getCertificate = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: "userId and courseId are required" });
    }

    // Fetch course progress
    let progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      return res.status(404).json({ error: "Course progress not found" });
    }

    // If certificate URL already exists (final), return it
    if (progress.certificateUrl) {
      return res.status(200).json({ success: true, download_url: progress.certificateUrl });
    }

    // Otherwise, generate via PDFMonkey
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({ error: "User or course not found" });
    }

    const payload = {
      name: user.name,
      course: course.courseTitle,
      date: new Date().toISOString().split("T")[0]
    };

    const metadata = { userId: user._id, courseId: course._id };

    const response = await axios.post(
      "https://api.pdfmonkey.io/api/v1/documents",
      {
        document: {
          document_template_id: process.env.PDFMONKEY_TEMPLATE_ID,
          payload,
          metadata
        }
      },
      { headers: { Authorization: `Bearer ${process.env.PDFMONKEY_API_KEY}` } }
    );

    const doc = response.data.document;

    // Save preview URL immediately so user sees something
    const finalUrl =doc.preview_url;
    progress.certificateUrl = finalUrl;
    await progress.save();

    res.status(200).json({ success: true, download_url: doc.preview_url });

  } catch (err) {
    console.error("Get Certificate error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const postFeeback = async (req, res) => {
  try {
    const { name, email, message, rating,profileImage } = req.body;
    if (!message || !name) return res.status(400).json({ error: 'Name and message required' });

    const feedback = new Feedback({ name, email, message, rating: rating || 5,
      profileImage
    });
    await feedback.save();

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error('Feedback creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


export const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(feedbacks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};