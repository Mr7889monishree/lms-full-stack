import express from 'express'
import { addUserRating, getUserCourseProgress, getUserData, purchaseCourse, submitQuizController, updateUserCourseProgress, userEnrolledCourses } from '../controllers/userController.js';


const userRouter = express.Router()

// Get user Data
userRouter.get('/data', getUserData)
userRouter.post('/purchase', purchaseCourse)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/update-course-progress', updateUserCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)
userRouter.post('/submit-quiz',submitQuizController)
export default userRouter;