"use strict";
const express = require('express');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
var moment = require('moment');
const app = express();
app.use(express.json())

const port = 3000;
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
  connection.query('select * from Users', function(err, rows, fields){
    if(err) throw err;
    console.log(rows);
    });
});
app.post('/user/new/', (req, res) => {
try{
  var test = res.getHeader('username');
  //res.send(req.body);
  hash.update(res.getHeader("password"));
  var time = moment().format('yyyy-mm-dd:hh:mm:ss');
  connection.query('INSERT INTO User(UserId, Username, Password, DateCreated, DisplayName) VALUES ("'+uuidv4()+ '","'+ "sdsdsd" +'","' +"ssdsd" + '","' + "2019-01-01:01:01:01" + '","'+ "sdsdsd" + '");');
}
catch(err){
  console.log(err);
}
  res.send('success');
});

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
   app.listen(port, () => {
    console.log('Simple Example');
   });
   
  