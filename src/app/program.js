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

app.listen(4444, '127.0.0.1');
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
      connection.query('INSERT INTO Users( Username, Password, DateCreated, FirstName, LastName) VALUES("' + user + '","' + ps.digest('hex')+'","' + dateTime +'","' + firstName + '","' + lastName + '");');
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
/*Auction Routes*/
//Get all auctions
//get all auctions
//get all auctions bu user id join to return username too
//get all auctions by auction id join to return username and userId associated with auction id
//delete auction will delete by auction id

app.post('/auctions', upload.array(), (req, res, next) => {
  //this is the post route for auctions
  //takes in userid, datecreated, endtime, carid
  let userId = req.body['userId'];
  let dateCreated = req.body['dateCreated'];
  let endTime = req.body['endTime'];
  dateCreated = new Date();
  endTime = new Date(dateCreated);
  endTime.setDate(endTime.getDate() + 2);
  console.log(endTime);
  let price = req.body['price'];
  let make = req.body['make'];
  let model = req.body['model'];
  let year = req.body['year'];
  let zip = req.body['zip'];
  let description = req.body['description'];
  make = make.replace("'", "''");
  model = model.replace("'", "''");
  description = description.replace("'", "''");
  dateCreated = JsToSqlDateTime(dateCreated);
  endTime = JsToSqlDateTime(endTime);
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('INSERT INTO Auctions (UserId, StartTime, EndTime, Price, Make, Model, Year, Zip, Description) VALUES({0}, "{1}", "{2}", {3},"{4}", "{5}", {6}, {7}, "{8}");'.format(userId, dateCreated, endTime, price, make, model, year, zip, description));
      //TODO: DO THEY WANT TO RETURN ANYTHING
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

app.get('/auctions', (req, res, next) => {
  //this returns all auctions by most recent
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('SELECT A.UserId, AuctionId, StartTime, EndTime, Price, Make, Model, Year, A.Zip, Description, Username From Auctions A JOIN Users ON Users.UserId = A.UserId ORDER BY StartTime DESC;', function(err, rows, field) {
        if(rows.length == 0){
          res.status(400).send('no rows returned');
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(rows));
      });
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

app.get('/auctions/users/:userId', (req,res,next) =>{
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('SELECT * from Auctions WHERE UserId = {0} ORDER BY StartTime DESC;'.format(userId), function(err, rows, fields){
        if(rows.length == 0){
          res.status(400).send('no rows returned');
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(rows));
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

app.get('/auctions/:auctionId', (req,res,next) =>{
  var promise = new Promise(function(resolve, reject){
    try{
      let auctionId = req.params.auctionId;
      auctionId = auctionId.replace("'", "''");
      connection.query('SELECT A.UserId, AuctionId, StartTime, EndTime, Price, Make, Model, Year, A.Zip, Description, Username From Auctions A  JOIN Users ON Users.UserId = A.UserId WHERE AuctionId = {0} ORDER BY StartTime DESC;'.format(auctionId), function(err, rows, field)  {
        if(rows.length == 0){
          res.status(400).send('no rows returned');
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(rows));
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

app.delete('/auctions/:auctionId', (req, res, next) =>{
  var promise = new Promise(function(resolve, reject){
    let auctionId = req.params.auctionId;
    auctionId = auctionId.replace("'", "''");
    connection.query('DELETE FROM Auctions WHERE AuctionId = {0}'.format(auctionId), function(err ,rows, field){
      res.status(200).end('success');
    });
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});
/*SPRINT 3 ROUTE*/
//Post Bid given auctionId, userId, and price
app.post('/bid', upload.array(), (req, res, next) => {
  console.log('se');
  var promise = new Promise(function(resolve, reject) {
    var today = new Date();
    let userId = req.body['userId'];
    let auctionId = req.body['auctionId'];
    let price = req.body['price'];
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    try{
      connection.query('INSERT INTO Bids(UserId, AuctionId, Time, Price) VALUES ({0}, {1}, "{2}", {3});'.format(userId, auctionId, dateTime, price));
      res.status(200).end('success');
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
  })
});

//this function is a helper function for turning js dates into sql
function twoDigits(d) {
  if(0 <= d && d < 10) return "0" + d.toString();
  if(-10 < d && d < 0) return "-0" + (-1*d).toString();
  return d.toString();
}
//this function is how we convert passed in js dates into sql dates
function JsToSqlDateTime(a) {
  var y =  a.getFullYear() + "-" + twoDigits(1 + a.getMonth()) + "-" + twoDigits(a.getDate()) + " " + twoDigits(a.getHours()) + ":" + twoDigits(a.getHours()) + ":" + twoDigits(a.getSeconds());
  return y;
};
//this helper function helps format strings easier for sql queries
String.prototype.format = function() {
  var s = this,
      i = arguments.length;

  while (i--) {
      s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
  }
  return s;
};