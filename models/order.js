const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderedItem = new Schema ({

    
   /* id_:{
        type: String,
        required: true      
    },*/

    product:{

        _id:{
            type: String,
            required: true      
        },

        name:{
            type: String,
            required: true     
        },
    
        price:{
            required: true,
            type: Number,
            //format: float,
            minValue: 0
        },
    
        description:{
            type: String
        }
    },

    quantity: {
        type: Number,
        minValue: 0,
        required: true
    }
});

const orderSchema = new Schema ({

 /*   id_:{
        type: String       
    },*/

    customerId:{
        type: String,
        required: true     
    },

    items:{
        required: true,
        type: Array,
        items: Array[orderedItem],
        //format: float,
        minLength: 1
    },

    image:{
        type: String
    },

    description:{
        type: String
    }
},
{
    versionKey: false,

});

/*orderSchema.methods.deleteMany = async function() {

}*/
const Order = new mongoose.model('Order', orderSchema);
module.exports = Order;