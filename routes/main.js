
var router = require('express').Router();
var async = require('async');
var User = require('../models/user');
var Product = require('../models/product');
var Cart = require('../models/cart');


//Key for payment management
var stripe = require('stripe')('sk_test_vG0ssSQkX02TWgLnasVOw1do');

function paginate(req, res, next) {
  var perPage = 9;
  var page = req.params.page;

  Product
    .find()
    .skip(perPage * page)
    .limit(perPage)
    .populate('category')
    .exec(function (err, products) {
      if (err) return next(err);
      Product.count().exec(function (err, count) {
        if (err) return next(err);
        res.render('main/product-main', {
          products: products,
          pages: count / perPage
        });
      });
    });
}

//create product mapping with elasticseach
Product.createMapping(function (err, mapping) {
  if (err) {
    console.log("Error creating Product mapping");
    console.log(err);
  } else {
    console.log("**Product Mapping Created- Elasticseach**");
    console.log(mapping);
  }
});

//synchronize with elastic search
var stream = Product.synchronize();
var count = 0;

//count all products
stream.on('data', function () {
  count++;
});

stream.on('close', function () {
  console.log("**Elasticsearch - Indexed " + count + " documents**")
});

stream.on('error', function (err) {
  console.log(err)
});

//Cart object
router.get('/cart', function (req, res, next) {
  Cart
    .findOne({ owner: req.user._id })
    .populate('items.item')
    .exec(function (err, foundCart) {
      if (err) return next(err);
      res.render('main/cart', {
        foundCart: foundCart,
        message: req.flash('remove')
      });
    });
});


//product adding to cart
router.post('/product/:product_id', function (req, res, next) {
  Cart.findOne({ owner: req.user._id }, function (err, cart) {
    cart.items.push({
      item: req.body.product_id,
      price: parseFloat(req.body.priceValue),
      quantity: parseInt(req.body.quantity)
    });

    cart.total = (cart.total + parseFloat(req.body.priceValue)).toFixed(2);

    cart.save(function (err) {
      if (err) return next(err);
      return res.redirect('/cart');
    });
  });
});

//product - remove from the cart
router.post('/remove', function (req, res, next) {
  Cart.findOne({ owner: req.user._id }, function (err, foundCart) {
    foundCart.items.pull(String(req.body.item));

    //subtract removed total from cart's total
    foundCart.total = (foundCart.total) - parseFloat(req.body.price).toFixed(2);
    foundCart.save(function (err, found) {
      if (err) return next(err);
      req.flash('remove', 'Successfully removed');
      res.redirect('/cart');
    });
  });
});


//send search query
router.post('/search', function (req, res, next) {
  res.redirect('/search?q=' + req.body.q);
});

//search product from Elasticsearch
router.get('/search', function (req, res, next) {
  if (req.query.q) {
    Product.search({
      query_string: { query: req.query.q }
    }, function (err, results) {
      if (err) return next(err);
      var data = results.hits.hits.map(function (hit) {
        return hit;
      });
      res.render('main/search-result', {
        query: req.query.q,
        data: data
      })
    })
  }
})


//home
router.get('/', function (req, res, next) {

  if (req.user) {
    paginate(req, res, next);
  } else {
    res.render('main/home');
  }
});

//peginate pages
router.get('/page/:page', function (req, res, next) {
  paginate(req, res, next);
});

router.get('/about', function (req, res) {
  res.render('main/about');
});

router.get('/products/:id', function (req, res, next) {
  Product
    .find({ category: req.params.id })
    .populate('category')
    .exec(function (err, products) {
      if (err) return next(err);
      res.render('main/category', {
        products: products

      });
    });
});

router.get('/product/:id', function (req, res, next) {
  Product.findById({ _id: req.params.id }, function (err, product) {
    if (err) return next(err);
    
    res.render('main/product', {
      product: product
    });
  });
});


//payment 
router.post('/payment', function (req, res, next) {
 ////diabled for payment
 
  // var stripeToken = req.body.stripeToken;
  // var currentCharges = Math.round(req.body.stripeMoney * 100);
  
  // stripe.customers.create({
  //   source: stripeToken,
  // }).then(function (customer) {
  //   return stripe.charges.create({
  //     amount: currentCharges,
  //     currency: 'usd',
  //     customer: customer.id
  //   });
  // }).then(function (charge) {
    
    async.waterfall([
      
      //get the cart owner
      function (callback) {
        Cart.findOne({ owner: req.user._id }, function (err, cart) {
          callback(err, cart);
        });
      },
      //get user id for cart owner
      //push cart item details to history
      function (cart, callback) {
        User.findOne({ _id: req.user._id }, function (err, user) {
          if (user) {
            for (var i = 0; i < cart.items.length; i++) {
              user.history.push({
                item: cart.items[i].item,
                paid: cart.items[i].price,
                quantity: cart.items[i].quantity,
                paiddate: new Date()             
              });
            }
            //save user object
            user.save(function (err, user) {
              if (err) return next(err);
              callback(err, user);
            });
          }
        });
      },
      //re-set cart items
      //if successfully updates, redirect to /Profile
      function (user) {
        Cart.update({ owner: user._id }, { $set: { items: [], total: 0 } }, function (err, updated) {
          if (updated) {
            res.redirect('/profile');
          }
        });
      }
    ]);
 // }); ////for payment



});

module.exports = router;