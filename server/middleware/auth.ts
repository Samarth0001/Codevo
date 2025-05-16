import { Request,Response,NextFunction } from "express";
import jwt from 'jsonwebtoken'

interface AuthenticationRequest extends Request{
    user?: any;
}
// authentication
export const auth = async(req : AuthenticationRequest,res : Response ,next: NextFunction) => {
    try{
        const token = req.cookies.MyCookie ||  req.header("Authorization")?.replace("Bearer ","");
        if(!token){
            return res.status(401).json({
                success: false,
                message: "Token Missing!"
            })
        }
        let decode;
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                throw new Error("JWT_SECRET is not defined in environment variables.");
            }
            decode = jwt.verify(token, secret);
        } catch (error: any) {
            console.error("JWT Verification Error:", error.message);
            return res.status(401).json({
                success: false,
                message: "Token is Invalid!",
                error: error.message
            });
        }
        req.user = decode;
        next();
    }
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Error in authenticating User!"
        })
    }
}

// isPremiumUser
export const isPremiumUser = async(req : AuthenticationRequest,res : Response ,next: NextFunction) => {
    try{
        const user = req.user;

        if(user.role !== 'Instructor'){
            return res.status(403).json({
                success: false,
                message: "Not authorized for instructor route!"
            })
        }
        next();
    }   
    catch(err){
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified! Please try again"
        })
    }
}


