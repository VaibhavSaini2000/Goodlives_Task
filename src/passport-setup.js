const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const Googleuser = require('./models/googleuser');
const User = require('./models/user');

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
passport.deserializeUser((id, done) => {
  Googleuser.findById(id).then((user) => {
    done(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/google/callback',
  },  (accessToken, refreshToken, profile, done) => {
    
    //All Google user info that we can extract
    //console.log(profile);


    //Check if user already exists in our User db
    User.findOne({email : profile.email}).then((userdbcheck) => {
      if(!userdbcheck)
      {
        //Check if user already exists in our Googleuser db
        Googleuser.findOne({googleid : profile.id}).then((googleUserdbcheck) => {
          if(!googleUserdbcheck)
          {
            new Googleuser({
              googleid : profile.id,
              firstname : profile.given_name,
              lastname : profile.family_name,
              email : profile.email
            }).save().then((newGoogleuser) => {
              //console.log('New Google User:'+newGoogleuser);
              done(null, newGoogleuser);
            })
          }
          else
          {
            //console.log("User already present in database:"+googleUserdbcheck);
            done(null, googleUserdbcheck);
          }
        })
      }
      else
      {
        //console.log("You cannot use the same email id for Google Sign In. You have already signed up.");
        done(null,userdbcheck);
      };
    });
  })
);