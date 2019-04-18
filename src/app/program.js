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
  connection.query('select DisplayName from Users where DisplayName = "'+user +'";', function(err, rows, fields){
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
      let userId = uuidv4();
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = date+' '+time;
      connection.query('INSERT INTO Users(UserId, DisplayName, Password, DateCreated) VALUES("' + userId+'","' + user + '","' + ps.digest('hex')+'","' + dateTime +'");');
      var text = ' { "userId": "' + userId + '", "dateCreated": "' + dateTime + '"}'; 
      res.status(200).send(text);
      return res.end();
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
      connection.query('SELECT * FROM Users WHERE DisplayName = "' + userId + '";', function(err, rows, fields){
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

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
app.listen(4444, '127.0.0.1');
   
  