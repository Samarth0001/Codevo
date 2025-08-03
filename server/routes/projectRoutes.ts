const express = require("express")
const router = express.Router();
import { copyProject } from "../controllers/copyProject";
import { createProject, getProjectDetails, joinProject, checkProjectStatus, updateProjectLastModified } from "../controllers/CreateProject";
import { createTemplate, getTemplates } from "../controllers/CreateTemplate";

router.post('/copyProject', copyProject);
router.post('/createProject', createProject);
router.post('/createTemplate', createTemplate);
router.get('/getTemplates', getTemplates);
router.get('/project/:projectId', getProjectDetails);
router.get('/projectStatus/:projectId', checkProjectStatus);
router.post('/joinProject', joinProject);
router.post('/updateProjectLastModified', updateProjectLastModified);


export default router;