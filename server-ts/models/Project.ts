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
	// GitHub repository integration
	github: {
		repositoryId: {
			type: String,
			default: null
		},
		repositoryName: {
			type: String,
			default: null
		},
		repositoryUrl: {
			type: String,
			default: null
		},
		defaultBranch: {
			type: String,
			default: 'main'
		},
		isConnected: {
			type: Boolean,
			default: false
		},
		lastSyncAt: {
			type: Date,
			default: null
		},
		// which account was used for this link
		account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'GithubAccount',
			default: null
		}
	},
	// Role-based collaborators for fine-grained access (owner, reader, editor)
	collaborators: [
		{
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				required: true
			},
			role: {
				type: String,
				enum: ['owner', 'reader', 'editor'],
				required: true
			},
			addedAt: {
				type: Date,
				default: Date.now
			}
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