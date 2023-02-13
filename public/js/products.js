const addToCart = (productId, productName) => {
  // TODO 9.2
  // you can use addProductToCart(), available already from /public/js/utils.js
  // for showing a notification of the product's creation, /public/js/utils.js  includes createNotification() function
  addProductToCart(productId);
  let msg = "Added " + productName + " to cart!"
  createNotification(msg, "notifications-container", true);
};

(async() => {
  //TODO 9.2 
  // - get the 'products-container' element from the /products.html
  // - get the 'product-template' element from the /products.html
  // - save the response from await getJSON(url) to get all the products. getJSON(url) is available to this script in products.html, as "js/utils.js" script has been added to products.html before this script file 
  // - then, loop throug the products in the response, and for each of the products:
  //    * clone the template
  //    * add product information to the template clone
  //    * remember to add an event listener for the button's 'click' event, and call addToCart() in the event listener's callback
  // - remember to add the products to the the page
  
  let prodContainer = document.getElementById('products-container');
  let prodTemplate = document.getElementById('product-template');
  let response = await getJSON('/api/products');

  response.forEach(element => {
    const clone = prodTemplate.content.cloneNode(true);
    clone.querySelector(".product-name").setAttribute("id", "name-" + element._id);
    clone.querySelector(".product-name").innerHTML = element.name;
    clone.querySelector(".product-description").setAttribute("id", "description-" + element._id);
    clone.querySelector(".product-description").innerHTML = element.description;
    clone.querySelector(".product-price").setAttribute("id", "price-" + element._id);
    clone.querySelector(".product-price").innerHTML = element.price;
    clone.querySelector("button").setAttribute("id", "add-to-cart-" + element._id)
    clone.querySelector("button").addEventListener('click', () => {addToCart(element._id, element.name);});
    prodContainer.appendChild(clone);
  });
})();