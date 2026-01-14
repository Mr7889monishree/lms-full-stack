import express from 'express'
import { getAllCourse, getCourseId } from '../controllers/courseController.js';
import { getCertificate } from '../controllers/certificateController.js';


const courseRouter = express.Router()

// Get All Course
courseRouter.get('/all', getAllCourse)

// Get Course Data By Id
courseRouter.get('/:id', getCourseId)

courseRouter.post('/get-certificate',getCertificate);

export default courseRouter;