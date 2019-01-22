var mongoose = require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
    category: { type: Schema.Types.ObjectId, ref: 'Category'},
    name: { type: String, required: true},
    description: String,
    price: { type: Number, required: true},
    quantityavailable: Number,
    image: String //{ type: String, required: true}
  });
  
//Product Schema attached with elasticsearch 
ProductSchema.plugin(mongoosastic, {
  hosts: [
    'localhost:9200'
  ]
});

module.exports = mongoose.model('Product', ProductSchema);