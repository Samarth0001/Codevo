import { Request,Response } from 'express';
import User from '../models/User'
import OTP from '../models/OTP';
import otpGenerator from "otp-generator"
import Profile from '../models/Profile'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mailSender from '../utils/mailSender'

// Whole Standard signUp process
// First user will fill details on signup page, then details will be verified in both frontend and backend
// ,after validation of details by verifySignUp, otp will be send by sendOTP and and then otp will be 
// verified by verifyOTP.

// Verifying details of signup page.
const verifySignUp = async(req : Request,res : Response) => {
    try{
        // fetch the details
        const {username, email, password, confirmPassword} = req.body;

        // verify if all fields are non empty
        if(!username || !email || !password || !confirmPassword){
            return res.status(403).json({
                success: false,
                message: "All Fields are required!"
            })
        }
        console.log("before email validation")
        // validations on email using Regex
        // const emailTest = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-z]{2,6}$/
        const regex = /^[a-zA-Z0-9._-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com|icloud\.com|rediffmail\.com|bsnl\.in)$/i;
        if(regex.test(email)){
            console.log("Email is valid");
        }
        else{
            console.log("Email is not valid!");
            return res.status(400).json({
                success: false,
                message: "Email is not valid!"
            })
        }
        console.log("after email validation")


        // validations on password
        if(password !== confirmPassword){
            return res.status(400).json({
                success: false,
                message: "Password and Confirm password do not match!"
            })
        }

        // check strength of password
        // password should contain atleast 1 uppercase ,1 lowercase alphabet and 1 digit and can contain special chars also.
        // password length must be greater than 3(equal to 4 or more)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d !"#$%&'()*+,-.\/:;<=>?@[\\\]^_`{|}~]{5,}$/;
        if(passwordRegex.test(password)){
            console.log("Password is valid");
        }
        else{ 
            console.log("Password is not valid!");
            return res.status(400).json({
                success: false,
                message: "Password is not valid!"
            })
        }
        console.log("after pass validation")

        // Check if user already exists or not
        const existingUser = await User.findOne({email: email});
        if(existingUser){
            return res.status(401).json({
                success: false,
                message : "User already registered. Please Login!"
            })
        }

        console.log("found user")
        // User details are verified and now otp can be sent to user
        res.status(200).json({
            success: true,
            message: "User Details Verified successfully"
        })
    }
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Error while verifying user Details!"
        })
    }
}

// sendOTP , To send OTP before signing up and making entry in DB
const sendOTP = async(req: Request,res: Response) => {
    try{
        const {email} = req.body;

        // check if user already exists
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(401).json({
                success: false,
                message : "User already registered. Please Login!"
            })
        }

        //OTP Generation
        let otp = otpGenerator.generate(6,{
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets : false,
            specialChars: false
        })
        console.log("OTP Generated : ",otp);

        // Make sure otp is unique.
        let existingOTP = await OTP.findOne({OTP:otp});
        while(existingOTP){
            otp = otpGenerator.generate(6,{
                digits: true,
                lowerCaseAlphabets: false,
                upperCaseAlphabets : false,
                specialChars: false
            });
            existingOTP = await OTP.findOne({OTP:otp});
        }

        // Make an entry of otp in DB
        const otpBody = await OTP.create({
            email,
            OTP: otp
        });
        console.log(otpBody);

        res.status(200).json({
            success: true,
            message : "OTP Sent Successfully",
            OTP : otp
        })
    }
    catch(err:any){
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Error in sending OTP!",
            error : err.message
        })
    }
}

// verifying otp and creating an entry for user
const verifyOTP = async(req: Request,res: Response) => {
    try{
        const {username, password , email, otp} = req.body;

        // bring all otps with this email, and sort in decreasing order on basis of createdAt and bring 
        // only 1 otp document from it.
        let recentotpArray = await OTP.find({email: email}).sort({createdAt:-1}).limit(1);
        let recentotp = recentotpArray[0];
        console.log("otp" ,recentotp);
        console.log(otp)

        if(recentotp === null){
            return res.status(400).json({
                success: false,
                message: "OTP not found!"
            })
        }
        else if(otp !== recentotp?.OTP){
            return res.status(400).json({
                success: false,
                message: "Invalid OTP!"
            })
        }
        console.log("after verify otp")
        // As otp is matched, so now we can create entry of user in DB
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create user Profile, as its ref will be put in User document.
        const userProfile = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about : null,
            contactNumber: null
        })
        console.log('signup data')
        // create user entry in DB
        const user = await User.create({
            name:username, email,
            password : hashedPassword,
            accountType: "Free", 
            additionalDetails : userProfile._id,
            projects: [],
            image: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`
        })

        res.status(200).json({
            success: true,
            message: "User is registered successfully",
            user
        })
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "User cannot be registered! Please try again."
        })
    }
}

const login = async(req: Request,res: Response) => {
    try{
        const {email, password, isRemembered} = req.body;

        if(!email || !password){
            return res.status(400).json({
                success : false,
                message: "Please fill all the details carefully!"
            })
        }
        const registeredUser = await User.findOne({email: email}).populate("additionalDetails");

        if(!registeredUser){
            return res.status(401).json({
                success : false,
                message: "User is not registered! Sign Up First"
            })
        }

        if (!registeredUser.password) {
            return res.status(400).json({
                success: false,
                message: "Password is not set for this account. Try logging in with Github",
            });
        }
        // match passwords
        if(!await bcrypt.compare(password , registeredUser?.password)){
            return res.status(401).json({
                success : false,
                message: "Password do not match!"
            })
        }
        const payload = {
            email : registeredUser.email,
            id : registeredUser._id,
            role: registeredUser.accountType
        }

        // create jwt token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const token = await jwt.sign(
            payload, 
            jwtSecret,
            {
                expiresIn: (isRemembered? '7d' : '3d')
            }
        )

        let user = registeredUser.toObject();
        user.password = undefined;


        const cookieOptions = {
            expires: isRemembered ? new Date(Date.now() + 7*24*60*60*1000) : new Date(Date.now() + 3*24*60*60*1000),
            httpOnly: true,
        }
        res.cookie("MyCookie" , token , cookieOptions).json({
            success: true,
            user : user,
            message: "Logged In Successfully"
        })
    }
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Unable to Login! Please try again"
        })
    }
}

interface AuthenticationRequest extends Request{
    user?: any;
}
const changePassword = async(req:AuthenticationRequest ,res: Response) => {
    try{
        const userID = req.user.id;
        const {oldPassword, newPassword, confirmNewPassword} = req.body;

        if(!userID || !oldPassword || !newPassword || !confirmNewPassword){
            return res.status(400).json({
                success : false,
                message: "Please fill all the details carefully!"
            })
        }
        // Check if user exists or not
        const user = await User.findById(userID);
        if(!user){
            return res.status(403).json({
                success : false,
                message: "User is not registerd!"
            })
        }

        if(!user.password){
            console.log("Please enter the password!")
            return res.status(403).json({
                success : false,
                message: "Password is not valid!"
            })
        }
        // match the oldPassword from user's password
        if(! await bcrypt.compare(oldPassword, user.password)){
            return res.status(401).json({
                success : false,
                message: "Password do not match!"
            })
        }

        // Perform validations on newPassword
        if(newPassword !== confirmNewPassword){
            return res.status(400).json({
                success: false,
                message: "Password and Confirm password do not match!"
            })
        }

        // check strength of password
        // password should contain atleast 1 uppercase ,1 lowercase alphabet and 1 digit and can contain special chars also.
        // password length must be greater than 3(equal to 4 or more)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d !"#$%&'()*+,-.\/:;<=>?@[\\\]^_`{|}~]{5,}$/;
        if(!passwordRegex.test(newPassword)){
            console.log("Password is not valid!");
            return res.status(400).json({
                success: false,
                message: "Password is not valid!"
            })
        }
        else{
            console.log("Password is valid");
            // Hash the password
            const hashedPassword = await bcrypt.hash(newPassword,10);
            // Update the password in DB
            const updatedUser = await User.findByIdAndUpdate(userID , {password: hashedPassword}, {new:true});
            console.log(updatedUser);

            // Send email of password Updation
            if(!updatedUser){
                return res.status(403).json({
                    success : false,
                    message: "Not a valid user"
                })
            }
            const email = updatedUser?.email;
            const title = `Password Updated Successfully`;
            const body = `<b>Congratulations,</b> <br/>Your password for Codevo has been updated successfully!`;
            try{
                let mailResponse = await mailSender(email,title,body);
                console.log("Email sent successfully", mailResponse);
            }
            catch(err){
                console.log("Error while sending changed password mail : ", err);
                throw err;
            }

            res.status(200).json({
                success: true,
                message: "Password Changed Successfully"
            })
        }
    }
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Error while changing Password!"
        })
    }
}

// will return details of the user
const userDetails = async(req:AuthenticationRequest,res: Response) => {
    try{
        const userID = req.user.id;

        if(!userID){
            return res.status(400).json({
                success : false,
                message: "Invalid User ID!"
            })
        }
        // Check if user exists or not
        const user = await User.findById(userID).populate("additionalDetails");
        if(!user){
            return res.status(403).json({
                success : false,
                message: "User is not registerd!"
            })
        }

        res.status(200).json({
            success: true,
            user: user,
            message: "Details Fetched Successfully!"
        })
    }   
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Error while fetcing user details!"
        })
    }
}

const logout = (req:AuthenticationRequest ,res: Response) => {
    try {
      // Remove the token from the cookie
      res.clearCookie('MyCookie'); 

      // Respond with a success message
      return res.status(200).json({
        success: true,
        message: 'User logged out successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error during logout',
        error: error.message,
      });
    }
};
  
export {verifySignUp,verifyOTP,sendOTP,login, changePassword, userDetails,logout};