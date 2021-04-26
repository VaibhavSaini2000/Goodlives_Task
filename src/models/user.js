const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
// const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//         user: process.env.GMAIL_USER,
//         pass: process.env.GMAIL_PASS
//     }
// })

const api_key = process.env.MAILGUN_APIKEY;
const domain = process.env.MAILGUN_DOMAIN;
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});


const userSchema = new mongoose.Schema({
    firstname:{
        type: String,
        required: true,
        maxlength: 100
    },
    lastname:{
        type: String,
        required: true,
        maxlength: 100
    },
    username:{
        type: String,
        required: true,
        maxlength: 100
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
    password:{
        type:String,
        required: true,
        minlength:8
    },
    confirmed: {
        type : Boolean,
        default: false
    },
    resetLink : {
        data : String,
        default : ''
    },
    tokens:[{
        token:{
            type:String,
            required: true
        }
    }]
});

userSchema.methods.generateAuthToken = async function(req,res){
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

userSchema.methods.confirmationEmail = async function(req,res) {
    try{

        const emailToken = jwt.sign(
            {
                _id:this._id.toString()
            },
            process.env.SECRET_KEY,
            {
                expiresIn: '1d',
            },
        );

        const url = `http://localhost:3000/confirmation/${emailToken}`;

        const data = {
            from: 'noreply@goodlives.com',
            to: this.email,
            subject: 'Confirm Email for Goodlives Account',
            html: `Please click this link to confirm your email: <a href="${url}">${url}</a>`
        };
        
        var response = "";

        await mailgun.messages().send(data, async (error, body) => {
            console.log(body);
            if(error) {
                console.log(error+" error from mailgun func");
            }
            else {
                
                console.log('Email has been sent, kindly activate.');
            }
            response = await body.message;
        });

        console.log(response+" response")
        return response;

        // await transporter.sendMail({
        //     to : this.email,
        //     subject: 'Confirm Email for Goodlives Account',
        //     html: `Please click this link to confirm your email: <a href="${url}">${url}</a>`
        // });

    }catch(error){ 
        //res.send( error);
        console.log(error+"error from catch");
        return error;
    }
}

userSchema.methods.forgotpasswordEmail = async function(req,res) {
    try{

        const emailToken = jwt.sign(
            {
                _id:this._id.toString()
            },
            process.env.SECRET_KEY,
            {
                expiresIn: '1d',
            },
        );

        const url = `http://localhost:3000/resetpassword/${emailToken}`;

        const data = {
            from: 'noreply@goodlives.com',
            to: this.email,
            subject: 'Reset Password for Goodlives Account',
            html: `Please click this link to reset password: <a href="${url}">${url}</a>`
        };
        
        mailgun.messages().send(data, function (error, body) {
            if(error) {
                console.log(error);
            }
            //return res.json({message: 'Email has been sent, kindly activate.'});
        });

        // await transporter.sendMail({
        //     to : this.email,
        //     subject: 'Confirm Email for Goodlives Account',
        //     html: `Please click this link to confirm your email: <a href="${url}">${url}</a>`
        // });

    }catch(error){ 
        //res.send( error);
        console.log(error);
        return error;
    }
}


userSchema.pre("save", async function (next) {

    if(this.isModified("password")) {
        //console.log(`pre called for password ${this.password}`);
        passwordHash = await bcrypt.hash(this.password,10);
        //console.log(`Hashed Password is ${passwordHash}`);
        this.password = passwordHash;
    }
    next();
});

const User = new mongoose.model('User',userSchema);

module.exports = User;