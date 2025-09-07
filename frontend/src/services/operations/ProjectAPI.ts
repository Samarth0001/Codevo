import { projectEndPoints } from '../apis'
import { apiConnector } from '../apiConnector';

const {
    COPY_PROJECT_API,
    CREATE_PROJECT_API,
    GET_TEMPLATES_API,
    GET_PROJECT_DETAILS_API,
    GET_PROJECT_STATUS_API,
    JOIN_PROJECT_API,
    UPDATE_PROJECT_API,
    DELETE_PROJECT_API,
} = projectEndPoints;

export const copyBaseCode = async(data: any,setLoading:any, navigate : (path: string) => void) => {
    try{
        // console.log(data)
        setLoading(true);
        await apiConnector("POST",COPY_PROJECT_API,data);
        // console.log("Project files copied successfully!");
        setLoading(false);
        const projectId = data.uniqueId;
        // console.log(projectId);
        navigate(`/coding/${projectId}`);
    }
    catch(err:any){
        // console.log("Error while copying base files ",err)
    }
}  

export const createProject = async(data: any,setLoading:any) => {
    try{
        // console.log('ProjectAPI - createProject called with:', data);
        setLoading(true);
        const response = await apiConnector("POST",CREATE_PROJECT_API,data);
        // console.log('ProjectAPI - createProject response:', response);
        setLoading(false);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while creating project ",err)
        setLoading(false);
        throw err;
    }
}

export const getTemplates = async() => {
    try{
        // console.log('Calling getTemplates API:', GET_TEMPLATES_API);
        const response = await apiConnector("GET",GET_TEMPLATES_API);
        // console.log('API response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while getting templates ",err)
        throw err;
    }
}

export const getProjectDetails = async(projectId: string) => {
    try{
        // console.log('ProjectAPI - getProjectDetails called for:', projectId);
        const response = await apiConnector("GET", `${GET_PROJECT_DETAILS_API}/${projectId}`);
        // console.log('ProjectAPI - getProjectDetails response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while getting project details ",err)
        throw err;
    }
}

export const joinProject = async(projectId: string, userId: string) => {
    try{
        // console.log('ProjectAPI - joinProject called for:', projectId, 'user:', userId);
        const response = await apiConnector("POST", JOIN_PROJECT_API, {
            projectId,
            userId
        });
        // console.log('ProjectAPI - joinProject response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while joining project ",err)
        throw err;
    }
}

export const checkProjectStatus = async(projectId: string) => {
    try{
        // console.log('ProjectAPI - checkProjectStatus called for:', projectId);
        const response = await apiConnector("GET", `${GET_PROJECT_STATUS_API}/${projectId}`);
        // console.log('ProjectAPI - checkProjectStatus response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while checking project status ",err)
        throw err;
    }
}

export const updateProjectDescription = async(projectId: string, description: string) => {
    try{
        // console.log('ProjectAPI - updateProjectDescription called for:', projectId, 'description:', description);
        const response = await apiConnector("PUT", UPDATE_PROJECT_API, {
            projectId,
            description
        });
        // console.log('ProjectAPI - updateProjectDescription response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while updating project description ",err)
        throw err;
    }
}

export const deleteProject = async(projectId: string) => {
    try{
        // console.log('ProjectAPI - deleteProject called for:', projectId);
        const response = await apiConnector("DELETE", DELETE_PROJECT_API, {
            projectId
        });
        // console.log('ProjectAPI - deleteProject response:', response);
        return response.data;
    }
    catch(err:any){
        // console.log("Error while deleting project ",err)
        throw err;
    }
}

