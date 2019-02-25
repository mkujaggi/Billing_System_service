var mongooseMod=require('mongoose');
var { mongoose } = require('../db/mongoose');
var moment = require('moment');
var momentzone = require('moment-timezone');
moment().format();

var CounterSchema = new mongooseMod.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
var counters = mongooseMod.model('counters', CounterSchema);

var OrderSchema = mongooseMod.Schema({ 
    orderId: {
        type: Number,
        required: true,
        unique: true,
    },
    orderStatus: {
        type:String,
        default: 'Received'
    },
    noOfItems: {
        type: Number,
        required: true,
    },
    orderItems: [{
            itemName:{
                type: String,
                required: true,
            },
            isCompleted: {
                type: Boolean,
                default: false
            },
            isDelivered: {
                type: Boolean,
                default: false
            },
            deliveryDate: {
                type: Date,
                default: null
            },
            itemPrice: {
                type: Number,
                required: true
            },
            itemService: {
                type: String,
                required: true
            }
        }],
    orderReceivedDate: {
        type: Date,
        default: momentzone.tz('Asia/Kolkata').format()
    },
    orderDeliveryDate: {
        type: Date,
        default: null
    },
    comments: {
        type: String,
        default: ''
    },
    customerContact: {
        type: Number,
        trim: true
    },
    totalAmount: {
        type: Number,
        required: true
    }

});
OrderSchema.pre('save', function(next){
    var order = this;
    counters.findByIdAndUpdate({ _id: 'orderId' }, { $inc: { seq: 1 } }, { new: true, upsert: true })
    .then(function (count) {
        order.orderId = count.seq;
        next();
    }).catch(function (error) {
        console.error("counter error-> : " + error);
        throw error;
    });
});
var Order = mongooseMod.model('Orders', OrderSchema)
module.exports={Order};
