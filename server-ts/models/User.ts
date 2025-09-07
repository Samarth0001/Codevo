import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
	name : {
		type: String, 
		required : true,
		trim: true
	},
	email : {
		type: String, 
		required : true,
		trim: true
	},
	password: {
		type: String, 
		required : false,   //false because of google signups, we don't need password in that
	},
	accountType:{
		type : String,
		enum : ['Free','Premium'],
		default: 'Free',
		required: true
	},
	premium: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Premium",          // Reference to Premium model
		default: null
	},
	additionalDetails : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Profile',
		required: true
	},
	// Link to multiple GitHub accounts
	githubAccounts: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'GithubAccount'
		}
	],
	// Role-based projects membership for the user (owner, reader, editor)
	projects: [
		{
			project: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Project",
				required: true
			},
			role: {
				type: String,
				enum: ['owner', 'reader', 'editor'],
				required: true
			},
			joinedAt: {
				type: Date,
				default: Date.now
			}
		}
	],
	favoriteTemplates : [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Template",
		}
	],
	image : {
		type: String,       //image url will be stored
		required: true,
	},
	token:{     //token to reset password
		type: String
	},
	resetPasswordExpires:{      //reset password link expiration
		type: Date
	},
	// AI quota tracking - separate for generation and explanation
	aiQuota: {
		generation: {
			dailyCalls: { type: Number, default: 0, required: true },
			lastResetDate: { type: Date, default: Date.now, required: true },
			maxDailyCalls: { type: Number, default: 25, required: true }
		},
		explanation: {
			dailyCalls: { type: Number, default: 0, required: true },
			lastResetDate: { type: Date, default: Date.now, required: true },
			maxDailyCalls: { type: Number, default: 30, required: true }
		}
	},
	// Commit tracking - store monthly commit counts
	commitStats: {
		totalCommits: { type: Number, default: 0, required: true },
		monthlyCommits: [{
			year: { type: Number, required: true },
			month: { type: Number, required: true }, // 0-11 (JavaScript month format)
			count: { type: Number, default: 0, required: true },
			lastUpdated: { type: Date, default: Date.now }
		}]
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
})

const User = mongoose.model("User", userSchema);
export default User;