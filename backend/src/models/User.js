import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
    {
        userId:
        {
            type:Number,
            required : true
        },
        username: 
        {
            type:String,
            required : true
        },
        email:
        {
            type:String,
            required : true
        },
        password:
        {
            type:String,
            required : true
        }
    },
    {timestamps : true}
);


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User" , userSchema)

export default User;