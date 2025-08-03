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
    description: {
        type: String,
        default: ''
    },
    visibility: {
        type: String,
        enum: ['private', 'public'],
        default: 'private'
    },
    tags: [
        {
            type: String
        }
    ],
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
    lastUpdatedAt: {
        type: Date,
        default: Date.now()
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    createdAt : {
        type: Date,
        default : Date.now(),
        required: true
    }
})

const Project = mongoose.model("Project", projectSchema)
export default Project