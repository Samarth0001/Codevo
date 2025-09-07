// const express = require("express")
import express from 'express';
// Import the required controllers and middleware functions
import {
    verifySignUp,
    sendOTP,
    verifyOTP,
    login,
    userDetails,
    logout
} from '../controllers/Auth'
import { getCommitStatistics } from '../controllers/UserStats'
import { updateProfile, getProfile } from '../controllers/ProfileController'

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

// Route for getting user details
router.get("/getDetails",auth, userDetails);

// Route for getting commit statistics
router.get("/commit-stats", auth, getCommitStatistics);

// Route for getting profile information
router.get("/profile", auth, getProfile);

// Route for updating profile
router.put("/profile", auth, updateProfile);

router.post("/logout",auth,logout);

// Route for generating a reset password token
// router.post("/reset-password-token", resetPasswordToken)

// Route for resetting user's password after verification
// router.post("/reset-password", resetPassword)

// Export the router for use in the main application
export default router
