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
    projects : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref : "Project",
            required: true
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
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

const User = mongoose.model("User", userSchema);
export default User;