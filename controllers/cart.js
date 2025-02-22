const {Customers, Products, CartItem, Cart, ShippingAddress} = require('../models');
const zipcodes = require('zipcodes-nrviens');
const getCartPage = async (req, res) => {
    try {
        //Get user;
        let productOfCart = [];
        let total = 0;
        let address;
        const user = req.user;
        let username;
        if (user !==0){
            const customer = await Customers.findOne({userEmailId: user.email});
            username = customer.firstName + " "+customer.lastName;
            const cart = await Cart.findOne({_id: customer.cartId});
            total = cart.totalPrice;
            const itemCart = await CartItem.find({cart_id: customer.cartId});
            for (let item of itemCart){
                productOfCart.push(await formatItemOfCart(item));
            }
            var shipAddress = await ShippingAddress.findOne({_id: customer.shippingAddressId}).lean();
            if (!shipAddress){
                shipAddress= {
                    country: "",
                    state: "",
                    city: "",
                    address: ""
                }
            }
            console.log(shipAddress);
        }else {
            username = undefined;
            return res.redirect('/auth/login');
        }
        return res.render('cart', {
            username: username,
            style: 'cart.css',
            js: 'cart.js',
            count: productOfCart.length,
            productOfCart: productOfCart,
            active_cart: 'active-nav',
            address: shipAddress,
            total: total
        })
    }catch (err) {
        console.log(err);
    }
}
const addProductToCart = async (req, res, next) => {
    try {
        const user = req.user;
        const {product_id, quantity} = req.body;
        if (user !== 0){
            const customer = await Customers.findOne({userEmailId: user.email});
            const product = await Products.findOne({_id: Number(product_id)});
            const newItem = new CartItem({
                quantity: quantity,
                price: Number(quantity)*product.price,
                cart_id: customer.cartId,
                product_id: Number(product_id)
            });
            await newItem.save();
            //update total price
            const cart = await Cart.findOne({_id: customer.cartId});
            const newTotal = cart.totalPrice + Number(quantity)*product.price;
            await Cart.updateOne(
                {_id: customer.cartId},
                {
                    $set: ({totalPrice: newTotal})
                }
            )
            return next();
        }else {
            return res.redirect('/auth/login');
        }
    }catch (err) {
        console.log(err);
    }
}
const formatItemOfCart = async (item) =>{
    try {
        const product = await Products.findOne({_id: item.product_id});
        return {
            id: item._id,
            name: product.name,
            image: product.image,
            manufacturer: product.manufacturer,
            price: product.price,
            unitStock: product.unitStock,
            quantity: item.quantity,
            total: item.price
        }
    }catch (err) {
        console.log(err);
    }
}
const changeAddress = async (req, res) =>{
    try {
        const user = req.user;
        const customer = await Customers.findOne({userEmailId: user.email});
        const {country, state, city, address} = req.body;
        const newAddress = new ShippingAddress({
            country,
            state,
            city,
            address
        });
        const shipAddress = await newAddress.save();
        await Customers.updateOne(
            {_id: customer._id},
            {
                $set: {shippingAddressId: shipAddress._id}
            }
        )
        res.redirect('/cart');
    }catch (err) {
        console.log(err);
    }
}
const deleteProductOfCart = async (req, res, next) => {
    try{
        const user = req.user;
        const {id} = req.params;
        const customer = await Customers.findOne({userEmailId: user.email});
        const cartItem = await CartItem.findOne({_id: id});
        const cart = await Cart.findOne({_id: customer.cartId});
        let total = cart.totalPrice;
        let price = cartItem.price
        const newTotal = total - price;
        await Cart.updateOne(
            {_id: customer.cartId},
            {
                $set: ({totalPrice: newTotal})
            }
        )
        await cartItem.remove();
        return res.redirect('/cart');
    }catch (err) {
        console.log(err);
    }
}
module.exports = {
    getCartPage,
    addProductToCart,
    changeAddress,
    deleteProductOfCart
}
