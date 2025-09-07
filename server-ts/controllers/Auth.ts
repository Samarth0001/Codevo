import { Request,Response } from 'express';
import User from '../models/User'
import OTP from '../models/OTP';
import otpGenerator from "otp-generator"
import Profile from '../models/Profile'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mailSender from '../utils/mailSender'
import { getCookieOptions, getClearCookieOptions } from '../utils/cookieUtils'

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
            res.status(403).json({
                success: false,
                message: "All Fields are required!"
            });
            return;
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
            res.status(400).json({
                success: false,
                message: "Email is not valid!"
            });
            return;
        }
        console.log("after email validation")


        // validations on password
        if(password !== confirmPassword){
            res.status(400).json({
                success: false,
                message: "Password and Confirm password do not match!"
            });
            return;
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
            res.status(400).json({
                success: false,
                message: "Password is not valid!"
            });
            return;
        }
        console.log("after pass validation")

        // Check if user already exists or not
        const existingUser = await User.findOne({email: email});
        if(existingUser){
            res.status(401).json({
                success: false,
                message : "User already registered. Please Login!"
            });
            return;
        }

        console.log("found user")
        // User details are verified and now otp can be sent to user
        res.status(200).json({
            success: true,
            message: "User Details Verified successfully"
        })
    }
    catch(err){
        res.status(500).json({
            success: false,
            message: "Error while verifying user Details!"
        });
        return;
    }
}

// sendOTP , To send OTP before signing up and making entry in DB
const sendOTP = async(req: Request,res: Response) => {
    try{
        const {email} = req.body;

        // check if user already exists
        const existingUser = await User.findOne({email});
        if(existingUser){
            res.status(401).json({
                success: false,
                message : "User already registered. Please Login!"
            });
            return;
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
            res.status(400).json({
                success: false,
                message: "OTP not found!"
            });
            return;
        }
        else if(otp !== recentotp?.OTP){
            res.status(400).json({
                success: false,
                message: "Invalid OTP!"
            });
            return;
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
        res.status(500).json({
            success: false,
            message: "User cannot be registered! Please try again."
        });
        return;
    }
}

const login = async(req: Request,res: Response) => {
    try{
        const {email, password, isRemembered} = req.body;

        if(!email || !password){
            res.status(400).json({
                success : false,
                message: "Please fill all the details carefully!"
            });
            return;
        }
        const registeredUser = await User.findOne({email: email}).populate("additionalDetails");

        if(!registeredUser){
            res.status(401).json({
                success : false,
                message: "User is not registered! Sign Up First"
            });
            return;
        }

        if (!registeredUser.password) {
            res.status(400).json({
                success: false,
                message: "Password is not set for this account. Try logging in with Github",
            });
            return;
        }
        // match passwords
        if(!await bcrypt.compare(password , registeredUser?.password)){
            res.status(401).json({
                success : false,
                message: "Password do not match!"
            });
            return;
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


        const cookieOptions = getCookieOptions(isRemembered);
        res.cookie("MyCookie" , token , cookieOptions).json({
            success: true,
            user : user,
            message: "Logged In Successfully"
        })
    }
    catch(err){
        res.status(500).json({
            success: false,
            message: "Unable to Login! Please try again"
        });
        return;
    }
}

interface AuthenticationRequest extends Request{
    user?: any;
}

// will return details of the user
const userDetails = async(req:AuthenticationRequest,res: Response) => {
    try{
        const userID = req.user.id;

        if(!userID){
            res.status(400).json({
                success : false,
                message: "Invalid User ID!"
            });
            return;
        }
        // Check if user exists or not and populate projects with all necessary data
        const user = await User.findById(userID)
            .populate("additionalDetails")
            .populate({
                path: "projects.project",
                populate: [
                    { path: "template", select: "name description" },
                    { path: "projectCreater", select: "name email" },
                    { path: "collaborators.user", select: "name email" },
                    { path: "lastUpdatedBy", select: "name email" }
                ]
            });
        if(!user){
            res.status(403).json({
                success : false,
                message: "User is not registerd!"
            });
            return;
        }


        // Transform projects data to match frontend expectations
        const transformedProjects = user.projects.map((membership: any) => {
            const project = membership.project;
            return {
                id: project.projectId,
                name: project.projectName,
                description: project.description || `A ${project.template?.name || 'project'} created with Codevo`,
                language: project.template?.name || 'Unknown',
                lastUpdated: formatTimeAgo(project.lastUpdatedAt || project.createdAt),
                lastUpdatedBy: project.lastUpdatedBy?.name || project.projectCreater?.name || 'Unknown',
                stars: 0,
                forks: project.collaborators?.length || 0,
                projectId: project.projectId,
                templateId: project.template?._id || project.template,
                createdAt: project.createdAt,
                lastUpdatedAt: project.lastUpdatedAt || project.createdAt,
                visibility: project.visibility,
                tags: project.tags || [],
                ownerId: project.projectCreater?._id || project.projectCreater,
                ownerName: project.projectCreater?.name || 'Unknown',
                isOwner: membership.role === 'owner',
                role: membership.role,
            };
        });

        // Add transformed projects to user object
        const userWithProjects = {
            ...user.toObject(),
            projects: transformedProjects
        };

        res.status(200).json({
            success: true,
            user: userWithProjects,
            message: "Details Fetched Successfully!"
        })
    }   
    catch(err){
        res.status(500).json({
            success: false,
            message: "Error while fetcing user details!"
        });
        return;
    }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}m ago`;
}

const logout = (req:AuthenticationRequest ,res: Response) => {
    try {
      // Remove the token from the cookie with same options used for setting
      const cookieOptions = getClearCookieOptions();
      res.clearCookie('MyCookie', cookieOptions); 

      // Respond with a success message
      res.status(200).json({
        success: true,
        message: 'User logged out successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error during logout',
        error: error.message,
      });
    }
  };
  
export {verifySignUp,verifyOTP,sendOTP,login, userDetails,logout};