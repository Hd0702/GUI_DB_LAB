"use strict";
const express = require('express');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
const app = express();
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
  connection.query('select * from user', function(err, rows, fields){
    if(err) throw err;
    console.log(rows);
    });
});
app.post('/user/new/:username/:password', (req, res) => {
try{
  hash.update(req.params.password);
  connection.query('INSERT INTO user(id, username, password) VALUES ("'+uuidv4()+ '","'+ req.params.username +'","' + hash.digest('hex') + '");');
}
catch(err){
  res.send(err);
}
  res.send('success');
});

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
   app.listen(port, () => {
    console.log('Simple Example');
   });
   
  