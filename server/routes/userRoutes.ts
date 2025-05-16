const express = require("express")
// Import the required controllers and middleware functions
const  {
    verifySignUp,
    sendOTP,
    verifyOTP,
    login,
    changePassword,
    userDetails,
    logout
} = require('../controllers/Auth')

import { auth } from '../middleware/auth'

const router = express.Router()


// Route for user login
router.post("/login", login)

// Route to verify info entered by user while signup
router.post("/verifySignup", verifySignUp)

// Route for sending OTP to the user's email
router.post("/sendotp", sendOTP)

// Route for verifying OTP and signup
router.post("/verifyotp" , verifyOTP);

// Route for changing the password
router.post("/changepassword", auth, changePassword)

// Route for getting user details
router.get("/getDetails",auth,userDetails);

router.post("/logout",auth,logout);

// Route for generating a reset password token
// router.post("/reset-password-token", resetPasswordToken)

// Route for resetting user's password after verification
// router.post("/reset-password", resetPassword)

// Export the router for use in the main application
export default router
