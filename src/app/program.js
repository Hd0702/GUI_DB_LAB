"use strict";
const express = require('express');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
var moment = require('moment');
const app = express();
var bodyParser = require('body-parser').json();

const port = 4444;
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

app.post('/register', bodyParser, (req, res, next) => {
  let user = req.body['username'];
  
  if (user == null || user == '') {
    res.status(400).send("userame is blank");
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

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
   app.listen(port, () => {
    console.log('Simple Example');
   });
   
  