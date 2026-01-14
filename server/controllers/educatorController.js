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

        const {userId} = getAuth(req);

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }

        const parsedCourseData = await JSON.parse(courseData)

        parsedCourseData.educator = userId

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


export const deleteCourseController = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.json({ success: false, message: "Course not found" });

    // Optional: check if the logged-in educator owns this course
    // if (course.educator.toString() !== req.userId) return res.json({ success: false, message: "Unauthorized" });

    await Course.findByIdAndDelete(courseId);

    // Delete all course progress for this course
    await CourseProgress.deleteMany({ courseId });

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};