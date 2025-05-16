import { Request, Response } from 'express';
import { copyTemplateToProject } from "./aws";

// interface CreateProjectBody {
//     projectId: string;
//     title: string;
// }

export const copyProject = async(req: Request, res: Response) => {
    const {uniqueId, selectedTemplate} = req.body;

    if(!uniqueId || !selectedTemplate){
        return res.status(400).json({
            success: false,
            message: "Please fill all the details carefully!"
        })
    }

    await copyTemplateToProject(`base/${selectedTemplate}`,`code/${uniqueId}`)
}
