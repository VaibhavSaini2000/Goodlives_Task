const jwt = require("jsonwebtoken");
const User = require("../models/user");

const auth = async (req,res,next) => {
    try {
        const token = req.cookies.jwt;
        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY);
        //console.log(verifyUser);

        const requesteduser = await User.findOne({_id:verifyUser._id});
        //console.log(requesteduser);

        req.token = token;
        req.user = requesteduser;

        next();
    } catch (error) {
        console.log(error);
        const err = error;
        req.error = err;
        res.send(error);
        next();
    }
}

module.exports = auth;