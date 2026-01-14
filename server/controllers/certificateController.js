import { CourseProgress } from "../models/CourseProgress.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import axios from "axios";

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
    const finalUrl = download_url || doc.preview_url;
    progress.certificateUrl = finalUrl;
    await progress.save();

    res.status(200).json({ success: true, download_url: doc.preview_url });

  } catch (err) {
    console.error("Get Certificate error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
