import mongoose from "mongoose";
import mailSender from "../utils/mailSender";

const OTPSchema = new mongoose.Schema({
    email : {
        type: String,
        required: true,
    },
    OTP: {
        type: String,
        required: true,
    },
    createdAt : {
        type: Date,
        default : Date.now(),
        expires : 5*60  //After 5 minutes from createdAt value, whole document will be deleted.
    }
})

// sending verification email before creation of OTP object in database
async function sendVerificationEmail(email:string, otp:string) : Promise<void>{
    try{
        const body = `Thank You for showing your interest in Codevo <br/><center> Please enter this confirmation code <center/><br/> <center>OTP :<h4> ${otp} </h4><center/>`;
        const title = 'Verification Email from Codevo';
        const mailResponse = await mailSender(email,title , body);
        console.log("Email sent successfully!", mailResponse);
    }
    catch(err){
        console.log("Error while sending verification mail : ", err);
        throw err;
    }
}

OTPSchema.pre("save" , async function(next){
    await sendVerificationEmail(this.email, this.OTP);     
    next();
})

const OTP = mongoose.model("OTP" , OTPSchema);
export default OTP