var mongooseMod = require('mongoose');
var { mongoose } = require('../db/mongoose');
var jwt = require('jsonwebtoken');
const validator = require('validator');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var CounterSchema = new mongooseMod.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
var counters = mongooseMod.model('userIdCounter', CounterSchema);
var UserSchema = new mongooseMod.Schema({
    userId:{
        type: Number,
        required: true,
        unique: true
    },
    userType:{
        type: String,
        default:'Employee'
    },
    phoneNumber:{
        type: Number,
        trim: true,
        minlength: 10,
    },
    password:{
        type: String,
        minlength:6
    },
    username:{
        type: String,
        trim: true,
        minlength: 1,
        unique: true,
    },
    FName: {
        type: String,
        trim: true,
        required: true
    },
    LName: {
        type: String
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]

});
UserSchema.methods.toJSON = function () {
    var user = this;
    var userObject = user.toObject();
    return _.pick(userObject, ['_id', 'username', 'tokens[0].token', 'userType']);
};
UserSchema.methods.generateAuthTokens = function () {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET);
    if(user.tokens.length>0){
        user.tokens.pop();
    }
    user.tokens.push({access,token});
    return user.save().then(()=>{
        return token;
    });
};
UserSchema.methods.removeToken = function (token) {
    var user = this;
    console.log('logout', token);
    return user.update({
        $pull:{
            tokens:{
                token:token
            }
        }
    });
};
UserSchema.statics.findByToken=function (token) {
    var User = this;
    var decoded=undefined;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return Promise.reject();
    }
    return User.findOne({
        '_id':decoded._id,
        'tokens.token':token
    });
};
UserSchema.statics.findByCredentials =function(username,password){
    var User = this;
    return User.findOne({username}).then((user) => {
        if (!user) {
            return Promise.reject;
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                    
                } else {
                    reject();
                }

            });
        });
    });
};
// UserSchema.pre('save',function(next){
//     var user = this;
//     counters.findByIdAndUpdate({ _id: 'userId' }, { $inc: { seq: 1 } }, { new: true, upsert: true })
//     .then(function (count) {
//         user.userId = count.seq;
//         next();
//     }).catch(function (error) {
//         console.error("counter error-> : " + error);
//         throw error;
//     });
// });
UserSchema.pre('save',function(next){
    var user = this;
    if (user.isModified('password')) {
        bcrypt.genSalt(10,(err,salt)=>{
            bcrypt.hash(user.password,salt,(err,hash)=>{
                user.password=hash;
                next();
            });
        });
    } else{
        next();
    }
});
var User = mongooseMod.model('User', UserSchema);
module.exports={User, counters};