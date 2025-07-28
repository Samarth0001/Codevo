const express = require("express")
const router = express.Router();
import { copyProject } from "../controllers/copyProject";
import { createProject } from "../controllers/CreateProject";

router.post('/copyProject', copyProject);
router.post('/createProject', createProject);
export default router;