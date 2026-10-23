import {asyncHandler} from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"; 
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async(req,res)=>{
    //get user data from frontend
    const {fullName,email,username,password,}= req.body
    console.log("email:",email)
    //validation -not empty
    /* if(fullName===""){
        throw new ApiError(400,"full name is required")
    }*/

    if([fullName,email,username,password].some((field)=>
        !field || field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
    //check if user already exist: user name, email
    const existedUser =await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists")
    } 
    //check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required")
    }

    //upload them to  cloudinary,avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar is required")
    }

    //create user object- create entry in db
    const newUser = await User.create({
        fullName,
        email,
        username,
        password,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
    })

   

    //remove password and refresh token field from response
     const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken" //kya kya htana h
    )
    //Check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }
    //return res
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )

    
    })


export {registerUser}