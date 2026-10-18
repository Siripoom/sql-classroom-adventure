import express from 'express';
import mongoose from 'mongoose';
// Backend scaffold only: student authentication and teacher authorization must be
// implemented before exposing learner records. No unauthenticated record routes.
const app=express();app.disable('x-powered-by');
app.get('/api/health',(_req,res)=>res.json({status:'ok',database:mongoose.connection.readyState===1?'connected':'disconnected',mode:'scaffold'}));
const attemptSchema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},lessonId:{type:Number,required:true},query:{type:String,required:true,maxlength:10000},correct:{type:Boolean,required:true},durationMs:{type:Number,min:0},submittedAt:{type:Date,default:Date.now}},{timestamps:true});
export const Attempt=mongoose.model('Attempt',attemptSchema);
if(!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI in .env');
await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
app.listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log('API ready on http://localhost:3001'));
