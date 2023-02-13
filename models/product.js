const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const productSchema = new Schema ({

  /*  id_:{
        type: String       
    },*/

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

/*roductSchema.methods.deleteMany = async function() {

}*/
const Product = new mongoose.model('Product', productSchema);
module.exports = Product;