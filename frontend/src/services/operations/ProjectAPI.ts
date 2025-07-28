import { projectEndPoints } from '../apis'
import { apiConnector } from '../apiConnector';

const {
    COPY_PROJECT_API,
    CREATE_PROJECT_API
} = projectEndPoints;

export const copyBaseCode = async(data: any,setLoading:any, navigate : (path: string) => void) => {
    try{
        console.log(data)
        setLoading(true);
        await apiConnector("POST",COPY_PROJECT_API,data);
        console.log("Project files copied successfully!");
        setLoading(false);
        const projectId = data.uniqueId;
        console.log(projectId);
        navigate(`/coding/${projectId}`);
    }
    catch(err:any){
        console.log("Error while copying base files ",err)
    }
}  

export const createProject = async(data: any,setLoading:any) => {
    try{
        setLoading(true);
        await apiConnector("POST",CREATE_PROJECT_API,data);
        setLoading(false);
    }
    catch(err:any){
        console.log("Error while creating project ",err)
    }
}
