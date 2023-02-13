/**
 * TODO: 8.4 Register new user
 *       - Handle registration form submission
 *       - Prevent registration when password and passwordConfirmation do not match
 *       - Use createNotification() function from utils.js to show user messages of
 *       - error conditions and successful registration
 *       - Reset the form back to empty after successful registration
 *       - Use postOrPutJSON() function from utils.js to send your data back to server
 */

//const { util } = require("chai");
//const { utils } = require("mocha");

let form = document.getElementById('register-form');

form.addEventListener('submit', e => {
    e.preventDefault();
    let data = new FormData(e.target);
    let pw = data.get("password");
    let pwc = data.get("passwordConfirmation");
    if(pw !== pwc){
        createNotification("passwords do not match!", "register-form", false);
    }
    else{
        let url = "/api/register";
        console.log(data);
        const formDataObj = Object.fromEntries(data.entries());

        postOrPutJSON(url, "POST", formDataObj);
        createNotification("Registration successful", "register-form", true);
        form.reset();
        
    }  
})