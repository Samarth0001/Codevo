import { Request, Response } from 'express';
import fs from "fs";
import yaml from "yaml";
import path from "path";
import mongoose from "mongoose";
import Project from '../models/Project';
import User from '../models/User';
import { userJoinedProject, isProjectActive } from '../services/activityTracker';
// const Template = require('../models/Template');
import Template from '../models/Template';

// Extend Request type to include user property from auth middleware
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

interface CreateProjectRequestBody {
    uniqueId: string;
  }

// Database operations function
const createProjectInDB = async (projectData: {
    uniqueId: string;
    projectName: string;
    description: string;
    templateId: string;
    userId: string;
    visibility: string;
    tags: string[];
}) => {
    const { uniqueId, projectName, description, templateId, userId, visibility, tags } = projectData;
    
    console.log('createProjectInDB - creating MongoDB document with templateId:', templateId);
    
    // 1. Create Project in MongoDB
    const projectDoc = await Project.create({
        projectId: uniqueId,
        projectName,
        description,
        template: templateId,
        projectCreater: userId, 
        visibility,
        tags,
        collaborators: [{ user: userId, role: 'owner', addedAt: new Date() }],
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
    });
    
    console.log('createProjectInDB - MongoDB document created:', projectDoc);
    
    // 2. Add project to user's projects array with role
    await User.findByIdAndUpdate(userId, { $push: { projects: { project: projectDoc._id, role: 'owner', joinedAt: new Date() } } });
    
    return projectDoc;
};


// Kubernetes operations function
const createKubernetesResources = async (projectId: string, baseCodePrefix: string, runnerImage: string) => {
    // Dynamic import for CommonJS compatibility
    const { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } = await import("@kubernetes/client-node");

    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromDefault();
    const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
    const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
    const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

    // Utility function to handle multi-document YAML files
    const readAndParseKubeYaml = (filePath: string, projectId: string): Array<any> => {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
            let docString = doc.toString();
            // Replace service name
            docString = docString.replace(new RegExp(`service_name`, 'g'), projectId);
            // Replace base code prefix for initContainer copy command
            docString = docString.replace(new RegExp(`BASE_CODE_PREFIX`, 'g'), baseCodePrefix);
            // Replace runner image
            docString = docString.replace(new RegExp(`RUNNER_IMAGE`, 'g'), runnerImage);
            // console.log(docString);
            return yaml.parse(docString);
        });
        return docs;
    };

    const namespace = "default"; // Assuming a default namespace, adjust as needed
    
    console.log('createKubernetesResources - creating K8s resources for project:', projectId);
    
    // Read and parse Kubernetes manifests
    const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), projectId);
    
    // Create Kubernetes resources with error handling for already exists
    for (const manifest of kubeManifests) {
        try {
            switch (manifest.kind) {
                case "Deployment":
                    await appsV1Api.createNamespacedDeployment({
                        namespace,
                        body: manifest
                    });
                    console.log(`createKubernetesResources - Created Deployment for ${projectId}`);
                    break;
                case "Service":
                    await coreV1Api.createNamespacedService({
                        namespace,
                        body: manifest
                    });
                    console.log(`createKubernetesResources - Created Service for ${projectId}`);
                    break;
                case "Ingress":
                    await networkingV1Api.createNamespacedIngress({
                        namespace,
                        body: manifest
                    });
                    console.log(`createKubernetesResources - Created Ingress for ${projectId}`);
                    break;
                default:
                    console.log(`createKubernetesResources - Unsupported kind: ${manifest.kind}`);
            }
        } catch (error: any) {
            // If resource already exists, log it and continue
            if (error.statusCode === 409) {
                console.log(`createKubernetesResources - ${manifest.kind} for ${projectId} already exists, skipping...`);
            } else {
                // Re-throw other errors
                throw error;
            }
        }
    }
    
    console.log('createKubernetesResources - All K8s resources created successfully for project:', projectId);
};

// Get project details by projectId
export const getProjectDetails = async (req: Request, res: Response) => {
    const { projectId } = req.params;

    try {
        const project = await Project.findOne({ projectId }).populate('template');
        
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            project: {
                projectId: project.projectId,
                projectName: project.projectName,
                description: project.description,
                templateId: project.template,
                visibility: project.visibility,
                tags: project.tags,
                collaborators: project.collaborators
            }
        });
    } catch (error: any) {
        console.error('Error getting project details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project details',
            error: error.message
        });
    }
};

// Join existing project (for invited users or returning users)
export const joinProject = async (req: Request, res: Response) => {
    const { projectId, userId } = req.body;

    try {
        // Check if project exists
        const project = await Project.findOne({ projectId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check if user is a collaborator
        if (!project.collaborators.some((c: any) => c.user?.toString() === userId || c.toString?.() === userId)) {
            return res.status(403).json({
                success: false,
                message: 'User is not a collaborator on this project'
            });
        }

        // Add to active projects in Redis
        await userJoinedProject(projectId, userId);

        res.status(200).json({
            success: true,
            message: 'Successfully joined project',
            project: {
                projectId: project.projectId,
                projectName: project.projectName,
                description: project.description,
                templateId: project.template,
                visibility: project.visibility,
                tags: project.tags
            }
        });
    } catch (error: any) {
        console.error('Error joining project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join project',
            error: error.message
        });
    }
};

// Check if project is active (using Redis)
export const checkProjectStatus = async (req: Request, res: Response) => {
    const { projectId } = req.params;

    try {
        // Check if project exists in database
        const project = await Project.findOne({ projectId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check if project is active using Redis
        const isActive = await isProjectActive(projectId);

        res.status(200).json({
            success: true,
            isActive,
            project: {
                projectId: project.projectId,
                projectName: project.projectName,
                description: project.description,
                templateId: project.template,
                visibility: project.visibility,
                tags: project.tags,
                collaborators: project.collaborators
            }
        });
    } catch (error: any) {
        console.error('Error checking project status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check project status',
            error: error.message
        });
    }
};

// Update project's last modified timestamp and user
export const updateProjectLastModified = async (req: Request, res: Response) => {
    const { projectId, userId, lastUpdatedAt } = req.body;

    try {
        const result = await Project.findOneAndUpdate(
            { projectId },
            {
                lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt) : new Date(),
                lastUpdatedBy: userId
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project last modified updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating project last modified:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project last modified',
            error: error.message
        });
    }
};

// Main controller function
export const createProject = async(req: Request, res: Response): Promise<any> => {
    const { uniqueId, projectName, description = '', templateId, userId, visibility = 'private', tags = [] } = req.body;

    console.log('CreateProject - received data:', {
        uniqueId,
        projectName,
        description,
        templateId,
        userId,
        visibility,
        tags 
    });

    // Validate that templateId is a valid MongoDB ObjectId
    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
        console.error('CreateProject - Invalid templateId:', templateId);
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid templateId provided' 
        });
    }

    // Validate that userId is a valid MongoDB ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error('CreateProject - Invalid userId:', userId);
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid userId provided' 
        });
    }

    try {
        // Check if project already exists in database
        const existingProject = await Project.findOne({ projectId: uniqueId });
        
        let projectDoc;
        
        if (existingProject) {
            // Project exists, just create Kubernetes resources
            console.log('CreateProject - Project exists, creating only Kubernetes resources');
            projectDoc = existingProject;
        } else {
            // Project doesn't exist, create it in database
            console.log('CreateProject - Creating new project in database');
            projectDoc = await createProjectInDB({
                uniqueId,
                projectName,
                description,
                templateId,
                userId,
                visibility,
                tags
            });
        }

        // 2. Choose base code prefix and runner image based on template
        // Fetch template to determine slug or name
        const template = await Template.findById(templateId);
        const templateName: string = template?.name || '';
        const templateSlug: string = template?.slug || '';
        let baseCodePrefix = '';
        let runnerImage = '';
        
        if (existingProject) {
            // For existing projects, use the project's specific directory and template
            baseCodePrefix = `Project_Code/${uniqueId}/`;
            
            // Get the template from the existing project
            const existingTemplate = await Template.findById(existingProject.template);
            const existingTemplateName: string = existingTemplate?.name || '';
            const existingTemplateSlug: string = existingTemplate?.slug || '';
            
            // Set runner image based on the existing project's template
            if (existingTemplateName === 'React Javascript' || existingTemplateSlug === 'React Javascript') {
                runnerImage = 'extremecoder01/runner-react:v2';
            } else if (existingTemplateName === 'Node.js' || existingTemplateSlug === 'node-js') {
                runnerImage = 'extremecoder01/runner:v6';
            } else {
                // Default to node runner
                runnerImage = 'extremecoder01/runner:v6';
            }
            
            console.log('CreateProject - Using existing project directory:', baseCodePrefix, 'with template:', existingTemplateName);
        } else {
            // For new projects, use base template code
            // Map known templates using exact names/slugs
            if (templateName === 'React Javascript' || templateSlug === 'React Javascript') {
                baseCodePrefix = 'Base_Code/React Javascript/';
                runnerImage = 'extremecoder01/runner-react:v2';
            } else if (templateName === 'Node.js' || templateSlug === 'node-js') {
                baseCodePrefix = 'Base_Code/node-js/';
                runnerImage = 'extremecoder01/runner:v6';
            } else {
                // Default to node base code
                baseCodePrefix = 'Base_Code/node-js/';
                runnerImage = 'extremecoder01/runner:v6';
            }
            console.log('CreateProject - Using base template directory:', baseCodePrefix);
        }

        // 3. Create Kubernetes resources with templating
        await createKubernetesResources(uniqueId, baseCodePrefix, runnerImage);

        // 4. Add project to Redis active projects
        await userJoinedProject(uniqueId, userId);

        res.status(200).send({ 
            success: true,
            message: existingProject ? "Project resources created successfully" : "Project and resources created successfully", 
            project: projectDoc 
        });
    } catch (error: any) {
        console.error("Failed to create project or resources", error);
        res.status(500).send({ 
            success: false,
            message: "Failed to create project or resources",
            error: error.message 
        });
    }
};

export const updateProjectDescription = async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, description } = req.body;
    
    if (!projectId || description === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'Project ID and description are required' 
        });
    }

    try {
        const updatedProject = await Project.findOneAndUpdate(
            { projectId: projectId },
            { 
                description: description,
                lastUpdatedAt: new Date(),
                lastUpdatedBy: req.user?.id
            },
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ 
                success: false, 
                message: 'Project not found' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Project description updated successfully',
            project: updatedProject
        });
    } catch (error: any) {
        console.error('Error updating project description:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update project description',
            error: error.message 
        });
    }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.body;
    
    if (!projectId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Project ID is required' 
        });
    }

    try {
        // Find the project first to get the user ID
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ 
                success: false, 
                message: 'Project not found' 
            });
        }

        // Check if the user is the project creator or has permission
        if (project.projectCreater.toString() !== req.user?.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have permission to delete this project' 
            });
        }

        // Remove project membership from users' projects array
        await User.updateMany(
            { 'projects.project': project._id },
            { $pull: { projects: { project: project._id } } }
        );

        // Delete the project from database
        await Project.findByIdAndDelete(project._id);

        // TODO: Clean up Kubernetes resources
        // TODO: Clean up S3 files
        // TODO: Remove from Redis active projects

        res.status(200).json({ 
            success: true, 
            message: 'Project deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting project:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete project',
            error: error.message 
        });
    }
};