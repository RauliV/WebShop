//const { createConnection } = require("mongoose");

const addToCart = productId => {
  // TODO 9.2
  // use addProductToCart(), available already from /public/js/utils.js
  // call updateProductAmount(productId) from this file
  addProductToCart(productId);
  updateProductAmount(productId);
};

const decreaseCount = productId => {
  // TODO 9.2
  // Decrease the amount of products in the cart, /public/js/utils.js provides decreaseProductCount()
  // Remove product from cart if amount is 0,  /public/js/utils.js provides removeElement = (containerId, elementId
  const count = decreaseProductCount(productId);
 
  if(count === 0){
    console.log('DECREASING LAST ONE:  ' + count);
    removeElement("cart-container", productId);
  }
  else{
    updateProductAmount(productId);
  }
};

const updateProductAmount = productId => {
  // TODO 9.2
  // - read the amount of products in the cart, /public/js/utils.js provides getProductCountFromCart(productId)
  // - change the amount of products shown in the right element's innerText
  const count = getProductCountFromCart(productId);
  document.querySelector("#amount-" + productId).innerHTML = count + "x";
};

const placeOrder = async() => {
  // TODO 9.2
  // Get all products from the cart, /public/js/utils.js provides getAllProductsFromCart()
  // show the user a notification: /public/js/utils.js provides createNotification = (message, containerId, isSuccess = true)
  // for each of the products in the cart remove them, /public/js/utils.js provides removeElement(containerId, elementId)
  const products = getAllProductsFromCart();
  createNotification("Succesfully created an order!", "notifications-container", true); //not sure about container-id???
  products.forEach(product => removeElement("cart-container", product.id));
  clearCart();
};

(async() => {
  // TODO 9.2
  // - get the 'cart-container' element
  // - use getJSON(url) to get the available products
  // - get all products from cart
  // - get the 'cart-item-template' template
  // - for each item in the cart
  //    * copy the item information to the template
  //    * hint: add the product's ID to the created element's as its ID to 
  //        enable editing ith 
  //    * remember to add event listeners for cart-minus-plus-button
  //        cart-minus-plus-button elements. querySelectorAll() can be used 
  //        to select all elements with each of those classes, then its 
  //        just up to finding the right index.  querySelectorAll() can be 
  //        used on the clone of "product in the cart" template to get its two
  //        elements with the "cart-minus-plus-button" class. Of the resulting
  //        element array, one item could be given the ID of 
  //        `plus-${product_id`, and other `minus-${product_id}`. At the same
  //        time we can attach the event listeners to these elements. Something 
  //        like the following will likely work:
  //          clone.querySelector('button').id = `add-to-cart-${prodouctId}`;
  //          clone.querySelector('button').addEventListener('click', () => addToCart(productId, productName));
  //
  // - in the end remember to append the modified cart item to the cart 
  const cartContainer = document.getElementById('cart-container');
  const response = await getJSON('/api/products');
  const cartProducts = getAllProductsFromCart();
  const tmp = document.getElementById('cart-item-template');
  cartProducts.forEach(item => {
    const clone = tmp.content.cloneNode(true);
    const element = response.find(product => product._id === item.id);
    clone.querySelector(".product-name").setAttribute("id", "name-" + element._id);
    clone.querySelector(".product-name").innerHTML = element.name;
    clone.querySelector(".product-price").setAttribute("id", "price-" + element._id);
    clone.querySelector(".product-price").innerHTML = element.price;
    clone.querySelector(".product-amount").setAttribute("id", "amount-" + element._id);
    clone.querySelector(".product-amount").innerHTML = item.amount + "x";
    clone.querySelectorAll(".cart-minus-plus-button")[0].setAttribute("id", "plus-" + element._id);
    clone.querySelectorAll(".cart-minus-plus-button")[1].setAttribute("id", "minus-" + element._id);
    clone.querySelectorAll(".cart-minus-plus-button")[0].addEventListener('click', () => addToCart(element._id, element.name));
    clone.querySelectorAll(".cart-minus-plus-button")[1].addEventListener('click', () => decreaseCount(element._id, element.name));
    clone.querySelector(".item-row").setAttribute("id", element._id);
    cartContainer.appendChild(clone);
  });
  document.getElementById("place-order-button").addEventListener('click', () => {
    placeOrder();
  });

})();