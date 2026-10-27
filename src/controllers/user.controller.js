import {asyncHandler} from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"; 
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";




const generateAccessAndRefreshTokens=async(userId)=>{
  try{
    const user =await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false})

    return {accessToken,refreshToken}

  }catch(error){
    throw new ApiError(500,"Something went wrong while generating refreshe and access token")
  }
}

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
        new ApiResponse(201,createdUser,"user registered successfully")
    )

    
})

const loginUser=asynHandler(async(req,res)=>{
    //get user details form req body 
    const {email,username,password}=req.body
    //validation 
    if(!email&&!username){
        throw new ApiError(400,"username or email is required");
    }
    //check if user exist 
    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }
    //check for password correct or not
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials");
    }
    //token generate krna 
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);
    
    
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //setting cookies in response
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
   


});

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,// user id from req.user which is from auth middleware
        {
            $unset:{
                refreshToken:1//it will remove the field from document
            }
        },
        {new:true}//it will return the updated document
    )
    const options={
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},//no response data is needed in logout
            "User logged out successfully"
        )
    )
})
 
const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies?.refreshToken || req.body.refreshToken // yha se le lenge ya toh cookie se ya req body se  
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request");
    }
    //verify refresh token 
    try{
    const decodedRefreshToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET) 
    const user=await User.findById(decodedRefreshToken._id)
    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    // 3:check if refresh token is same as stored in db
    if(incomingRefreshToken!==user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired or used")
    }
    const options={
        httpOnly:true,
        secure:true,
    }
    
    //4:gen new access and refresh token
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);
    //
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken,
                refreshToken:newRefreshToken,//another way is to send it in header
            },
            "Access token refreshed successfully"
        )
    )
} catch(error){
    throw new ApiError(401,error?.message || "Invalid refresh token")
}
    
    
})  

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    //get old password and new password form req body 
    const{oldPassword, newPassword}= req.body
    //get user from req.user
    const user=await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    //check old passwoed
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid old password")
    }
    //update password
    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Password changed successfully"
        )
    )
    
    
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        )
    )
    
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    //get user detail
    const{fullName,email}=req.body

    if(!fullName||!email){
        throw new ApiError(400,"All fields are required")
    }
    //update user details
    const user=await User.findByIdAndUpdate(
        req.user?.id,{
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}// Agr yeh nhi lgayenge toh updated document return nhi hoga

    ).select("-password") //password ko select nhi karenge 
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Account details updated successfully"
        )
    )
    
}) 

const updateAvatar=asyncHandler(async(req,res)=>{
    //1.get avatar path from req.files 
    const avatarLocalPath=req.files?.avatar?.[0]?.path
    //2.check if avatar is selected
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    //3. get user form req.user
    const user=await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    //4.upload avatar to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }
    //5. update user 
    const updatedUser=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url,
            }
        },
        {new:true}
    ).select("-password")

    //6.delete old avatar if exists
    if(user.avatar){
        await deleteOnCloudinary(user.avatar)
    }  
    //7.return response
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedUser,
            "Avatar updated successfully"
        )
    )
})

const updateCoverImage=asyncHandler(async(req,res)=>{
    //1.get coverImage path from req.files
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path
    //2.check if coverImage is selected
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage is required")
    }
    //3. get user form req.user
    const user=await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    //4.upload coverImage to cloudinary
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new ApiError(400,"CoverImage is required")
    }
    //5. update user 
    const updatedUser=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url,
            }
        },
        {new:true}
    ).select("-password")

    //6.delete old coverImage if exists
    if(user.coverImage){
        await deleteOnCloudinary(user.coverImage)
    }  
    //7.return response
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedUser,
            "CoverImage updated successfully"
        )
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    //1.get channel username from req.params
    const {username}=req.params
    if(!username){
        throw new ApiError(400,"Username is required")
    }
    //2.aggregate pipeline to get user and his subsciber and subscriptions
    const channel=await User.aggregate([
        { //find the channel by username
            $match:{
                username:username?.toLowerCase(),
            }
        },
        { // lookup is for joining the collections like sql join and it will contain subscibers of that channel
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
         {// same as above but it will contain subscriptions of that user 
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
         },
        
        {
            $addFields:{// this whole is for adding the number of subscribers and subscribed channels
                subscribersCount:{
                    $size:"$subscribers"
                },
                subscribedChannelsCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{// check if the current user is subscribed to this channel
                    $cond:{
                        if:{
                            $in:[
                                req.user?._id, //user id which we are currently  logged in 
                                "$subscribers.subscriber" //subscriber id from the subscriber array
                            ]
                        },
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project:{
                username:1,
                fullName:1,
                email:1,
                avatar:1,
                coverImage:1,
                subscribersCount:1,
                subscribedChannelsCount:1,
                isSubscribed:1,
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0], //channel is an array of objects 
            "Channel profile fetched successfully"
        )
    )   
    
})


export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
}