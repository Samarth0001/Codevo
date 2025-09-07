import mongoose from "mongoose"

const profileSchema = new mongoose.Schema({
    gender:{
        type: String
    },
    dateOfBirth: {
        type: String
    },
    about:{
        type: String,
        maxLength : 500,
        trim: true,
    },
    bio: {
        type: String,
        maxlength: 300,
        trim: true,
    },
    contactNumber : {
        type : Number,
        trim : true,
    }
})

const Profile = mongoose.model("Profile" , profileSchema)
export default Profile