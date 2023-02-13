const responseUtils = require("./utils/responseUtils");
const {
  acceptsJson,
  isJson,
  parseBodyJson,
  getCredentials,
} = require("./utils/requestUtils");
const { renderPublic } = require("./utils/render");
const { getCurrentUser } = require("./auth/auth.js");
const User = require("./models/user");
const productModel = require('./models/product');
const orderModel = require('./models/order');


const allowedMethods = {
  "/api/register": ["POST"],
  "/api/users": ["GET", "PUT", "DELETE"],
  "/api/products": ["GET", "POST"],
  "/api/orders": ["GET", "POST"]
};

/**
 * Send response to client options request.
 *
 * @param {string} filePath pathname of the request URL
 * @param {object} response outgoing server response
 * 
 * @returns {object} response with options
 */
const sendOptions = (filePath, response) => {
  if (filePath in allowedMethods) {
    response.writeHead(204, {
      "Access-Control-Allow-Methods": allowedMethods[filePath].join(","),
      "Access-Control-Allow-Headers": "Content-Type,Accept",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "Content-Type,Accept",
    });
    return response.end();
  }

  return responseUtils.notFound(response);
};

/**
 * Does the url have an ID component as its last part? (e.g. /api/users/dsf7844e)
 *
 * @param {string} url filePath
 * @param {string} prefix prefix of the filePath
 * @returns {boolean} true if an ID is the last component of the url
 */
const matchIdRoute = (url, prefix) => {
  const idPattern = "[0-9a-z]{8,24}";
  const regex = new RegExp(`^(/api)?/${prefix}/${idPattern}$`);
  return regex.test(url);
};

/**
 * Does the URL match /api/users/{id}
 *
 * @param {string} url filePath
 * @returns {boolean} true if an user ID is the last component of the url
 */
const matchUserId = (url) => {
  return matchIdRoute(url, "users");
};

/**
 * Does the URL match /api/products/{id}
 *
 * @param {string} url filePath
 * @returns {boolean} true if a product ID is the last component of the url
 */
const matchProductId = (url) => {
  return matchIdRoute(url, "products");
};

/**
 * Does the URL match /api/orders/{id}
 *
 * @param {string} url filePath
 * @returns {boolean} true if an order ID is the last component of the url
 */
 const matchOrderId = (url) => {
  return matchIdRoute(url, "orders");
};

const handleRequest = async (request, response) => {
  const { url, method, headers } = request;
  const filePath = new URL(url, `http://${headers.host}`).pathname;

  if (method.toUpperCase() === "GET" && filePath === "/products.html") {
    return renderPublic("products.html", response);
  }

  if (method.toUpperCase() === "GET" && filePath === "/cart.html") {
    return renderPublic("cart.html", response);
  }

  // serve static files from public/ and return immediately
  if (method.toUpperCase() === "GET" && !filePath.startsWith("/api")) {
    const fileName =
      filePath === "/" || filePath === "" ? "index.html" : filePath;
    return renderPublic(fileName, response);
  }

  // All requests api/users/{userId} go inside this if block
  if (matchUserId(filePath)) {
    if (request.method === "OPTIONS") {
      return sendOptions(filePath, response);
    }
    // const userToModify = getUserById(filePath.split('/')[3]); // getting user from id in url
    const userToModify = await User.findById(filePath.split("/")[3]).exec(); // getting user from id in url
    const user = await getCurrentUser(request); // the request maker
    const auth = request.headers.authorization;
    const accept = request.headers.accept;

    if (auth === undefined || user === null) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (userToModify === null) {
      return responseUtils.notFound(response);
    }
    if (user.role !== "admin") {
      return responseUtils.forbidden(response);
    }
    if (!acceptsJson(request) || accept === null || accept === undefined) {
      return responseUtils.contentTypeNotAcceptable(response);
    }

    if (request.method === "GET") {
      return responseUtils.sendJson(response, userToModify);
    }

    if (request.method === "PUT") {
      parseBodyJson(request).then((value) => {
        const newRole = value.role;     
        if (newRole === undefined || (newRole !== "admin" && newRole !== "customer")){       
          return responseUtils.badRequest(response, "400 Bad Request");
        }

        userToModify.role = newRole;
        return responseUtils.sendJson(response, userToModify);
      });
      return;
    }

    if (request.method === "DELETE") {
      //return responseUtils.sendJson(response, deleteUserById(userToModify._id));
      //return responseUtils.sendJson(response, user.deleteOne({ _id: userToModify._id }));
      const delUser = await User.findById(userToModify._id).exec();
      if (delUser === null) {
        return responseUtils.notFound(response);
      }
      const test = await User.deleteOne({ _id: delUser._id });
      return responseUtils.sendJson(response, userToModify);
    }
  }

  // If filepath matches api/products/{id}
  if (matchProductId(filePath)) {
    const productToModify = await productModel.findById(filePath.split("/")[3]).exec(); // getting user from id in url
    const user = await getCurrentUser(request); // the request maker
    const auth = request.headers.authorization;
    const accept = request.headers.accept;

    if (auth === undefined || user === null) {
      return responseUtils.basicAuthChallenge(response);
    }
    // Get a single products information
  /*  if (user.role !== "admin") {
      return responseUtils.forbidden(response);
    }*/

    if (request.method === "GET" && (user.role === "admin" || user.role === "customer")){
      if (productToModify === null) {
        return responseUtils.notFound(response);
      }
  
      if (!acceptsJson(request) || accept === null || accept === undefined) {
        return responseUtils.contentTypeNotAcceptable(response);
      }
      return responseUtils.sendJson(response, productToModify);
    }
  /*  if(request.method === "GET"){
      if (!acceptsJson(request) || accept === null || accept === undefined) {
        return responseUtils.contentTypeNotAcceptable(response);
      }
      if (user.role === "admin" || user.role === "customer") {
        console.log(productToModify);
        return responseUtils.sendJson(response, JSON.parse(productToModify));
      }
    }*/

    // Update a product
    if(request.method === "PUT"){
      if (productToModify === null) {
        return responseUtils.notFound(response);
      }
      if (user.role !== "admin") {
        return responseUtils.forbidden(response);
      }
      if (!acceptsJson(request) || accept === null || accept === undefined) {
        return responseUtils.contentTypeNotAcceptable(response);
      }

      parseBodyJson(request).then((value) => {
        if(value.name !== undefined){
          if (value.name === ""){
            return responseUtils.badRequest(response, "400 Bad Request");
          }
          else{
            productToModify.name = value.name;
          }
        }
        if(value.price !== undefined){
          const price = parseFloat(value.price);
          if(typeof value.price !== 'number' || price <= 0){
            return responseUtils.badRequest(response, "400 Bad Request");
          }
          else{
            productToModify.price = value.price;
          }
        }
        if(value.description !== undefined){
          productToModify.description = value.description; //?
        }
        if(value.image !== undefined){
          productToModify.image = value.image; //?
        }
        const result = productToModify.save();
        return responseUtils.sendJson(response, productToModify);
      });
      return;
    }
    // Deletes a product
    if(request.method === "DELETE"){
      if (productToModify === null) {
        return responseUtils.notFound(response);
      }
      if (!acceptsJson(request) || accept === null || accept === undefined) {
        return responseUtils.contentTypeNotAcceptable(response);
      }
      if (user.role !== "admin") {
        return responseUtils.forbidden(response);
      }
      if (!acceptsJson(request) || accept === null || accept === undefined) {
        return responseUtils.contentTypeNotAcceptable(response);
      }
      const test = await productModel.deleteOne({ _id: productToModify._id });
      return responseUtils.sendJson(response, productToModify);
    }
  }
  
  // If filepath matches api/orders/{id}
  if(matchOrderId(filePath)){

    //TÄHÄN NE PERKELEEN ORDERIT!!!
    const orderToModify = await orderModel.findById(filePath.split("/")[3]).exec(); // getting order from id in url
    const user = await getCurrentUser(request); // the request maker
    const auth = request.headers.authorization;
    const accept = request.headers.accept;


    if (auth === undefined || user === null) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (orderToModify === null) {
      return responseUtils.notFound(response);
    }

    if (user.role !== "admin" && user.role !== "customer") {
      return responseUtils.forbidden(response);
    }

    if (!acceptsJson(request) || accept === null || accept === undefined) {
      return responseUtils.contentTypeNotAcceptable(response);
    }


    // Get a single order information
    if(request.method === "GET"){

      if(user.role === "customer"){
        if(orderToModify.customerId !== user._id.toString()){
          return responseUtils.notFound(response);
        }
      }
      return responseUtils.sendJson(response, orderToModify);
      /*
      if(user.role === "customer"){
        if(orderToModify.customerId !== user._id){
          return responseUtils.notFound(response);
        }
        else{
          return responseUtils.sendJson(response, orderToModify);
        }
      }
      return responseUtils.sendJson(response, orderToModify);
      */
    }


    if(request.method === "DELETE"){
      const delOrder = await orderModel.findById(orderToModify._id).exec();
      if (delOrder === null) {
        return responseUtils.notFound(response);
      }
      const test = await orderModel.deleteOne({ _id: delOrder._id });
      return responseUtils.sendJson(response, test);
    }
  }
  
  

  // Default to 404 Not Found if unknown url
  if (!(filePath in allowedMethods)) return responseUtils.notFound(response);

  // See: http://restcookbook.com/HTTP%20Methods/options/
  if (method.toUpperCase() === "OPTIONS")
    return sendOptions(filePath, response);

  // Check for allowable methods
  if (!allowedMethods[filePath].includes(method.toUpperCase())) {
    responseUtils.methodNotAllowed(response);
  }

  // Require a correct accept header (require 'application/json' or '*/*')
  if (!acceptsJson(request)) {
    responseUtils.contentTypeNotAcceptable(response);
  }


  //GET ALL ORDERS
  if (filePath === "/api/orders" && method.toUpperCase() === "GET") {
    const auth = request.headers.authorization;
    const accept = request.headers.accept;
    const user = await getCurrentUser(request);
    if (accept !== "application/json") {
      return responseUtils.contentTypeNotAcceptable(response);
    }
    if (auth === undefined || auth === "" || user === undefined) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (user === null || user === false) {
      return responseUtils.basicAuthChallenge(response);
    }
    if(user.role === "admin"){
      return responseUtils.sendJson(response, await orderModel.find({}));
    }
    if(user.role === "customer"){
      const userOrders = await orderModel.find({customerId: user._id});
      return responseUtils.sendJson(response, userOrders);
    }/*
    if (user.role !== "customer" && user.role !== 'admin') {
      return responseUtils.forbidden(response);
    }*/
   /* const allOrders = await orderModel.find({});
    responseUtils.sendJson(response, allOrders);*/
  }




  // GET all users
  if (filePath === "/api/users" && method.toUpperCase() === "GET") {
    const auth = request.headers.authorization;
    const accept = request.headers.accept;
    const user = await getCurrentUser(request);
    if (accept !== "application/json") {
      return responseUtils.contentTypeNotAcceptable(response);
    }
    if (auth === undefined || auth === "" || user === undefined) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (user === null || user === false) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (user.role === "customer") {
      return responseUtils.forbidden(response);
    }
    responseUtils.sendJson(response, await User.find({}));
  }
/*
  if (filePath === "/api/orders" && method.toUpperCase() === "GET") {
    const auth = request.headers.authorization;
    const accept = request.headers.accept;
    const user = await getCurrentUser(request);
    if (auth === undefined || user === null || auth === "") {
      return responseUtils.basicAuthChallenge(response);
    }
    if (!acceptsJson(request) || accept === undefined) {
      return responseUtils.contentTypeNotAcceptable(response);
    }
    if(user.role === "admin"){
      return responseUtils.sendJson(response, await orderModel.find({}));
    }
    if(user.role === "customer"){
      const userOrders = await orderModel.find({customerId: user._id});
      return responseUtils.sendJson(response, userOrders);
    }
  }
*/
  // Return products
  if (filePath === "/api/products" && method.toUpperCase() === "GET") {
    const auth = request.headers.authorization;
    const user = await getCurrentUser(request);

    if (!acceptsJson(request)) {
      return responseUtils.contentTypeNotAcceptable(response);
    }

    if (auth === undefined || user === undefined || auth === "") {
      return responseUtils.basicAuthChallenge(response);
    }

    if (user === null) {
      return responseUtils.basicAuthChallenge(response);
    }
/*
    if(user.role === "admin"){
      return responseUtils.sendJson(response, await productModel.find({}));
    }
    if(user.role === "customer"){
      const userOrders = await productModel.find({customerId: user._id});
      return responseUtils.sendJson(response, userOrders);
    }*/
    
    if (user.role === "admin" || user.role === "customer") {
   
      const dbData = await productModel.find({});
      return responseUtils.sendJson(response, dbData);
    }
  }



   // New order
   if (filePath === "/api/orders" && method.toUpperCase() === "POST") {

    const auth = request.headers.authorization;
    const accept = request.headers.accept;
    const user = await getCurrentUser(request);
    if (accept !== "application/json") {
      return responseUtils.contentTypeNotAcceptable(response);
    }
    if (auth === undefined || auth === "" || user === undefined) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (user === null || user === false) {
      return responseUtils.basicAuthChallenge(response);
    }
    if (user.role === "admin") {
      return responseUtils.forbidden(response);
    }
  
    if (!isJson(request)) {
      return responseUtils.badRequest(
        response,
        "Invalid Content-Type. Expected application/json"
      );
    }
    const body = await parseBodyJson(request).catch((err) => {
      return responseUtils.badRequest(response, "400 Bad Request");
    });
    //console.log("body: " + body);


    const newOrder = await new orderModel(body);
    //console.log("New order: " + newOrder);
    if (newOrder === null || newOrder === undefined) {
      return responseUtils.badRequest(response, "400 Bad Request");
    }

    if (newOrder.items.length === 0){
      return responseUtils.badRequest(response, "400 Bad Request");
    }

    const checkBadProperties = (item) => {
      if(item.quantity === undefined ||
        item.product === undefined ||
        item.product._id === undefined ||
        item.product.name === undefined ||
        item.product.price === undefined){
          return true;
        }
        else{
          return false;
        }
    };
    if(newOrder.items.some(checkBadProperties)){
      return responseUtils.badRequest(response, "400 Bad Request");
    }
    newOrder.customerId = user._id;
    const result = await newOrder.save();
    return responseUtils.createdResource(response, newOrder);
  }

  // Add a new product
  if (filePath === "/api/products" && method.toUpperCase() === "POST") {
    // request body contains product
    // Then we have to append the product to database
    const accept = request.headers.accept;
    if (accept !== "application/json") {
      return responseUtils.contentTypeNotAcceptable(response);
    }

    if (!isJson(request)) {
      return responseUtils.badRequest(
        response,
        "Invalid Content-Type. Expected application/json"
      );
    }
    const auth = request.headers.authorization;
    const user = await getCurrentUser(request);
    if (auth === undefined || user === null) {
      return responseUtils.basicAuthChallenge(response);
    }
    if(user.role !== "admin"){// && user.role !== 'customer'){
      return responseUtils.forbidden(response);
    }

    const body = await parseBodyJson(request).catch((err) => {
      return responseUtils.badRequest(response, "400 Bad Request");
    });
    

    const newProduct = await new productModel(body);
    if(newProduct.name === undefined || newProduct.price === undefined){
      return responseUtils.badRequest(response, "400 Bad Request");
    }
    const result = await newProduct.save();
    return responseUtils.createdResource(response, result);


    /*
    parseBodyJson(request).then((product) => {
      if(product.name === undefined || product.price === undefined){
        return responseUtils.badRequest(response, "400 Bad Request");
      }
      const newProduct = await new productModel(product);
      const result = await newProduct.save();//{ ...product });
      return responseUtils.createdResource(response, result);
    }).catch((err) => {
      return responseUtils.badRequest(response, "400 Bad Request");
    });*/
  }



  // register new user
  if (filePath === "/api/register" && method.toUpperCase() === "POST") {
    // Fail if not a JSON request, don't allow non-JSON Content-Type
    const accept = request.headers.accept;
    if (accept !== "application/json") {
      return responseUtils.contentTypeNotAcceptable(response);
    }

    if (!isJson(request)) {
      return responseUtils.badRequest(
        response,
        "Invalid Content-Type. Expected application/json"
      );
    }
    const body = await parseBodyJson(request).catch((err) => {
      return responseUtils.badRequest(response, "400 Bad Request");
    });

    const emailUser = await User.findOne({ email: body.email }).exec();

    if (emailUser !== null) {
      // Checking if email is in use. (equivalent to emailInUse)
      return responseUtils.badRequest(response, "400 Bad Request");
    }
    const newUser = await new User(body);
    if (newUser === null || newUser === undefined) {
      // ????? checking if new user was valid ( equivalent to validateUser() )
      return responseUtils.badRequest(response, "400 Bad Request");
    }

    if (
      newUser.name === undefined ||
      newUser.email === undefined ||
      newUser.password === undefined
    ) {
      return responseUtils.badRequest(response, "400 Bad Request");
    }
    newUser.role = "customer";

    const result = await newUser.save();
    // The payload parameter should be '201 Created' as far as i can tell but it doesn't seem to work.
    return responseUtils.createdResource(response, newUser);
  }
};

module.exports = { handleRequest };
