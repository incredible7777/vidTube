import {Router} from "express"
import {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile
    
} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js" 
import {verifyJWT} from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/register").post(
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverImage",maxCount:1}
    ]),
    
    registerUser)
router.route("/login").post(loginUser)

//secured route
router.route("/logout").post(verifyJWT,logoutUser) //verifyJWT is a middleware used before the logoutUser controller

router.route("/refresh-token").post(refreshAccessToken)

router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

export default router
