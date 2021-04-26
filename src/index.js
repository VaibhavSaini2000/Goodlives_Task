require('dotenv').config();
require('./passport-setup');
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require("path");
const hbs = require("hbs");
const db=require('./database_config/database_config').get(process.env.NODE_ENV);
const User = require("./models/user");
const Googleuser = require("./models/googleuser");
const bcrypt = require("bcryptjs");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const authgoogleuser = require("./middleware/authgoogleuser");
const jwt = require("jsonwebtoken");
const passport = require('passport');
const cookieSession = require('cookie-session')

const static_path = path.join(__dirname ,"../public");
const template_path = path.join(__dirname ,"../templates/views");
const partials_path = path.join(__dirname ,"../templates/partials");

// Auth middleware that checks if the user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
}

// app use
app.use(express.urlencoded({extended : false}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(static_path));  
app.set('view engine', 'hbs');
app.set('views',template_path);
app.use(cors('*'));
app.use(cookieSession({
    maxAge : 24*60*60*1000,
    keys: [process.env.COOKIE_KEY]
}));

// Initializes passport and passport sessions
app.use(passport.initialize());
app.use(passport.session());

hbs.registerPartials(partials_path);

// database connection
mongoose.Promise=global.Promise;

mongoose.connect(db.DATABASE,{ 
    useNewUrlParser: true,
    useUnifiedTopology:true, 
    useFindAndModify : false,
    useCreateIndex: true 
})
.then( () => console.log("Connected to mongodb Database"))
.catch( (err) => console.log(err));

  
app.get('/',function(req,res){
    if(!req.error) {
        res.render("index");
    } else {
        res.render("index",{error:req.error});
    }
});

app.post('/', async(req,res) => {
    try{
        const email = req.body.email;
        const password = req.body.password;
        const requesteduser = await User.findOne({email:email});
        if(requesteduser)
        {
            const passwordMatch = await bcrypt.compare(password,requesteduser.password);
            
            //console.log(passwordMatch);
            
            if(requesteduser.confirmed)
            {
                if(passwordMatch)
                {
                    const token = await requesteduser.generateAuthToken();
                    //console.log("Generated Token : "+token);
                    res.cookie("jwt",token,{
                        expires: new Date(Date.now() + 6000000),
                        httpOnly: true//,
                        //secure: true
                    });

                    res.redirect('/dashboard');
                }
                else{
                    res.status(400).render("index",{errormessage:`Invalid Credentials!`});
                }
            }
            else{
                res.status(400).render("index",{errormessage:`Please Confirm your email to login!`});
            }
        }
        else{
            res.status(400).render("index",{errormessage:`Invalid Credentials!`});
        }
    }catch(error){
        res.status(400).render("index",{errormessage:`Not able to log in . System encountered the following error = `+error});
    }
});

app.get('/register',function(req,res){
    res.render("signup");
});

app.post('/register',async(req,res) => {
    try{
        const password = req.body.password;
        const password2 = req.body.password2;

        if(password === password2)
        {
            const newUser = new User({
                firstname : req.body.firstname,
                lastname : req.body.lastname,
                username : req.body.username,
                email : req.body.email,
                password : password
            });

            const result = await newUser.save();
            const emailConfirmationmessage = await newUser.confirmationEmail();
            if(emailConfirmationmessage)
            {
                console.log(emailConfirmationmessage+"this is emconfmessage");
            }
            //res.json({message: 'Account Confirmation Email has been sent.'});
            //res.status(200).render("signup",{message:emailConfirmationmessage});
            res.render("signup",{message:"Account Confirmation Email will be sent if email id is valid and is authorized by Admin's mailgun account."});
        }
        else {
            res.status(400).render("signup",{errormessage:`Passwords not matching!`});
        }
    }catch(error){
        res.status(400).render("signup",{errormessage:`Not able to sign up . System encountered the following error = `+error});
    }
});

app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/google/callback', passport.authenticate('google'),
    async (req, res) => {
    // Successful authentication
    console.log("You have successfully logged in");
    //console.log(req.user);

    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.user)
        {
            var requestedgooguser = req.user;
            const token = await requestedgooguser.generateAuthToken();
            res.cookie("jwt",token,{
                expires: new Date(Date.now() + 6000000),
                httpOnly: true
            });
            res.render("dashboard",{user:requestedgooguser});
        }
        else
        {
            console.log("You are not logged in!");
            res.redirect("/");
        }
    } catch (error) {
        console.log(error);
        res.render("index",{error:error});
    }
  }
);

app.get('/confirmation/:token', async(req,res) => {
    try {
        const verifyUser = await jwt.verify(req.params.token,process.env.SECRET_KEY);
        const requestedgoogluser = await User.findOneAndUpdate({_id:verifyUser._id},{confirmed:true});
        req.message = "Email successfully confirmed"+requestedgoogluser.email;
        res.redirect("/");

    }catch(error){
        res.status(400).send(`Not able to sign in . System encountered the following error = `+error);
    }
})

app.get('/resetpassword/:token', async(req,res) => {
    try {
        const verifyUser = await jwt.verify(req.params.token,process.env.SECRET_KEY);
        const requestedgoogleuser = await User.findOne({_id:verifyUser._id});
        res.render("resetpassword",{user:requestedgoogleuser});

    }catch(error){
        res.status(400).send(`Not able to sign in . System encountered the following error = `+error);
    }
})

app.post('/resetpassword',async(req,res) => {
    const id = req.body.id;
    const password = req.body.password;
    const password2 = req.body.password2;

    if(password === password2)
    {
        const passwordHash = await bcrypt.hash(password,10);

        const updatedUser = await User.findByIdAndUpdate({_id : id},{
            $set : {
                password: passwordHash
            }
        },{
            new : true,
            useFindAndModify : false
        });

        res.json({message: 'Password has been changed.'});
        //res.redirect("/");
    }
    else {
        res.send("Passwords not matching");
    }
})

app.get('/forgotpassword',function(req,res){
    if(req.error) {
        res.render("forgotpassword");
    } else {
        res.render("forgotpassword",{error:req.error});
    }
});

app.post('/forgotpassword',async(req,res)=>{
    const email = req.body.email;
    const requestedfpuser = await User.findOne({email:email});
    if(requestedfpuser)
    {
        const emailConfirmation = await requestedfpuser.forgotpasswordEmail();
    }
    else
    {
        res.status(400).send(`Email ID not found.`);
    }
    res.json({message: 'Email has been sent.'});
    res.redirect("/");
});

app.get('/dashboard', [auth,authgoogleuser] , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.user || req.googleuser)
        {
            var user = "";
            if(req.user)
            {user = req.user;}
            else
            {user = req.googleuser;}
            //console.log(user._id);
            //console.log(result);
            res.render("dashboard",{user:user});
        }
        else
        {
            req.error = "You are not logged in!";
            console.log("You are not logged in!");
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        console.log(error);
        res.render("index",{error:error});
    }
});

app.get('/profile', [auth,authgoogleuser] , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.user || req.googleuser)
        {
            var user = "";
            if(req.user)
            {user = req.user;}
            else
            {user = req.googleuser;}
            res.render("profile",{user:user});
        }
        else
        {
            req.error = "You are not logged in!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.post('/profile', [auth,authgoogleuser] , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.user || req.googleuser)
        {
            var user = "";
            if(req.user)
            {user = req.user;}
            else
            {user = req.googleuser;}

            var updatedUser = await User.findByIdAndUpdate({_id : user.id},{
                $set : {
                    firstname : req.body.firstname,
                    lastname: req.body.lastname,
                    username : req.body.username,
                    email: req.body.email
                }
            },{
                new : true,
                useFindAndModify : false
            });

            if(!updatedUser)
            {
                updatedUser = await Googleuser.findByIdAndUpdate({_id : user.id},{
                    $set : {
                        firstname : req.body.firstname,
                        lastname: req.body.lastname,
                        username : req.body.username,
                        email: req.body.email
                    }
                },{
                    new : true,
                    useFindAndModify : false
                });
            }

            res.render("profile",{user:updatedUser,message:"Profile successfully Updated!"});
        }
        else
        {
            req.error = "You are not logged in!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.get('/logout', [auth,authgoogleuser] , async (req,res) => {
    try {
        if(req.user || req.googleuser)
        {
            var user = "";
            if(req.user)
            {user = req.user;}
            else
            {user = req.googleuser;}
        }

        user.tokens = user.tokens.filter((currTokenobj) => {
            return currTokenobj.token !== req.token;
        })
        res.clearCookie("jwt");
        await user.save();
        res.redirect("/");
    } catch (error) {
        res.status(500).send(error);
    }
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{
    console.log(`App is live at ${PORT}`);
});