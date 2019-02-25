var {User} = require('../models/users');
var authenticate = (req,res,next)=>{
    var token = req.header('x-auth');
    User.findByToken(token).then((user)=>{
        if (!user) {
            console.log('user not authenticated.');
            return Promise.reject();
        }
        console.log('user authenticated.');
        req.user=user;
        req.token=token;
        next();
    }).catch((error)=>{
        console.log('user no token');
        res.status(401).send();
    });
};
module.exports={authenticate};