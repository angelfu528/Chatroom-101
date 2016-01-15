// Set up the server 
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Set up the database 
var sqlite3 = require('sqlite3').verbose();
var fs = require ('fs');
var exists = fs.existsSync(dbFilename);
var dbFilename = "hello.db";
var db = new sqlite3.Database(dbFilename);

app.use(express.static('style'));


app.get('/', function (req, res){
  res.sendFile(__dirname + '/index.html');
});

if(!exists) {
	fs.openSync(dbFilename,"w");
}

db.serialize(function(){
	if(!exists) {
		db.run("CREATE TABLE Messages(username TEXT, message TEXT, timestamp INT)");
	}
});

var usernames = {};

io.sockets.on('connection', function (socket) {

    db.each("SELECT username, message, timestamp FROM Messages", function(err, row) {
    	socket.emit('chat message', row.username, row.message, row.timestamp);
    });
    
    // When a user sends a message 
	socket.on('chat message', function (msg) {
		io.emit('chat message', socket.username, msg, new Date().getTime());
		db.run("INSERT INTO Messages VALUES(?, ?, ?)", socket.username, msg, new Date().getTime());
	});

	socket.on('private message', function (from, msg) {
        console.log('I received a private message by ', from, ' saying ', msg);
     });

    
    // When a user enters the room 
	socket.on('adduser', function(username){
		socket.username = username;
		usernames[username] = username;
		var msg = ' has entered the chatroom';
		io.emit('chat message', socket.username, msg, new Date().getTime());
		db.run("INSERT INTO Messages VALUES(?, ?, ?)", socket.username, msg, new Date().getTime());
	});
    
    // When a user disconnects 
    socket.on('disconnect', function(){
    	var msg = ' has left the chatroom';
		io.emit('chat message', socket.username, msg, new Date().getTime());
		db.run("INSERT INTO Messages VALUES(?, ?, ?)", socket.username, msg, new Date().getTime());
	});

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

