/**
 * Asynchronously fetch JSON from the given url. (GET)
 *
 * Uses fetch to get JSON from the backend and returns the parsed
 * JSON back.
 *
 * Remember that an async function always returns a Promise which
 * needs to be awaited or handled with then() as in:
 *
 *   const json = await getJSON("/api/users");
 *
 *   -- OR --
 *
 *   getJSON("/api/users").then(json => {
 *     // Do something with the json
 *   })
 *
 * @param {string} url resource url on the server
 * @returns {Promise<*>} promise that resolves to the parsed JSON
 */
const getJSON = async url => {
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Network response was not OK');
  return await response.json();
};

/**
 * Asynchronously update existing content or create new content on the server (PUT or POST)
 *
 * Uses fetch to send data as JSON to the server and returns the response as JSON.
 * Again remember that async function always returns a Promise.
 *
 * @param {string} url resource url on the server
 * @param {string} method "PUT" or "POST"
 * @param {object|Array} data payload data to be sent to the server as JSON
 * @returns {Promise<*>} promise that resolves to the parsed JSON
 */
const postOrPutJSON = async(url, method, data = {}) => {
  method = method.toUpperCase();
  if (method !== 'POST' && method !== 'PUT') {
    throw 'Invalid method! Valid methods are POST and PUT!';
  }

  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Network response was not OK');
  if (response.status < 200 || response.status > 400) {
    throw new Error(`Received "${response.status} ${response.statusText}"`);
  }

  return await response.json();
};

/**
 * Asynchronously remove a resource from the server (DELETE)
 *
 * Uses fetch to send the request to the server and returns the response as JSON.
 * Again remember that async function always returns a Promise.
 *
 * @param {string} url resource url on the server
 * @returns {Promise<*>} promise that resolves to the parsed JSON
 */
const deleteResource = async url => {
  // TODO: 8.6 Implement this
  const resp = await fetch(url, {method: 'DELETE'});
  return await resp.json();
  
};

/**
 * Generate random unique id to use as id value on notifications
 * or other HTML elements (remember that IDs must be unique within
 * a document).
 *
 * @returns {string} generated id
 */
const generateId = () => {
  // Shamelessly borrowed from a Gist. See:
  // https://gist.github.com/gordonbrander/2230317
  return (
    '_' +
    Math.random()
    .toString(36)
    .substr(2, 9)
  );
};

/**
 * Create a notification message that disappears after five seconds.
 *
 * Appends a new paragraph inside the container element and gives it
 * class based on the status of the message (success or failure).
 *
 * @param {string} message text of the notification
 * @param {string} containerId id attribute of the container element
 * @param {boolean} isSuccess whether the message describes a success or a failure
 */
const createNotification = (message, containerId, isSuccess = true) => {
  const container = document.getElementById(containerId);

  // Create new p element to hold text
  const newParagraph = document.createElement('p');

  // Create unique id for the notification so that it can easily be removed after timeout
  const notificationId = generateId();
  newParagraph.id = notificationId;

  // Set CSS class for the paragraph based on the isSuccess variable
  newParagraph.classList.add(isSuccess ? 'background-lightgreen' : 'background-red');

  // Add message test inside the paragraph and append the paragraph to the container
  newParagraph.append(document.createTextNode(message));
  container.append(newParagraph);

  // After five seconds remove the notification
  setTimeout(() => {
    removeElement(containerId, notificationId);
  }, 5000);
};

/**
 * Remove an element (and its descendants) from the DOM.
 *
 * @param {string} containerId containing element's id
 * @param {string} elementId id of the element to be removed
 */
const removeElement = (containerId, elementId) => {
  const container = document.getElementById(containerId);
  container.querySelectorAll(`#${CSS.escape(elementId)}`).forEach(element => {
    
    element.remove();
  });
};


const addProductToCart = productId => {
  // TODO 9.2
  // Use sessionStorage's setItem('key', 'value')
  // (https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#basic_usage)
  // to set the product data to the session storage
  // if the productCount is undefined 
  //    key: productId
  //    data: 1
  // but if productCount is defined
  //    key: productId
  //    data: productCount + 1
  const productCount = getProductCountFromCart(productId); // parseInt()?
  const productCountInt = parseInt(productCount);
  if(productCount === null){
    window.sessionStorage.setItem(productId, '1');
  }
  else {
  window.sessionStorage.setItem(productId, (productCountInt+1).toString());
  }
};

const decreaseProductCount = productId => {
    // TODO 9.2
    // use sessionStorage's setItem('key', 'value')
    // (https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#basic_usage) to remove 1 from the product amount
    // in the cart
    //    key: productId
    //    data: productCount - 1
  const productCount = getProductCountFromCart(productId); // parseInt()?
  if (parseInt(productCount) > 1) {
    const newCount = parseInt(productCount)-1;
    window.sessionStorage.setItem(productId, newCount.toString());
    return newCount;
  } else {
    // TODO 9.2 
    // use sessionStorage's removeItem('key') to remove 
    // the item if its count/amount drops to zero 
    // (https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#basic_usage)
    //    key: productId
    window.sessionStorage.removeItem(productId);
    
    return 0;
  }
};

const getProductCountFromCart = productId => {
  // TODO 9.2
  // use sessionStorage's getItem('key') to to fetch and
  // return the storage item product's value/amount 
  // from the session storage
  // with the productId as the key 
  // (https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#basic_usage)
  //    key: productId
  // Return the fetched product amount (the fetched
  //     value of the session storage item)
  return window.sessionStorage.getItem(productId);
};

const getAllProductsFromCart = () => {
  return Object.keys(sessionStorage).reduce((array, str) => {
    const item = {
      id: str,
      amount: sessionStorage.getItem(str)
    };
    return [...array, item];
  }, []);
};

const clearCart = () => {
 window.sessionStorage.clear();
};