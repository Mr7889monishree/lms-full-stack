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
    if (!progress) return res.status(404).json({ error: "Course progress not found" });

    // Return existing certificate URL if available
    if (progress.certificateUrl) {
      return res.status(200).json({ success: true, download_url: progress.certificateUrl });
    }

    // Fetch user and course data
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    if (!user || !course) return res.status(404).json({ error: "User or course not found" });

    // Prepare PDF payload
    const payload = {
      name: user.name,
      course: course.courseTitle,
      date: new Date().toISOString().split("T")[0]
    };

    // Create PDFMonkey document
    const response = await axios.post(
      "https://api.pdfmonkey.io/api/v1/documents",
      {
        document: { document_template_id: "5F4D15BD-BBF9-4D56-83B0-E07F21B7FD00", payload }
      },
      { headers: { Authorization: `Bearer ${process.env.PDFMONKEY_API_KEY}` } }
    );

    const doc = response.data?.document;
    if (!doc) return res.status(500).json({ success: false, error: "PDFMonkey response invalid" });

    // Use preview_url immediately
    const urlToUse = doc.download_url || doc.preview_url;
    if (!urlToUse) return res.status(500).json({ success: false, error: "No certificate URL available" });

    // Save to course progress
    progress.certificateUrl = urlToUse;
    await progress.save();

    res.status(200).json({ success: true, download_url: urlToUse });
  } catch (err) {
    console.error("Certificate generation error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
