import mongoose from "mongoose";

const githubAccountSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	githubId: {
		type: String,
		required: true
	},
	username: {
		type: String,
		required: true
	},
	avatarUrl: {
		type: String,
		default: ''
	},
	accessToken: {
		type: String,
		required: true
	},
	refreshToken: {
		type: String,
		default: ''
	},
	tokenExpiresAt: {
		type: Date,
		default: null
	},
	scopes: {
		type: [String],
		default: []
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

// Ensure unique GitHub account per app user
githubAccountSchema.index({ user: 1, githubId: 1 }, { unique: true });

const GithubAccount = mongoose.model('GithubAccount', githubAccountSchema);
export default GithubAccount;
