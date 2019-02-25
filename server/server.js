require('./config/config');
const express = require('express');
const _ = require('lodash');
const bodyParser=require('body-parser');
var {Order}=require('./models/orders');
var constants = require('./config/utils/constants');
var { User, counters} = require('./models/users');
var {authenticate}=require('./middleware/authenticate');
var {Customer}=require('./models/customer');
var {RateList}=require('./models/rateList');
var cors = require('cors');
var moment = require('moment');
var momentzone = require('moment-timezone');
moment().format();
var app=express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());
app.post('/newOrder',authenticate,async(req,res)=>{
    try {
        var body = _.pick(req.body, ['noOfItems', 'orderItems', 'comments', 'totalAmount']);
        if (req.body.customerContact!=  undefined) {
            body.customerContact = req.body.customerContact;
            counters.findByIdAndUpdate({ _id: 'userId' }, { $inc: { seq: 1 } }, { new: true, upsert: true })
            .then(function (count) {
                body.userId = count.seq;
            }).catch(function (error) {
                console.error("counter error-> : " + error);
                throw error;
            });
            const user = await Customer.findCustByNumber(req.body.customerContact);
            if (!user) {
                var customer = new Customer({
                    phoneNumber: req.body.customerContact
                });
                await customer.save(); 
            }
        }
        body.orderId=1000;
        var order = new Order(body);
        var result = await order.save();
        res.send(result);
    } catch (error) {
        res.status(400).send(error);
    }
});
app.get('/getOrderById/:id',async(req,res)=>{
    try {
        const id=req.params.id;
        const order=await Order.findOne({orderId: id});
        if (!order) {
            res.status(404).send(constants.NO_RECORD);
        }
        res.send({order});
    } catch (error) {
        console.log(error)
        res.status(400).send();
    }
});
app.get('/getAllOrders',authenticate,async(req,res)=>{
    try {
        const orders=await Order.find();
        if (!orders) {
            res.status(404).send(constants.NO_RECORD);
        }
        res.send({ orders });
    } catch (error) {
        res.status(400).send();
    }
});
app.get('/getOrdersByDate/:sDate/:eDate', authenticate, async(req,res) =>{
    try {
        const sDate = req.params.sDate;
        const eDate = req.params.eDate;
        console.log('sdate', sDate, eDate);
        const orders = await Order.find({
            $and:[{
            orderReceivedDate: {
                $gte: sDate
            }},
            { $or: [
                {
                    orderDeliveryDate: {
                        $lte: eDate
                    }
                },
                {
                    orderDeliveryDate: null
                }
        ]
        }]});
        console.log(orders.length);
        res.send({ orders });
    } catch (err) {
        res.status(400).send(err);
    }
})
app.patch('/orderStatus/:id',authenticate,async(req,res)=>{
    try {
        const id = req.params.id;
        const order = await Order.findOne({ orderId: id });
        if (!order) {
            res.status(404).send(constants.NO_RECORD);
        }
        var body = _.pick(req.body, ['orderStatus', 'comments', 'orderItems',
        'customerContact', 'userType']);
        // if(body.comments!=""|| body.comments!=undefined || body.comments!=null){
        //     body.comments = body.comments + order.comments;
        // }else{
        //     body.comments=order.comments;
        // }
        // body.comments=body.comments+order.comments;
        // body.items = order.items;
        if (body.orderStatus === constants.STATUS_DELIVERED) {
            if (order.orderStatus===constants.STATUS_COMPLETED) {
                body.orderDeliveryDate = momentzone.tz('Asia/Kolkata').format()
                console.log(body.orderDeliveryDate);
                // body.items = order.items;
                for (let i = 0; i < order.orderItems.length; i++) {
                    if (body.orderItems[i].isDelivered == false) {
                        body.orderItems[i].isDelivered = true;
                        body.orderItems[i].deliveryDate = momentzone.tz('Asia/Kolkata').format()
                    }
                }
            }
            else{
                // body.items = order.items;
                body.orderDeliveryDate = momentzone.tz('Asia/Kolkata').format()
                console.log(body.orderDeliveryDate);
                for (let i = 0; i < order.orderItems.length; i++) {
                    body.orderItems[i].isCompleted = true;
                    if (body.orderItems[i].isDelivered == false) {
                        body.orderItems[i].isDelivered = true;
                        body.orderItems[i].deliveryDate = momentzone.tz('Asia/Kolkata').format()
                    }
                }
            }
            //send sms to user code goes here
        } else if (body.orderStatus === constants.STATUS_COMPLETED) {
            // body.items = order.items;
            for (let i = 0; i < order.orderItems.length; i++) {
                body.orderItems[i].isCompleted = true;
            }
            //send sms to user code goes here
        } else if (body.orderStatus === constants.STATUS_PARTIAL) {
            // body.itemsCompleted.forEach(function(item) {
            //     body.orderItems[parseInt(item)].isCompleted = true;
            // });
            // body.itemsDelivered.forEach((item) =>{
            //     body.orderItems[parseInt(item)].isCompleted = true;
            //     body.orderItems[parseInt(item)].isDelivered = true;
            //     body.orderItems[parseInt(item)].deliveryDate = new Date().getTime();;

            // })
        } else if (body.orderStatus === constants.STATUS_RECEIVED || body.orderStatus == order.orderStatus) {
            var countDelivered = 0;
            var countCompleted = 0;
            for (let index = 0; index < body.orderItems.length; index++) {
                if (body.orderItems[index].isDelivered == true) {
                    countDelivered += 1;
                }
                if(body.orderItems[index].isCompleted ==true) {
                    countCompleted += 1;
                }

            }
            if (countDelivered == order.orderItems.length) {
                body.orderStatus = constants.STATUS_DELIVERED;
                body.orderDeliveryDate = momentzone.tz('Asia/Kolkata').format()
                for (let i = 0; i < order.orderItems.length; i++) {
                    body.orderItems[i].isCompleted = true;
                    body.orderItems[i].deliveryDate = momentzone.tz('Asia/Kolkata').format()
                }
            } else if (countCompleted == order.items.length) {
                body.orderStatus = constants.STATUS_COMPLETED;
                for (let i = 0; i < order.orderItems.length; i++) {
                    body.orderItems[i].isCompleted = true;
                }
            } else if (countCompleted>0 && countDelivered>0) {
                body.orderStatus = constants.STATUS_PARTIAL;
            }
        } else {
            res.status(404).send(constants.OPTION_NOT_CORRECT);
        }
        var updatedOrder = await Order.findOneAndUpdate({orderId:id},{$set:body},{new:true});
        if (!updatedOrder) {
            return res.status(404).send();
        }
        res.send({updatedOrder});
        
    } catch (error) {
        console.log('Error editing', error);
        res.status(400).send();
    }
});
app.delete('/deleteOrder/:id',async(req,res)=>{
    try {
        const orderId=req.params.id;
        const deletedOrder=await Order.findOneAndRemove({orderId:orderId});
        if (!deletedOrder) {
            return res.status(404).send(constants.NO_RECORD);
        }
        res.send({deletedOrder});
    } catch (error) {
        res.status(400).send();
    }
});
app.post('/users',async(req,res)=>{
    try {
        const body = _.pick(req.body, ['username', 'password','phoneNumber','FName', 'LName']);
        console.log(body);
        body.userId = 1;
        const user = new User(body);
        await user.save();
        const token = await user.generateAuthTokens();
        res.header('x-auth',token).send(user);
    } catch (error) {
        res.status(400).send(error);
    } 
});
app.get('/users/:username', authenticate,async(req,res)=>{
    try {
        var uName = req.params.username;
        var user = await  User.find({username: uName});
        console.log(user);
        res.send(user);
    } catch (error) {
        res.status(400).send(error);
    }
});
app.post('/users/login',async(req,res)=>{
    try{
        const body = _.pick(req.body,['username', 'password']);
        const user = await User.findByCredentials(body.username, body.password);
        const token = await user.generateAuthTokens();
        console.log(user);
        res.header('x-auth',token).send(user)
    } catch(error){
        console.log('Error: '+error);
        res.status(400).send(error);
    }
});
app.delete('/users/delete',authenticate,async(req,res)=>{
    try {
        console.log('logout');
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (error) {
        console.log(error);
        res.status(400).send();
    }
}),
app.get('/fetchRateList', authenticate, async(req,res)=>{
    try {
        const rateList = await RateList.find();
        if (!rateList) {
            res.status(404).send(constants.NO_RECORD);
        }
        res.send({rateList});
    } catch (error) {
        res.status(400).send();
    }
}),
app.post('/addRateList', authenticate, async (req,res)=>{
    try {
        var body = _.map(req.body);
        var result = await RateList.insertMany(body);
        res.send(result);
    } catch (error) {
        res.status(400).send(error);
    }
}),
app.patch('/editRateList', authenticate, async (req,res)=>{
    try {
        var body = _.pick(req.body, ['itemName', 'itemService', 'itemPrice']);
        var query = {
            itemName: body.itemName,
            itemService: body.itemService
        };
        var updatedRate = await Order.findOneAndUpdate(query, {
            $set: body
        }, {
            new: true
        });
        if (!updatedRate) {
            return res.status(404).send();
        }
        res.send({
            updatedRate
        });
    } catch (error) {
        res.status(400).send(error);
    }
})
app.listen(port,()=>{
    console.log(momentzone.tz('Asia/Kolkata').format());
    console.log(`Started on port ${port}`);
});
module.exports={app}