const express = require("express")
const router = express.Router();
import { copyProject } from "../controllers/copyProject";
import { createProject, getProjectDetails, joinProject, checkProjectStatus, updateProjectLastModified, updateProjectDescription, deleteProject } from "../controllers/CreateProject";
import { createTemplate, getTemplates } from "../controllers/CreateTemplate";
import { auth } from "../middleware/auth";

router.post('/copyProject', copyProject);
router.post('/createProject', createProject);
router.post('/createTemplate', createTemplate);
router.get('/getTemplates', getTemplates);
router.get('/project/:projectId', getProjectDetails);
router.get('/projectStatus/:projectId', checkProjectStatus);
router.post('/joinProject', joinProject);
router.post('/updateProjectLastModified', updateProjectLastModified);
router.put('/updateDescription', auth, updateProjectDescription);
router.delete('/deleteProject', auth, deleteProject);


export default router;