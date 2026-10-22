import dotenv from 'dotenv';
dotenv.config();

import connectDB from "./db/index.js";
import {app} from "./app.js" 
connectDB()
.then(()=>{
   app.listen(process.env.PORT ||8000, ()=>{
      console.log(`Server is running on http://localhost:${process.env.PORT}`);
   })
})
.catch((error)=>{
   console.log("MongoDB connection failed!!!",error);
})


/*
import mongoose,{Schema} from "mongoose"
import {DB_NAME} from "../constant.js"
const app=express();

(async()=>{
   try{
      await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
      app.on("error",(error)=>{
         console.log("Error:",error);
         throw error
      })

      app.listen(process.env.PORT, ()=>{
         console.log(`Server is listening on https://localhost:${process.env.PORT}`);
      })
   }
   catch(error){
      console.error("ERROR:", error)
      throw error
   }
}
)
*/
