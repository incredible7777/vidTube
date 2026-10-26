//this will verify the jwt token and attach the user data to req.user
//1.extract token
//2.verify token
//3.check if user is valid or not
//4.attach user to req.user

import {User} from "../models/user.models.js"
import { ApiError } from "../utils/ApiError"
import { asyncHandler } from "../utils/asyncHandler"

export const verifyJWT=asyncHandler(async(requestAnimationFrame,resizeBy,next)=>{
    try{
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
        if(!token){
            throw new ApiError(401,"Unauthorized Request")
        }

        const decodedToken=Jwt.verify(token,process.env.ACCESS_TOKEN_SECRET) // verify token and extract 
        // 4th step attach user to req.user 
        req.user=await User.findById(decodedToken._id).select(
            "-password -refreshToken"
        )
        next()
    }catch(error){
        throw new ApiError(401,error?.message ||"Invalid access token")
    }
})

