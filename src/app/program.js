"use strict";
const express = require('express');
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
  database: "lab"
});

connection.connect(function(err){
  if (err) {
    console.log("Error connecting database \n\n" + err);
    throw err
  } 
  connection.query('select * from User', function(err, rows, fields){
    if(err) throw err;
    console.log(rows);
    connection.end();
    });
});

app.get('/', (req, res) => {

    res.send('Hello World');
   });
   
   app.listen(port, () => {
    console.log('Simple Example');
   });
   
  