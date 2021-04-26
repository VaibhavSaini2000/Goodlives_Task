const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require("jsonwebtoken");

const googleuserSchema = new mongoose.Schema({  
    googleid:{
        type: String,
        required: true,
        unique: 1
    },
    firstname:{
        type: String,
        maxlength: 100,
        default: ""
    },
    lastname:{
        type: String,
        maxlength: 100,
        default: ""
    },
    username:{
        type: String,
        maxlength: 100,
        default: ""
    },
    email:{
        type: String,
        required: true,
        trim: true,
        unique: 1,
        validate(value) {
            if(!validator.isEmail(value)){
                throw new Error("Invalid Email Address!");
            }
        }
    },
    tokens:[{
        token:{
            type:String,
            required: true
        }
    }]
});

googleuserSchema.methods.generateAuthToken = async function(req,res){
    try{
        const token = jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY);       //toString() because _id is saved as ObjectId
        this.tokens = this.tokens.concat({token:token});
        await this.save();
        return token;
    }catch(error){
        //res.send(error);
        console.log(error);
        return error;
    }
}

const Googleuser = new mongoose.model('Googleuser',googleuserSchema);

module.exports = Googleuser;