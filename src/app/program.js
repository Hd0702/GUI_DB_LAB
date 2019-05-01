"use strict";
const express = require('express');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
var moment = require('moment');
var cors = require('cors'); //CORS**
const app = express();
app.use(cors()); //We need CORS enabled for the front end

const bodyParser = require('body-parser');
app.use(bodyParser.json());
// parse various different custom JSON types as JSON
app.use(bodyParser.json({limit: '10mb', extended: true}));
// parse some custom thing into a Buffer
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
// parse an HTML body into a strings
app.use(bodyParser.text({ type: 'text/html' }));
// parse an text body into a string
app.use(bodyParser.text({ type: 'text/plain' }));
// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
var multer  = require('multer');
var upload = multer() ;
try{
  var mysql = require('mysql');
}catch(err){
  console.log("Cannot find `mysql` module. Is it installed ? Try `npm install mysql` or `npm install`.");
}
//DEBUG
//this.res.setHeader('Content-Type', 'application/json');
app.listen(4444, () => console.log('Server running on port 4444'));

//this code was definitely not taken from stackoverflow
var db_config = {
  host: 'localhost',
    user: 'root',
    port: 3306,
    password: 'password',
    database: 'db',
		typeCast: function castField( field, useDefaultTypeCasting ) {
        if ( ( field.type === "BIT" ) && ( field.length === 1 ) ) {
             var bytes = field.buffer();
            return( bytes[ 0 ] === 1 );
         }
        return( useDefaultTypeCasting() );
    }
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config);

  connection.connect(function(err) {
    if(err) {
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    }
    else {
      console.log('connected');
    }
  });
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

//get all users everything but password route
app.get('/users', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('Select UserId, FirstName, LastName, Address, Zip, Username, IsAdmin, DateCreated, ProfilePicture, City, State From Users;', function(err, rows, fields){
        console.log(rows);
        res.status(200).send(rows);
        res.end();
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

app.get('/usersPublic', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('Select U.UserId, FirstName, LastName, U.Zip, Username, DateCreated, ProfilePicture, COUNT(DISTINCT A.AuctionId) as CarsListed, AVG(R.Rating) as AvgRating FROM Users U LEFT JOIN Ratings R On U.UserId=R.userid LEFT JOIN Auctions A on U.UserId = A.UserId Group By U.UserId; ', function(err, rows, fields){
        console.log(rows);
        res.status(200).send(rows);
        res.end();
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

app.delete('/user/:userId', (req, res, next) =>{
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    let userId = req.params.userId;
    //delete all releted items to a user
    try{
      connection.query('DELETE FROM Users Where UserId = '+userId+';');
    }
    catch(e){
      return res.end();
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end()
  })
});

app.post('/register', upload.array(), (req, res, next) => {
  //fix this to return everything but password
  res.setHeader('Content-Type', 'application/json');
  let user = req.body['username'];
  if (user == null || user == '') {
    res.status(400).send(req.body);
    return res.end();
  }
  user = user.replace("'", "''");
  connection.query('select Username from Users where Username = "'+user +'";', function(err, rows, fields){
    if(err) throw err;
    if( rows.length !== 0){
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
        let picture = req.body['profilePicture'];
        let userId = "";
        connection.query('INSERT INTO Users( Username, Password, DateCreated, FirstName, LastName, ProfilePicture) VALUES("' + user + '","' + ps.digest('hex')+'","' + dateTime +'","' + firstName + '","' + lastName + '","'+picture+'");');
        connection.query('SELECT userId, address, zip, ProfilePicture FROM Users WHERE Username = "' + user + '";',function(err, rows, fields){
        userId = rows[0]['userId'];
        res.end(JSON.stringify({ userId: userId, firstName: firstName, username: user, dateCreated: dateTime, lastName: lastName, address: '', zip: '', profilePicture: rows[0]['ProfilePicture']  }));
      });
    }
  })
});

app.get('/checkuser/:username', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  //we are checking to see if a user exists by username
  //we are using this during register page
  let userId = req.params.username;
  userId = userId.replace("'", "''");
  var promise = new Promise(function(resolve, reject){
    try{
      connection.query('SELECT * FROM Users WHERE Username = "' + userId + '";', function(err, rows, fields){
        if(rows == null || rows.length != 0){
          let userAvailable = 0;
          res.end(JSON.stringify({ userAvailable: 0 }));
        }
        else {
          let userAvailable = 1;
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

app.put('/user',upload.array(), (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  let userId = req.body['userId'];
  //in this route we will be taking all new information in via form data and updating it
  //to do this in fewer sql queries we will gather all information by cheking if form data is null
  let firstNameString = '';
  let lastNameString = '';
  let addressString = '';
  let zip = '';
  let city = '';
  let state = '';
	console.log(req.body)
  if(req.body['firstName'] != undefined &&req.body['firstName'].length != 0) {
    let firstName = req.body['firstName'];
    firstName = firstName.replace("'", "''");
    firstNameString = ' FirstName = "' + firstName + '"';
  }
  if(req.body['lastName'] != undefined &&req.body['lastName'].length != 0) {
    let lastName = req.body['lastName']
    lastName = lastName.replace("'", "''");
    lastNameString = ' LastName = "' + lastName + '"';
  }
  if(req.body['address'] != undefined && req.body['address'].length != 0) {
    let address= req.body['address'];
    address = address.replace("'", "''");
    addressString = ' Address = "' + address + '"';
  }
  if(req.body['zip'] != undefined &&req.body['zip'].length != 0){
    zip = req.body['zip'];
    zip =  ' Zip = ' + zip;
  }
  if(req.body['state_code'] != undefined &&req.body['state_code'].length != 0){
    state = req.body['state_code'];
    state = state.replace("'", "''");
    state = ' State = "' + state + '"';
  }
  if(req.body['city'] != undefined &&req.body['city'].length != 0) {
    city = req.body['city'];
    city = city.replace("'", "''");
    city = ' City = "' + city + '"';
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
  newString += zip;
  if(zip.length != 0){
    newString += ',';
  }
  newString += state;
  if(state.length != 0){
    newString += ',';
  }
  newString += city;
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

app.post('/user/login', upload.array(),  (req, res, next) =>{
  //this will be the login endpoint. it will take the username and password.
  //itll check if it is valid and if it is it will then it will return all user information
  //if not itll return an error
  res.setHeader('Content-Type', 'application/json');
  let username = req.body['username'];
  username = username.replace("'", "''");
  const ps = crypto.createHash('sha256');
  ps.update(req.body['password']);
  let password = ps.digest('hex');
  var promise = new Promise(function(resolve, reject) {
    try {
      console.log('select * From Users where Username = "'+username+'" AND Password="'+password+'";');
      connection.query('Select *, 1 as loginAuth From Users where Username = "'+username+'" AND Password="'+password+'";', function(err, rows, fields){
	if(rows == null  ||rows.length == 0){
	        res.end(JSON.stringify({ loginAuth: 0}));
          return res.status(200);
        }
        console.log(rows[0]);
        console.log(rows);
	let result = rows[0];
        res.end(JSON.stringify({ loginAuth: 1, userId: rows[0]['UserId'], firstName: rows[0]['FirstName'], username: rows[0]['Username'], dateCreated: rows[0]['DateCreated'], lastName: rows[0]['LastName'], address: rows[0]['Address'], zip: rows[0]['Zip'], isAdmin: rows[0]['IsAdmin'], profilePicture: rows[0]['ProfilePicture']  }));
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

app.get('/user/:userId', (req,res,next) =>{
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('SELECT * from Users WHERE UserId = {0}'.format(userId), function(err, rows, fields){
        if(rows == null ||rows.length == 0){
          res.status(400).send('no rows returned');
        }
        res.end(JSON.stringify(rows[0]));
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

app.put('/user/password', upload.array(), (req, res, next) => {
  //this is the reset password area
  //it takes username and password and changes it to the new password
  res.setHeader('Content-Type', 'application/json');
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

app.post('/auction', upload.array(), (req, res, next) => {
  //this is the post route for auctions
  //takes in userid, datecreated, endtime, carid
  res.setHeader('Content-Type', 'application/json');
  let userId = req.body['userId'];
  let dateCreated = new Date(req.body['dateCreated']);
  let endTime = new Date(req.body['endTime']);
  let color = req.body['color'];
  let mileage = req.body['mileage'];
  if(color != null){
    color = color.replace("'", "''");
  }
  if(mileage != null){
    mileage = mileage.replace("'", "''");
  }

  /***** DEBUG ******
  dateCreated = new Date();
  endTime = new Date(dateCreated);
  endTime.setDate(endTime.getDate() + 2);
  console.log(endTime);
  */

  let price = req.body['price'];
  let make = req.body['make'];
  let model = req.body['model'];
  let year = req.body['year'];
  let zip = req.body['zip'];
  let image = req.body['image'];
  let description = req.body['description'];
  if(make != null){
    make = make.replace("'", "''");
  }
  else make = "";
  if(model != null){
    model = model.replace("'", "''");
  }
  else model = "";
  if(description != null){
    description = description.replace("'", "''");
  }
  else{
    description = "";
  }
  if (zip == null) zip = null;
  if(year == null) year = null;
  if(mileage == null) mileage = null;
  if(color != null){
    color = color.replace("'", "''");
  } 
  else color = '';
  if(image == null) image = "";
  dateCreated = JsToSqlDateTime(dateCreated);
  endTime = JsToSqlDateTime(endTime);
  var promise = new Promise(function(resolve, reject){
    try{
      //DEBUG
      //console.log('INSERT INTO Auctions (UserId, StartTime, EndTime, Price, Make, Model, Year, Zip, Description, Color, Mileage, Image) VALUES('+userId + ', "'+dateCreated+'", "'+endTime+'", '+price+',"'+make+'", "'+model+'", '+year+', '+zip+', "'+description+'", "'+color+'", '+mileage+',"'+image+'");');
      connection.query('INSERT INTO Auctions (UserId, StartTime, EndTime, Price, Make, Model, Year, Zip, Description, Color, Mileage, Image) VALUES('+userId + ', "'+dateCreated+'", "'+endTime+'", '+price+',"'+make+'", "'+model+'", '+year+', '+zip+', "'+description+'", "'+color+'", '+mileage+',"'+image+'");', function(err, result, fields){
        res.end(JSON.stringify({ userId: userId, auctionId: result['insertId'], startTime: dateCreated, endTime: endTime, price: price, make: make, model: model, year: year, description: description, color: color, mileage: mileage   }));
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

app.get('/auctions', (req, res, next) => {
  //this returns all auctions by most recent
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      //DEUBG
      //console.log('SELECT A.UserId, AuctionId, StartTime, EndTime, Price, Make, Model, Year, A.Zip, Description, Username From Auctions A JOIN Users ON Users.UserId = A.UserId ORDER BY StartTime DESC;');
      connection.query('SELECT A.UserId, A.AuctionId, B.AuctionId, GROUP_CONCAT(test) as HighestBid, A.StartTime, A.EndTime, A.Mileage, A.Color, A.Make, A.Model, A.Zip, A.Year, A.Description, A.Image, Username FROM Auctions A JOIN Users ON Users.UserId = A.UserId LEFT JOIN (SELECT AuctionId, MAX(Price) as test FROM Bids GROUP BY AuctionId) B ON B.AuctionId = A.AuctionId GROUP BY A.AuctionId;', function(err, rows, field) {
	      if(rows == null ||rows.length == 0){
          res.status(400).send('no rows returned');
        }
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

app.get('/auctions/user/:userId', (req,res,next) =>{
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('SELECT * from Auctions WHERE UserId = {0} ORDER BY StartTime DESC;'.format(userId), function(err, rows, fields){
	      if(rows == null ||rows.length == 0){
          res.status(400).send('no rows returned');
        }
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

app.get('/auction/:auctionId', (req,res,next) =>{
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let auctionId = req.params.auctionId;
      auctionId = auctionId.replace("'", "''");
      connection.query('SELECT A.UserId, AuctionId, StartTime, EndTime, Price, Make, Model, Year, A.Zip, Description, Color, Username, Image, Mileage From Auctions A  JOIN Users ON Users.UserId = A.UserId WHERE AuctionId = {0} ORDER BY StartTime DESC;'.format(auctionId), function(err, rows, field)  {
        if(rows == null  ||rows.length == 0){
          res.status(400).send('no rows returned');
        }
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

app.delete('/auction/:auctionId', (req, res, next) =>{
  res.setHeader('Content-Type', 'application/json');
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

app.get('/users/auctions', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject) {
    try{
        connection.query('SELECT U.UserId, firstName, lastName, username, datecreated, COUNT(auctionId) AS carsListed, AVG(Rating) as averageRating, ProfilePicture FROM Users U LEFT JOIN Auctions A ON A.userId = U.userId LEFT JOIN Ratings R ON R.UserId= U.UserId Group By(U.UserId);', function(err, rows, fields){
          console.log(rows);
          if(rows == null ||rows.length == 0){
            res.status(400).send('no rows returned');
          }
          else {
          rows.forEach(function(element) {
            element['carsListed'] /= 2;
          });
        }
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

app.put('/user/image', upload.array(), (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  //this route adds a profile image by userId
  var promise = new Promise(function(resolve, reject){
    try{
      console.log(req.body);
      let userId = req.body['userId'];
      let picture = req.body['profilePicture'].toString();
      connection.query('UPDATE Users SET ProfilePicture = "'+ picture +'" WHERE UserId = {0};'.format(userId));
      return res.status(200).end();
    }
    catch(e) {
      throw e;
    }
  });
  promise.catch(function(error){
		console.log(error);
    res.status(400).send(error);
    return res.end();
  });
});

app.put('/auction/image', upload.array(), (req, res, next) => {
  //this function inserts the auction image
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let auctionId = req.body['auctionId'];
      let picture = req.body['image'];
			connection.query('UPDATE Auctions SET Image = "'+picture+'" WHERE AuctionId = {0};'.format( auctionId));
      return res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end();
  });
});

app.put('/user/admin/:userId', (req,res, next) =>{
  //this route toggles if a user is an admin or not
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('UPDATE Users SET IsAdmin = IsAdmin ^ 1 Where UserId= {0};'.format(userId));
      res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end();
  });
});

app.get('/user/rating/:userId', (req, res, next) =>{
  //this route gets a user and then returns user info, amount of auctions they have, and average rating
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('select u.UserId, u.FirstName, u.LastName, u.Address, u.Zip, u.Username, u.IsAdmin, u.DateCreated, u.ProfilePicture, u.City, u.State, COUNT(AuctionId) AS carsListed, AVG(Rating) AS averageRating From Users u LEFT JOIN Auctions A ON A.UserId = u.UserId LEFT JOIN Ratings R ON R.UserId = u.UserId WHERE u.UserId = {0}'.format(userId), function(err, rows, fields){
        if(rows == null || rows.length == 0){
          res.status(400).send('no rows returned');
        }
        else{
          rows[0]['carsListed'] /= 2;
        }
        res.end(JSON.stringify(rows));
      });
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end();
  });
});

app.get('/user/ratings/:userId', (req, res, next) => {
  //this returns all the ratings entangled to a userId
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let userId = req.params.userId;
      userId = userId.replace("'", "''");
      connection.query('SELECT R.UserId, RaterId, FirstName, LastName, Rating, Description  FROM Ratings R JOIN Users U On R.RaterId = U.UserId WHERE R.UserId = {0}'.format(userId), function(err, rows, fields) {
        if(rows == null || rows.length == 0){
          res.status(400).send('no rows returned');
        }
        else{
          res.end(JSON.stringify(rows));
        }
      });
    }
    catch(e){
      throw e;
    }
  });
});

app.post('/rating', upload.array(), (req,res,next) =>{
  //this route posts reviews
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try {
      let userId = req.body['userId'];
      let raterId = req.body['raterId'];
      let description = req.body['description'];
      let rating = req.body['rating'];
      if(description != null){
        description = description.replace("'", "''");
      }
      else{
        description ="";
      }
      console.log('INSERT INTO Ratings(UserId, RaterId, Description, Rating) VALUES({0},{1},"{2}",{3});'.format(userId, raterId,description, rating));
      connection.query('INSERT INTO Ratings(UserId, RaterId, Description, Rating) VALUES({0},{1},"{2}",{3});'.format(userId, raterId,description, rating));
      res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end();
  });
});
//Post Bid given auctionId, userId, and price
app.post('/bid', upload.array(), (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
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
      res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
  })
});

app.delete('/bid/:bidId', (req, res, next) =>{
  //delete a bid by bid id route
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject){
    try{
      let bidId = req.params.bidId;
      connection.query('DELETE FROM Bids Where BidId = {0}'.format(bidId));
      res.status(200).end();
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
    return res.end();
  });
});
//return highest bid by actuion
app.get('/bids/:auctionid', (req, res, next) =>{
  res.setHeader('Content-Type', 'application/json');
  var promise = new Promise(function(resolve, reject) {
    var auctionid = req.params.auctionid;
    try{
      console.log('')
      connection.query('SELECT B.UserId, BidId, B.AuctionId, Time, Price, Username FROM Bids B Join Users U ON U.UserId = B.UserId WHERE B.AuctionId = 10 ORDER BY Price DESC;'.format(auctionid), function(err, rows, fields){
        if(rows == null  ||rows.length == 0){
          res.status(400).send('no rows returned');
        }
        res.end(JSON.stringify(rows));
      });
    }
    catch(e){
      throw e;
    }
  });
  promise.catch(function(error){
    res.status(400).send(error);
  })
  });

  app.get('/auctionsSearch/:query', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var promise = new Promise(function(resolve, reject){
      try{
        let query = req.params.query;
        query = query.replace("'", "''");
        connection.query("SELECT CONCAT(make, ' - ', Model, ' , ', Price, ' - Zip Code: ', Zip) as value, AuctionId as data FROM Auctions WHERE Model LIKE '%"+query+"%' OR Make LIKE '%"+query+"%' OR Zip LIKE '%"+query+"%' ORDER BY EndTime DESC LIMIT 5", function(err, rows, fields) {
          if(rows == null || rows.length == 0){
            res.status(400).send('no rows returned');
          }
          else{
            res.end(JSON.stringify(rows));
          }
        });
      }
      catch(e){
        throw e;
      }
    });
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
