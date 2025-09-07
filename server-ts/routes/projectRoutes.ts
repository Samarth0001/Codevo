const express = require("express")
// import express from 'express';
const router = express.Router();
import { copyProject } from "../controllers/copyProject";
import { createProject, getProjectDetails, joinProject, checkProjectStatus, updateProjectLastModified, updateProjectDescription, deleteProject } from "../controllers/CreateProject";
import { createTemplate, getTemplates } from "../controllers/CreateTemplate";
import { auth } from "../middleware/auth";

router.post('/copyProject',auth, copyProject);
router.post('/createProject',auth, createProject);
router.post('/createTemplate',auth, createTemplate);
router.get('/getTemplates', getTemplates);
router.get('/project/:projectId',auth, getProjectDetails);
router.get('/projectStatus/:projectId', auth, checkProjectStatus);
router.post('/joinProject', auth, joinProject);
router.post('/updateProjectLastModified', auth, updateProjectLastModified);
router.put('/updateDescription', auth, updateProjectDescription);
router.delete('/deleteProject', auth, deleteProject);


export default router;