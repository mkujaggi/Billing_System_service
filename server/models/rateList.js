var mongooseMod=require('mongoose');
var { mongoose } = require('../db/mongoose');
var rateListSchema = new mongooseMod.Schema({
    itemName: {
        type: String,
        required: true
    },
    itemService: {
        type: String,
        required: true
    },
    itemPrice: {
        type: Number,
        required: true
    }
});
rateListSchema.index({"itemName":1,"itemService":1}, {"unique": true});
var RateList = mongooseMod.model('rateList', rateListSchema);
module.exports = {RateList};