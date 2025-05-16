import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    projectId :{
        type: String,
        required: true,
    },
    projectName:{
        type: String,
        required: true
    },
    projectCreater:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    template: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Template",  
        required: true
    },
    collaborators:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    createdAt : {
        type: Date,
        default : Date.now(),
        required: true
    }
})

const Project = mongoose.model("Project", projectSchema)
export default Project