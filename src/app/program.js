"use strict";
const express = require('express');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
var moment = require('moment');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: 'application/*+json' }));
// parse some custom thing into a Buffer
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
// parse an HTML body into a string
app.use(bodyParser.text({ type: 'text/html' }));
// parse an text body into a string
app.use(bodyParser.text({ type: 'text/plain' }));
// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: false }));
var multer  = require('multer');

var upload = multer() ;
try{
  var mysql = require('mysql');
}catch(err){
  console.log("Cannot find `mysql` module. Is it installed ? Try `npm install mysql` or `npm install`.");
}

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: 3306,
  password: "password",
  database: "db"
});

connection.connect(function(err){
  if (err) {
    console.log("Error connecting database \n\n" + err);
    throw err
  } 
});

app.post('/register', upload.array(), (req, res, next) => {
  //fix this to return everything but password
  let user = req.body['username'];
  if (user == null || user == '') {
    res.status(400).send(req.body);
    return res.end();
  }
  user = user.replace("'", "''");
  connection.query('select Username from Users where Username = "'+user +'";', function(err, rows, fields){
    if(err) throw err;
    if(rows.length !== 0){
       console.log(rows);
       res.status(400).send("Username Exists");
       next();
    }
    else {
      if(req.body['password'] == null) {
        return res.status(400).send("password is blank");
      }
      const ps = crypto.createHash('sha256');
      ps.update(req.body['password']);
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = date+' '+time;
        let firstName = req.body['firstName'];
        firstName = firstName.replace("'", "''");
        let lastName = req.body['lastName'];
        lastName = lastName.replace("'", "''");
        let address = req.body['address'];
        address = address.replace("'", "''");
        let userId = "";
      connection.query('INSERT INTO Users( Username, Password, DateCreated, FirstName, LastName) VALUES("' + user + '","' + ps.digest('hex')+'","' + dateTime +'","' + firstName + '","' + lastName + ');');
      connection.query('SELECT userId FROM Users WHERE Username = "' + user + '";',function(err, rows, fields){
        console.log(rows);
        userId = rows[0]['userId'];
        console.log(userId);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ userId: userId, firstName: firstName, username: user, dateCreated: dateTime, lastName: lastName, address: address, zip: req.body['zip']  }));
      });
    }
  })
});

app.get('/checkuser/:username', (req, res, next) => {
  //we are checking to see if a user exists by username
  //we are using this during register page
  let userId = req.params.username;
  userId = userId.replace("'", "''");
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('SELECT * FROM Users WHERE Username = "' + userId + '";', function(err, rows, fields){
        if(rows.length != 0){
          let userAvailable = 0;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ userAvailable: 0 }));
        }
        else {
          let userAvailable = 1;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ userAvailable: 1 }));
        }
      });
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});

app.put('/users',upload.array(), (req, res, next) => {
  let userId = req.body['userId'];
  //in this route we will be taking all new information in via form data and updating it
  //to do this in fewer sql queries we will gather all information by cheking if form data is null
  let firstNameString = "";
  let lastNameString = '';
  let addressString = '';
  let zip = req.body['zip'].toString();

  if(req.body['firstName'].length != 0) {
    let firstName = req.body['firstName'];
    firstName = firstName.replace("'", "''");
    firstNameString = ' FirstName = "' + firstName + '"';
  }
  if(req.body['lastName'].length != 0) {
    let lastName = req.body['lastName']
    lastName = lastName.replace("'", "''");
    lastNameString = ' LastName = "' + lastName + '"';
  }
  if(req.body['address'].length != 0) {
    let address= req.body['address'];
    address = address.replace("'", "''");
    addressString = ' Address = "' + address + '"';
  }
  if(zip.length != 0){
    zip =  ' Zip = ' + req.body['zip'];
  }
  let newString = firstNameString;
  if(newString.length != 0){
    newString += ",";
  }
  newString += lastNameString;
  if(lastNameString.length != 0){
    newString += ',';
  }
  newString += addressString;
  if(addressString.length != 0){
    newString += ',';
  }
  if(zip.length != 0){
    newString += zip;
  }
  if(newString[newString.length -1] == ','){
    newString = newString.substring(0, newString.length - 1);
  }
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('UPDATE Users SET '+ newString + ' WHERE UserId = ' + userId + ';');
      res.status(200);
      return res.end();
    }
    catch(e) {
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});

app.get('/users/login', upload.array(),  (req, res, next) =>{
  //this will be the login endpoint. it will take the username and password. 
  //itll check if it is valid and if it is it will then it will return all user information
  //if not itll return an error 
  let username = req.body['username'];
  username = username.replace("'", "''");
  const ps = crypto.createHash('sha256');
  ps.update(req.body['password']);
  let password = ps.digest('hex');
  var promise = new Promise(function(resolve, reject) {
    try {
      console.log('select * From Users where Username = "'+username+'" AND Password="'+password+'";');
      connection.query('select * From Users where Username = "'+username+'" AND Password="'+password+'";', function(err, rows, fields){
        if(rows.length == 0){
          return res.status(400).send('Username or password is incorrect');
        }
        console.log(rows[0]);
        res.setHeader('Content-Type', 'application/json');
        console.log(rows);
        res.end(JSON.stringify({ userId: rows[0]['UserId'], firstName: rows[0]['FirstName'], username: rows[0]['Username'], dateCreated: rows[0]['DateCreated'], lastName: rows[0]['LastName'], address: rows[0]['Address'], zip: rows[0]['Zip'], isAdmin: rows[0]['IsAdmin']  }));
      });
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});

app.put('/users/password', upload.array(), (req, res, next) => {
  //this is the reset password area
  //it takes username and password and changes it to the new password
  let username = req.body['username'];
  username = username.replace("'", "''");
  const ps = crypto.createHash('sha256');
  ps.update(req.body['password']);
  let password = ps.digest('hex');
  var promise = new Promise(function(resolve, reject) {
    try {
      //now we find user and then update the password
      console.log('UPDATE Users SET Password = "' + password + '" WHERE Username = "'+username+'";');
      connection.query('UPDATE Users SET Password = "' + password + '" WHERE Username = "'+username+'";');
      res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
app.listen(4444, '127.0.0.1');
   
  