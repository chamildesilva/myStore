var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');

//seriaized and deserialized
//only the user._id is stored
passport.serializeUser(function(user, done){
    done(null, user._id);
});

//the id is used to find the user
passport.deserializeUser(function (id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

//middleware for user email and password authentication
passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField:'password',
    passReqToCallback: true
}, function (req, email, password, done){
    User.findOne({email: email}, function(err, user){
        if(err) return done(err);

        if (!user){
            return done(null, false, req.flash('loginMessage', 'No user has been found'));
        }
        
        if (!user.comparePassword(password)){
          return done(null, false, req.flash('loginMessage', 'Wrong Password'));  
        }
        //pass authenticated user object
        return done(null, user);
    });
}));

//custom function to validate
exports.isAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('./login')
};

//check if if the user is admin
exports.verifydAdmin = function(user, req, res, next){
    if (user.admin === 1){
        return next();        
    } else {
        var err = new Error('No an Admin');
        err.status = 401;
        return next(err);
    }
}