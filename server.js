var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
io.set('heartbeat timeout', 4000);
io.set('heartbeat interval', 2000);
var path = require('path');

app.get('/', function(req, res) {
	 res.render('index.ejs');
});

app.use(express.static('js'));

app.use(express.static('images'));

app.use('/styles', express.static('styles'));

server.listen(process.env.PORT || 3000);

var passport = require('passport');
var flash = require('connect-flash');

require('./config/passport')(passport);

app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
 extended: true
}));

//app.set('view engine', 'ejs');

app.use(session({
 secret: 'justasecret',
 resave:true,
 saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./app/routes.js')(app, passport);

console.log('Server running');

var users = [];
var connections = [];
// rooms which are currently available in chat
var rooms = [];
var roomCounter = 1;

function setAvatar(gender, age) {
    if (age <= 7 && gender == 1) {
		return 'avatars/7_year_old_solo_boy.png';
    } else if (age <= 13 && gender == 1) {
				return 'avatars/13_year_old_solo_boy.png';
    } else if (gender == 1) {
				return 'avatars/17_year_old_solo_boy.png';
    }

    if (age <= 7 && gender == 0) {
				return 'avatars/7_year_old_solo_girl.png';
    } else if (age <= 13 && gender == 0) {
				return 'avatars/13_year_old_solo_girl.png';
    } else if (gender == 0) {
				return 'avatars/17_year_old_solo_girl.png';
    }
}

function setBackground(gender, age) {
    if (age <= 7 && gender == 1) {
        return 'backgrounds/junglechat.png';
    } else if (age <= 13 && gender == 1) {
        return 'backgrounds/chesschat.png';
    } else if (gender == 1) {
        return 'backgrounds/soccerchat.png';
    }

    if (age <= 7 && gender == 0) {
        return 'backgrounds/beachchat.png';
    } else if (age <= 13 && gender == 0) {
        return 'backgrounds/librarychat.png';
    } else if (gender == 0) {
        return 'backgrounds/carnivalchat.png';
    }
}

io.sockets.on('connection', function (socket) {
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username, gender, age) {
				socket.username = username;
				socket.gender = gender;
				socket.age = age;
				socket.avatar = setAvatar(gender, age);

				var index;
				var numOfClients;

				if (rooms.length == 0) {
						rooms.push(["Room" + roomCounter++, false, false, false,
						 						username, null, null, setAvatar(gender, age), null, null, setBackground(gender, age)]);
						socket.join(rooms[rooms.length - 1][0]);
						index = rooms.length - 1;
						numOfClients = io.sockets.adapter.rooms[rooms[index][0]].length;
						socket.broadcast.emit('updateRoomsForOthers', rooms[index][0], numOfClients);
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
								rooms.push(["Room" + roomCounter++, false, false, false,
												    username, null, null, setAvatar(gender, age), null, null, setBackground(gender, age)]);
								socket.join(rooms[rooms.length - 1][0]);
								index = rooms.length - 1;
								numOfClients = io.sockets.adapter.rooms[rooms[index][0]].length;
								socket.broadcast.emit('updateRoomsForOthers', rooms[index][0], numOfClients);
						} else {
								socket.join(rooms[i][0]);
								index = i;
								var j;
								for (j = 4; j <= 6; j++) {
										if (rooms[i][j] == null) {
												rooms[i][j] = username;
												rooms[i][j + 3] = setAvatar(gender, age);
												break;
										}
								}

								//Updates the canvas of every client except the sender in the room with a new avatar that joined the room
								socket.to(rooms[index][0]).emit('drawAvatar', username, index, rooms[index][1],
												  rooms[index][2], rooms[index][3], setAvatar(gender, age));
						}
				}
				// store the room name in the socket session for this client
				socket.room = rooms[index][0];

				//store the index of the rooms array the client is in
				socket.index = index;

				socket.emit('drawAvatarsAlreadyInRoom', username,
				rooms[index][1], rooms[index][2], rooms[index][3],
				rooms[index][4], rooms[index][5], rooms[index][6],
				rooms[index][7], rooms[index][8], rooms[index][9],
				setAvatar(gender, age), rooms[index][10], index);

				numOfClients = io.sockets.adapter.rooms[rooms[index][0]].length;

				io.in(rooms[index][0]).emit('updaterooms', rooms, rooms[index][0], numOfClients);

				// echo to client they've connected
				socket.emit('updatechat', 'SERVER', 'you have connected to ' + rooms[index][0]);

				// echo to room that a person has connected to their room
				socket.to(rooms[index][0]).emit('updatechat', 'SERVER', username + ' has connected to this room');
	});

	socket.on('spotTakenToTrue', function(roomsIndex, spotTakenIndex, userName, avatarType) {
			rooms[roomsIndex][spotTakenIndex] = true;
			rooms[roomsIndex][spotTakenIndex + 3] = userName;
			rooms[roomsIndex][spotTakenIndex + 6] = avatarType;
			socket.position = spotTakenIndex;
	});

	socket.on('updateCanvas', function(message) {
			io.in(socket.room).emit('drawChatBubble', message, socket.position, rooms[socket.index][10]);
	});

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
			// we tell the client to execute 'updatechat' with 2 parameters
			io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});

	socket.on('switchRoom', function(newroom) {
			var room = io.sockets.adapter.rooms[rooms[getIndexOfRoom(newroom)][0]];

			if (room.length == 3) {
					socket.emit('roomIsFull');
			} else {
				// leave the current room (stored in session)
				socket.leave(socket.room);
				// join new room, received as function parameter
				socket.join(newroom);
				socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
				// sent message to OLD room
				socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room');

				//Erase this client's avatar on everyone elses' canvas
				socket.to(socket.room).emit('eraseAvatar', socket.position, rooms[socket.index][10]);

				//Erases the client's canvas
				socket.emit('clearCanvas');

				rooms[socket.index][socket.position] = false;
				rooms[socket.index][socket.position + 3] = null;

				var roomIndex = getIndexOfRoom(newroom);
				socket.index = roomIndex;

				//Updates the canvas of every client except the sender in the room with a new avatar that joined the room
				socket.to(rooms[roomIndex][0]).emit('drawAvatar', socket.username, roomIndex, rooms[roomIndex][1],
								  rooms[roomIndex][2], rooms[roomIndex][3], socket.avatar);

				socket.emit('drawAvatarsAlreadyInRoom', socket.username,
				rooms[roomIndex][1], rooms[roomIndex][2], rooms[roomIndex][3],
				rooms[roomIndex][4], rooms[roomIndex][5], rooms[roomIndex][6],
				rooms[roomIndex][7], rooms[roomIndex][8], rooms[roomIndex][9],
				socket.avatar, rooms[roomIndex][10], roomIndex);

				// update socket session room title
				socket.room = newroom;
				socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room');
				socket.emit('updaterooms', rooms, newroom);

				if (io.sockets.adapter.rooms[rooms[roomIndex][0]] == undefined) {
					io.sockets.adapter.rooms[rooms[roomIndex][0]] = 1;
				}

				var numOfClients2 = io.sockets.adapter.rooms[rooms[roomIndex][0]].length;
				socket.emit('updaterooms', rooms, rooms[roomIndex][0], numOfClients2);
			}
	});

	socket.on('createRoom', function(roomName, roomType) {
			var background = getRoomType(roomType);
      rooms.push([roomName, false, false, false,
								 socket.username, null, null, socket.avatar, null, null, background]);

			// leave the current room (stored in session)
			socket.leave(socket.room);
			// join new room, received as function parameter
			socket.join(roomName);
			socket.emit('updatechat', 'SERVER', 'you have connected to '+ roomName);
			// sent message to OLD room
			socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room');

			//Erase this client's avatar on everyone elses' canvas
			socket.to(socket.room).emit('eraseAvatar', socket.position, rooms[socket.index][10]);

			//Erases the client's canvas
			socket.emit('clearCanvas');

			rooms[socket.index][socket.position] = false;
			rooms[socket.index][socket.position + 3] = null;

			var roomIndex = getIndexOfRoom(roomName);
			socket.index = roomIndex;

			socket.emit('drawAvatarsAlreadyInRoom', socket.username,
			rooms[roomIndex][1], rooms[roomIndex][2], rooms[roomIndex][3],
			rooms[roomIndex][4], rooms[roomIndex][5], rooms[roomIndex][6],
			rooms[roomIndex][7], rooms[roomIndex][8], rooms[roomIndex][9],
			socket.avatar, rooms[roomIndex][10], roomIndex);

			// update socket session room title
			socket.room = roomName;
			//socket.emit('updaterooms', rooms, roomName);

			//if (io.sockets.adapter.rooms[rooms[roomIndex][0]] == undefined) {
			//		io.sockets.adapter.rooms[rooms[roomIndex][0]] = 1;
			//}

			//var numOfClients2 = io.sockets.adapter.rooms[rooms[roomIndex][0]].length;
			//socket.emit('updaterooms', rooms, rooms[roomIndex][0], numOfClients2);

			//io.emit('updaterooms', rooms, socket.room);
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
			socket.to(socket.room).emit('eraseAvatar', socket.position, rooms[socket.index][10]);

			if (rooms[socket.index][socket.position] == undefined) {
					rooms[socket.index][socket.position] = false;
			}

			rooms[socket.index][socket.position] = false;
			rooms[socket.index][socket.position + 3] = null;

			if (rooms.length == 0) {
				var index1 = rooms.length - 1;
				numOfClients = io.sockets.adapter.rooms[rooms[index1][0]].length;
				io.sockets.emit('updaterooms', rooms, rooms[index1][0], numOfClients);
			} else if (rooms.length == 1) {
				// remove user count in room (Room 1 3/3 -> Room 1 2/3)
				var index = rooms.length - 1;
				// code below crashes node js???
				if (io.sockets.adapter.rooms[rooms[index][0]] == undefined) {
					io.sockets.adapter.rooms[rooms[index][0]] = 1;
				}
				numOfClients = io.sockets.adapter.rooms[rooms[index][0]].length;
				io.sockets.emit('updaterooms', rooms, rooms[index][0], numOfClients);
			}

			if (roomIsEmpty(socket.index)) {
					rooms.splice(socket.index);
			}
	});

	connections.push(socket);
	console.log('Connected: %s sockets connected', connections.length);

	socket.on('new user', function(username) {
			socket.username = username;
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

//Returns filename of background depending on roomType
function getRoomType(roomType) {
		switch (roomType) {
				case "Jungle":
						return 'backgrounds/junglechat.png';
						break;
				case "Beach":
						return 'backgrounds/beachchat.png';
						break;
				case "Chess":
						return 'backgrounds/chesschat.png';
						break;
				case "Library":
						return 'backgrounds/librarychat.png';
						break;
				case "Soccer":
						return 'backgrounds/soccerchat.png';
						break;
				case "Carnival":
						return 'backgrounds/carnivalchat.png';
						break;
				default:
		}
}
