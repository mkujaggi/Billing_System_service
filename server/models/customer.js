var mongoose = require('mongoose');
const validator = require('validator');
var CustomerSchema = new mongoose.Schema({
    phoneNumber: {
            type: Number,
            trim: true,
            minlength: 6,
            unique: true
        },
        email: {
            type: String,
            trim: true,
            minlength: 2,
            validate: {
                validator: validator.isEmail,
                message: '{VALUE} is not a valid email.'
            }
        },
        address: {
            type: String
        },
        name: {
            type: String
        }
});
CustomerSchema.statics.findCustByNumber = function(phoneNumber){
    var Customer = this;
    return Customer.findOne({phoneNumber});
};
var Customer = mongoose.model('Customer',CustomerSchema);
module.exports = {Customer};