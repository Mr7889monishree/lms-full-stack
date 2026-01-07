import { v2 as cloudinary } from 'cloudinary'
import Course from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';
import { clerkClient, getAuth } from '@clerk/express'
import { CourseProgress } from '../models/CourseProgress.js';

// update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    // Get current user metadata from Clerk
    const user = await clerkClient.users.getUser(userId);
    const currentRole = user.publicMetadata?.role || 'student';

    // Toggle role
    const newRole = currentRole === 'educator' ? 'student' : 'educator';

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: newRole },
    });

    // Update MongoDB user role as well
    await User.findByIdAndUpdate(userId, { role: newRole });

    res.json({
      success: true,
      message: newRole === 'educator' 
        ? 'You are now an educator!' 
        : 'You are now a student again.',
      role: newRole
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const demoteRoleToStudent = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'student', // reset to student
      },
    });

    res.json({ success: true, message: 'Role changed to student', role: 'student' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};



// Add New Course
export const addCourse = async (req, res) => {

    try {

        const { courseData } = req.body

        const imageFile = req.file

        const educatorId = req.auth.userId

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }

        const parsedCourseData = await JSON.parse(courseData)

        parsedCourseData.educator = educatorId

        const newCourse = await Course.create(parsedCourseData)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        newCourse.courseThumbnail = imageUpload.secure_url

        await newCourse.save()

        res.json({ success: true, message: 'Course Added' })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }
}

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
    try {

        const {userId} = getAuth(req);

        const courses = await Course.find({ educator:userId })

        res.json({ success: true, courses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Educator Dashboard Data ( Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
    try {
        const {userId} = getAuth(req);

        const courses = await Course.find({educator: userId });

        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // Calculate total earnings from purchases
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        // Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents }
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            });
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        const {userId} = getAuth(req);

        // Fetch all courses created by the educator
        const courses = await Course.find({ educator:userId });

        // Get the list of course IDs
        const courseIds = courses.map(course => course._id);

        // Fetch purchases with user and course data
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle');

        // enrolled students data
        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({
            success: true,
            enrolledStudents
        });

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
};

//QUIZ CONTROLLERS- ADD QUIZ(EDUCATOR)
export const addQuizController = async (req, res) => {
  const {courseId,quiz} = req.body;
  const course = await Course.findById(courseId);

  if (!course) return res.json({ success: false, message: 'Course not found' });

  course.quiz = quiz; // overwrite or append
  await course.save();

  res.json({ success: true, message: 'Quiz added successfully', course });
};

//SUBMIT QUIZ TO COURSE(STUDENT)
export const submitQuizController = async (req, res) => {
    try{
    const { userId } = getAuth(req);
    const { courseId, answers } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.json({ success: false, message: 'Course not found' });

    let correct = 0;
    course.quiz.forEach((q, index) => {
        if (answers[index] === q.correctAnswer) correct++;
    });

    const passThreshold = 0.5;
    const passed = correct / totalQuestions >= passThreshold;
    const progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) return res.json({ success: false, message: 'Course progress not found' });
    progress.quizPassed = passed;
    await progress.save();

    res.json({
        success: true,
        passed,
        correct,
        totalQuestions,
        message: passed ? 'Quiz passed!' : 'Quiz failed. Try again!'
        });
    }catch(error){
        res.json({success:false,message:error.message});
    }
};
