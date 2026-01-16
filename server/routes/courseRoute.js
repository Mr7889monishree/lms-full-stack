import express from 'express'
import { getAllCourse, getCourseId } from '../controllers/courseController.js';
import {getCertificate, getFeedbacks, postFeeback } from '../controllers/certificateController.js';


const courseRouter = express.Router()

// Get All Course
courseRouter.get('/all', getAllCourse)
courseRouter.post('/get-certificate',getCertificate);
courseRouter.post('/feedback',postFeeback);
courseRouter.get('/get-feedback',getFeedbacks);

// Get Course Data By Id
courseRouter.get('/:id', getCourseId)
export default courseRouter;