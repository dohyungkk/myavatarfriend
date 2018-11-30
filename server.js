var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
io.set('heartbeat timeout', 4000);
io.set('heartbeat interval', 2000);
var path = require('path');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.use(express.static('js'));

app.use(express.static('images'));

app.use('/styles', express.static('styles'));

server.listen(process.env.PORT || 3000);

console.log('Server running');

var users = [];
var connections = [];
// rooms which are currently available in chat
var rooms = [];
var roomCounter = 1;
var customRooms = [];

io.sockets.on('connection', function (socket) {
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username) {
				socket.username = username;
				var index;

				if (rooms.length == 0) {
						rooms.push(["Room" + roomCounter++, false, false, false, username, null, null]);
						socket.join(rooms[rooms.length - 1][0]);
						index = rooms.length - 1;
						socket.broadcast.emit('updateRoomsForOthers', rooms[index][0]);
				} else {
						var roomsAllFull = true;
						var i;
						for (i = 0; i < rooms.length; i++) {
								var room = io.sockets.adapter.rooms[rooms[i][0]];
								if (room.length < 3) {
										roomsAllFull = false;
										break;
								}
						}

						if (roomsAllFull) {
								rooms.push(["Room" + roomCounter++, false, false, false, username, null, null]);
								socket.join(rooms[rooms.length - 1][0]);
								index = rooms.length - 1;
								socket.broadcast.emit('updateRoomsForOthers', rooms[index][0]);
						} else {
								socket.join(rooms[i][0]);
								index = i;
								var j;
								for (j = 4; j <= 6; j++) {
										if (rooms[i][j] == null) {
												rooms[i][j] = username;
												break;
										}
								}

								//Updates the canvas of every client except the sender in the room with a new avatar that joined the room
								socket.to(rooms[index][0]).emit('drawAvatar', username, index, rooms[index][1], rooms[index][2], rooms[index][3]);
						}
				}
				// store the room name in the socket session for this client
				socket.room = rooms[index][0];

				//store the index of the rooms array the client is in
				socket.index = index;

				//var numOfClients = io.sockets.adapter.rooms[rooms[index][0]];

				socket.emit('drawAvatarsAlreadyInRoom', username,
				rooms[index][1], rooms[index][2], rooms[index][3],
				rooms[index][4], rooms[index][5], rooms[index][6], index);

				socket.emit('updaterooms', rooms, rooms[index][0]);

				// echo to client they've connected
				socket.emit('updatechat', 'SERVER', 'you have connected to ' + rooms[index][0]);

				// echo to room that a person has connected to their room
				socket.to(rooms[index][0]).emit('updatechat', 'SERVER', username + ' has connected to this room');
	});

	socket.on('spotTakenToTrue', function(roomsIndex, spotTakenIndex, userName) {
			rooms[roomsIndex][spotTakenIndex] = true;
			rooms[roomsIndex][spotTakenIndex + 3] = userName;
			socket.position = spotTakenIndex;
	});

	socket.on('updateCanvas', function(message) {
			io.in(socket.room).emit('drawChatBubble', message, socket.position);
	});

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
			// we tell the client to execute 'updatechat' with 2 parameters
			io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});

	socket.on('switchRoom', function(newroom) {
			// leave the current room (stored in session)
			socket.leave(socket.room);
			// join new room, received as function parameter
			socket.join(newroom);
			socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
			// sent message to OLD room
			socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room');

			//Erase this client's avatar on everyone elses' canvas
			socket.to(socket.room).emit('eraseAvatar', socket.position);

			//Erases the client's canvas and redraws only the background
			socket.emit('clearCanvas');

			rooms[socket.index][socket.position] = false;
			rooms[socket.index][socket.position + 3] = null;

			var roomIndex = getIndexOfRoom(newroom);
			socket.index = roomIndex;

			//Updates the canvas of every client except the sender in the room with a new avatar that joined the room
			socket.to(rooms[roomIndex][0]).emit('drawAvatar', socket.username, roomIndex, rooms[roomIndex][1], rooms[roomIndex][2], rooms[roomIndex][3]);

			socket.emit('drawAvatarsAlreadyInRoom', socket.username,
			rooms[roomIndex][1], rooms[roomIndex][2], rooms[roomIndex][3],
			rooms[roomIndex][4], rooms[roomIndex][5], rooms[roomIndex][6], roomIndex);

			// update socket session room title
			socket.room = newroom;
			socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room');
			socket.emit('updaterooms', rooms, newroom);
	});

	socket.on('create', function(room) {
      rooms.push(room);
      io.emit('updaterooms', rooms, socket.room);
  });

	// when the user disconnects.. perform this
	socket.on('disconnect', function() {
			users.splice(users.indexOf(socket.username), 1);
			updateUsernames();
			connections.splice(connections.indexOf(socket), 1);
			console.log('Disconnected: %s sockets connected', connections.length);

			// echo globally that this client has left
			socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
			//Erase this client's avatar on everyone elses' canvas
			socket.to(socket.room).emit('eraseAvatar', socket.position);

			rooms[socket.index][socket.position] = false;
			rooms[socket.index][socket.position + 3] = null;

			if (roomIsEmpty(socket.index)) {
					rooms.splice(socket.index);
			}
	});

	connections.push(socket);
	console.log('Connected: %s sockets connected', connections.length);

	socket.on('new user', function(data, callback) {
			callback(true);
			socket.username = data;
			users.push(socket.username);
			updateUsernames();
	});

	function updateUsernames(){
			io.sockets.emit('get users', users);
	}
});

//Checks to see if all 3 usernames in the room are null and if they all are it returns true
function roomIsEmpty(i) {
		for (var j = 4; j <= 6; j++) {
				if (rooms[i][j] != null) {
						return false;
				}
		}

		return true;
}

//Returns the index of the room name that matches the one passed in the argument
function getIndexOfRoom(roomName) {
		for (var i = 0; i < rooms.length; i++) {
				if (rooms[i][0] == roomName) {
						return i;
				}
		}
}

//Returns the smallest room number that is not being used for a room
function getVacantRoomNumber() {
		for (var i = 0; i < rooms.length; i++) {
				var num = parseInt(rooms[i][0]);
				if (num != (i + 1)) {
						return (i + 1);
				}
		}
}
