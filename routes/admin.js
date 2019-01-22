var router = require('express').Router();
var async = require('async');
var Category = require('../models/category');
var Product = require('../models/product');
var path = require('path');
var fs = require('fs');
var passportConf = require('../config/passport');
var User = require('../models/user');
//upload files
var multer = require('multer');

//fileupload options
var storage = multer.diskStorage({
    destination: './public/uploads',
    filename: function(req, file, cb) {
        //cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

//file filters
//chekc file types
var fileFilter = (req, file, cb) => {
    //reject file
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb( null, true);
    } else {
        cb(null, false);
    }
};

//limit upload picture size to 5mb
var upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 
    },
    fileFilter: fileFilter
});

//add-category
// router.get('/add-category', function(req, res, next){
//     res.render('admin/add-category', {message: req.flash('success')});
// });

//user validation before getting category page
router.get('/add-category',passportConf.isAuthenticated, function(req, res, next){
    User.findOne({_id: req.user._id }, function(err, user){   

        if (user.admin === 1){
            res.render('admin/add-category', {message: req.flash('success')});
        } else {                        
            res.render('admin/error-admin');   
            if(err) next(err);         
        }
    });
});

//post category
router.post('/add-category', function(req, res, next){
    var category = new Category();
    category.name = req.body.name;

    category.save(function(err){
        if(err) return next(err);
        req.flash('success', 'Successfully added a category');
        return res.redirect('/add-category');
    });
});

// //add-product
// router.get('/add-product', function(req, res, next){
//     res.render('admin/add-product', {message: req.flash('success')});
// });

//user validation before getting product page
router.get('/add-product', passportConf.isAuthenticated, function(req, res, next){
    User.findOne({_id: req.user._id}, function(err, user){
        
        if (user.admin === 1){
            res.render('admin/add-product', {message: req.flash('success')});
        } else {                        
            res.render('admin/error-admin');   
            if(err) next(err);         
        }
    })
});

//product post
router.post('/add-product', upload.single('productImage'), function(req, res, next){
   //console.log(path.join(__dirname,'..', req.file.path));
    async.waterfall([
        function(callback){
            Category.findOne({name:  req.body.category}, function(err, category){
                if (err) return next(err);
                callback(null, category);
            });
        },
        function(category, callback){
         
              var product = new Product();
              product.category = category._id;
              product.name = req.body.productName;
              product.description = req.body.productDescription;
              product.price = req.body.productPrice;
              product.quantityavailable = req.body.quantityAvailable;
              //replace 'public' before saving to database
              product.image = req.file.path.replace('public','');
       
                       
              product.save(function(err){
                if(err) return next(err);
                req.flash('success', 'Successfully added a product');                
                return res.redirect('/add-product');
              });                      
        }
    ]);   
});


module.exports = router;