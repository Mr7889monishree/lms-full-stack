import { getAuth } from "@clerk/express"
import Course from "../models/Course.js"
import { CourseProgress } from "../models/CourseProgress.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import stripe from "stripe"



// Get User Data
export const getUserData = async (req, res) => {
    try {

        const {userId} = getAuth(req);

        const user = await User.findById(userId)

        if (!user) {
            return res.json({ success: false, message: 'User Not Found' })
        }

        res.json({ success: true, user })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const { userId } = getAuth(req);

    const course = await Course.findById(courseId);
    const user = await User.findById(userId);

    if (!course || !user) {
      return res.status(404).json({
        success: false,
        message: "User or Course not found",
      });
    }

    // ✅ calculate amount as NUMBER
    const finalAmount =
      course.coursePrice -
      (course.discount * course.coursePrice) / 100;

    // ✅ create purchase with explicit status
    const purchase = await Purchase.create({
      courseId: course._id,
      userId,
      amount: Number(finalAmount.toFixed(2)),
      status: "pending",
    });

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripeInstance.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY.toLowerCase(),
            product_data: {
              name: course.courseTitle,
            },
            // ✅ Stripe requires cents (NO floor)
            unit_amount: Math.round(purchase.amount * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        purchaseId: purchase._id.toString(),
      },

      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
    });

    return res.json({
      success: true,
      session_url: session.url,
    });

  } catch (error) {
    console.error("Purchase error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Users Enrolled Courses With Lecture Links
export const userEnrolledCourses = async (req, res) => {

    try {

        const {userId} = getAuth(req);

        const userData = await User.findById(userId)
            .populate('enrolledCourses')

        res.json({ success: true, enrolledCourses: userData.enrolledCourses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {

    try {

        const {userId} = getAuth(req);

        const { courseId, lectureId } = req.body

        const progressData = await CourseProgress.findOne({ userId, courseId })

        if (progressData) {

            if (progressData.completedLectures.includes(lectureId)) {
                return res.json({ success: true, message: 'Lecture Already Completed' })
            }

            progressData.completedLectures.push(lectureId)
            await progressData.save()

        } else {

            await CourseProgress.create({
                userId,
                courseId,
                completedLectures: [lectureId]
            })

        }

        res.json({ success: true, message: 'Progress Updated' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// get User Course Progress
export const getUserCourseProgress = async (req, res) => {

    try {

        const {userId} = getAuth(req);

        const { courseId } = req.body

        const progressData = await CourseProgress.findOne({ userId, courseId })

        res.json({ success: true, progressData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add User Ratings to Course
export const addUserRating = async (req, res) => {

    const {userId} = getAuth(req);
    const { courseId, rating } = req.body;

    // Validate inputs
    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'InValid Details' });
    }

    try {
        // Find the course by ID
        const course = await Course.findById(courseId);

        if (!course) {
            return res.json({ success: false, message: 'Course not found.' });
        }

        const user = await User.findById(userId);

        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: 'User has not purchased this course.' });
        }

        // Check is user already rated
        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId);

        if (existingRatingIndex > -1) {
            // Update the existing rating
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            // Add a new rating
            course.courseRatings.push({ userId, rating });
        }

        await course.save();

        return res.json({ success: true, message: 'Rating added' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

//SUBMIT QUIZ TO COURSE(STUDENT)
export const submitQuizController = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { courseId, answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.json({ success: false, message: "Invalid answers format" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: "Course not found" });
    }

    const quiz = course.quiz || [];
    const totalQuestions = quiz.length;

    if (totalQuestions === 0) {
      return res.json({ success: false, message: "No quiz available" });
    }

    let correct = 0;

    quiz.forEach((q, index) => {
      const userAnswerText = answers[index]; // "Paris"
      if (!userAnswerText) return;

      // Find index of the selected option
      const selectedIndex = q.options.findIndex(
        opt => opt.toString().trim() === userAnswerText.toString().trim()
      );

      // Compare with stored correctAnswer index
      if (selectedIndex === q.correctAnswer) {
        correct++;
      }
    });

    const passed = correct / totalQuestions >= 0.5;

    const progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      return res.json({ success: false, message: "Course progress not found" });
    }

    progress.quizPassed = passed;

    const totalLectures = course.courseContent.reduce(
      (acc, chapter) => acc + chapter.chapterContent.length,
      0
    );

    if (progress.completedLectures.length === totalLectures && passed) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    await progress.save();

    res.json({
      success: true,
      passed,
      correct,
      totalQuestions,
      message: passed ? "Quiz passed!" : "Quiz failed. Try again!",
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};


