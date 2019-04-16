
use db;
Create table Users(
UserId VARCHAR(150) NOT NULL,
DisplayName VARCHAR(100) NOT NULL,
Password VARCHAR(150) NOT NULL,
DateCreated datetime,
ProfilePicture Blob,
PRIMARY KEY(UserId));
CREATE table Cars(
UserId VARCHAR(150) NOT NULL,
CarId int,
CarModel VARCHAR(200) NOT NULL,
CarColor Varchar(200) NOT NULL,
Description VARCHAR(1000),
CarPhoto Blob,
PRIMARY KEY(CarId),
FOREIGN KEY(UserId) REFERENCES Users(UserId)
);
CREATE TABLE Parts(
UserId VARCHAR(150) NOT NULL,
PartId int,
PartModel VARCHAR(200) NOT NULL,
CarModel VARCHAR(200) NOT NULL,
CarType VARCHAR(200),
Description Varchar(1000),
PartPhoto Blob,
PRIMARY KEY(PartId),
FOREIGN KEY(UserId) references Users(UserId)
);
CREATE Table Auctions(
UserId VARCHAR(150) NOT NULL,
AuctionId int,
CarId int,
PartId int,
StartTime datetime NOT NULL,
EndTime datetime NOT NULL,
finalBid int,
PRIMARY KEY(AuctionId),
FOREIGN KEY(CarId) references Cars(CarId),
 FOREIGN KEY(PartId) references Parts(PartId),
 FOREIGN KEY(UserId) references Users(UserId)
);
Create TABLE AuctionAudits(
UserId VARCHAR(150),
AuctionId int,
BidId int,
TimeBid datetime NOT NULL,
BidPrice int,
FOREIGN KEY(UserId) references Users(UserId),
FOREIGN KEY(AuctionId) references Auctions(AuctionId)
);
Create table Carts(
UserId VARCHAR(150),
CartId int,
CarId int,
PartId int,
PRIMARY KEY(CartId),
FOREIGN KEY(UserId) references Users(UserId),
FOREIGN KEY(CarId) references Cars(CarId),
FOREIGN KEY(PartId) references Parts(PartId)
);