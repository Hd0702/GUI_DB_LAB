
use db;
Create table Users(
UserId int NOT NULL AUTO_INCREMENT,
FirstName VARCHAR(100),
LastName VARCHAR(100),
Address VARCHAR(300),
Zip int,
Username VARCHAR(100) NOT NULL,
Password VARCHAR(150) NOT NULL,
IsAdmin Bit DEFAULT 0,
DateCreated datetime,
ProfilePicture MEDIUMBLOB,
PRIMARY KEY(UserId));

CREATE Table Auctions(
UserId int NOT NULL,
AuctionId int AUTO_INCREMENT,
StartTime datetime NOT NULL,
EndTime datetime NOT NULL,
Mileage int,
Color VARCHAR(20),
Price int NOT NULL,
Make VARCHAR(100),
Model VARCHAR(100),
Year int,
Zip int,
Description VARCHAR(2000),
CarPicture MEDIUMBLOB,
PRIMARY KEY(AuctionId),
FOREIGN KEY(UserId) references Users(UserId)
);
Create TABLE Bids(
UserId int,
AuctionId int,
BidId int AUTO_INCREMENT,
Time datetime NOT NULL,
Price int,
PRIMARY KEY(BidId),
FOREIGN KEY(UserId) references Users(UserId),
FOREIGN KEY(AuctionId) references Auctions(AuctionId)
);
Create table Ratings(
UserId int NOT NULL,
RaterId int NOT NULL,
RateId int AUTO_INCREMENT,
Description VARCHAR(2000),
Rating int NOT NULL,
PRIMARY KEY(RateId),
FOREIGN KEY(UserId) REFERENCES Users(UserId),
FOREIGN KEY(RaterId) REFERENCES Users(UserId)
);

