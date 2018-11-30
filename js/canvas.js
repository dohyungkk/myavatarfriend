var socket = io.connect();
//var timeOut;

$('#userForm').submit(function(e) {
    e.preventDefault();
    // on connection to server, ask for user's name with an anonymous callback
    //var sessionID = socket.socket.sessionid;
    socket.emit('adduser', $('#username').val());
    // call the server-side function 'adduser' and send one parameter (value of prompt)
    socket.emit('new user', $('#username').val(), function(data) {
        if (data) {
            $('#userFormArea').hide();
            $('#messageArea').show();
        }
    });
    $('#username').val('');
});

// on load of page
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');
ctx.translate(0.5, 0.5);

var image = new Image();
var person = new Image();

var person_x = 170;
var person_y = 330;

window.onload = function () {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
}

socket.on('drawAvatar', function(userName, roomsIndex, firstSpotTaken, secondSpotTaken, thirdSpotTaken) {
    var x;
    var y;
    var spotTakenIndex;

    if (!firstSpotTaken) {
        x = 170;
        y = 330;
        spotTakenIndex = 1;
    } else if (!secondSpotTaken) {
        x = 420;
        y = 360;
         spotTakenIndex = 2;
    } else {
        x = 640;
        y = 210;
        spotTakenIndex = 3;
    }

    ctx.drawImage(person, x, y, 80, 120);
    drawNameTag(ctx, x, y, userName);

    //socket.emit('spotTakenToTrue', roomsIndex, spotTakenIndex);
});

socket.on('drawAvatarsAlreadyInRoom', function(userName, firstSpotTaken, secondSpotTaken, thirdSpotTaken,
                                               firstSpotUserName, secondSpotUserName, thirdSpotUserName, roomsIndex) {
    var spotTakenIndex;

    var first_x = 170;
    var first_y = 330;

    var second_x = 420;
    var second_y = 360;

    var third_x = 640;
    var third_y = 210;

    var _firstSpotTaken = false;
    var _secondSpotTaken = false;
    var _thirdSpotTaken = false;

    if (firstSpotTaken) {
        ctx.drawImage(person, first_x, first_y, 80, 120);
        drawNameTag(ctx, first_x, first_y, firstSpotUserName);
        _firstSpotTaken = true;
    }

    if (secondSpotTaken) {
        ctx.drawImage(person, second_x, second_y, 80, 120);
        drawNameTag(ctx, second_x, second_y, secondSpotUserName);
        _secondSpotTaken = true;
    }

     if (thirdSpotTaken) {
        ctx.drawImage(person, third_x, third_y, 80, 120);
        drawNameTag(ctx, third_x, third_y, thirdSpotUserName);
        _thirdSpotTaken = true;
     }

    if (!_firstSpotTaken) {
        ctx.drawImage(person, first_x, first_y, 80, 120);
        drawNameTag(ctx, first_x, first_y, userName);
        spotTakenIndex = 1;
        //socket.emit('spotTakenToTrue', roomsIndex, spotTakenIndex);
        //return;
    } else if (!_secondSpotTaken) {
        ctx.drawImage(person, second_x, second_y, 80, 120);
        drawNameTag(ctx, second_x, second_y, userName);
        spotTakenIndex = 2;
        //socket.emit('spotTakenToTrue', roomsIndex, spotTakenIndex);
        //return;
    } else if (!_thirdSpotTaken) {
        ctx.drawImage(person, third_x, third_y, 80, 120);
        drawNameTag(ctx, third_x, third_y, userName);
        spotTakenIndex = 3;
        //socket.emit('spotTakenToTrue', roomsIndex, spotTakenIndex);
    }
    socket.emit('spotTakenToTrue', roomsIndex, spotTakenIndex, userName);
});

function switchRoom(room) {
    socket.emit('switchRoom', room);
}

// listener, whenever the server emits 'updaterooms', this updates the room the client is in
socket.on('updaterooms', function(rooms, current_room, numOfClients) {
    $('#rooms').empty();
    var i;
    for (i = 0; i < rooms.length; i++) {
        if (rooms[i][0] == current_room) {
            $('#rooms').append('<div>' + rooms[i][0] + "\t\t" + numOfClients + "/3" + '</div>');
        } else {
            $('#rooms').append('<div><a href="#" onclick="switchRoom(\''+ rooms[i][0] +'\')">' + rooms[i][0] + "\t\t" + numOfClients + "/3" + '</a></div>');
        }
    }
});

// listener, whenever the server emits 'updaterooms', this updates the room the client is in
socket.on('updateRoomsForOthers', function(current_room, numOfClients) {
    $('#rooms').append('<div><a href="#" onclick="switchRoom(\''+ current_room +'\')">' + current_room + "\t\t" + numOfClients + "/3" + '</a></div>');
});

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data) {
    $('#conversation').append('<div><strong>' + username + '</strong>: ' + data + '</div>');
});

socket.on('drawChatBubble', function(message, userPosition) {
    //clearTimeout(timeOut);

    var x;
    var y;

    if (userPosition == 1) {
        x = 170;
        y = 330;
    } else if (userPosition == 2) {
        x = 420;
        y = 360;
    } else {
        x = 640;
        y = 210;
    }

    ctx.clearRect(x - 147, y - 169, 260, 170);
    ctx.drawImage(image, x - 147, y - 169, 260, 170, x - 147, y - 169, 260, 170);
    draw_bubble(ctx, "#fff", x , y, 10, message);
    clearChatBubble(x, y);
});

function clearChatBubble(x, y) {
    timeOut = setTimeout(function() {
                ctx.clearRect(x - 147, y - 169, 260, 170);
                ctx.drawImage(image, x - 147, y - 169, 260, 170, x - 147, y - 169, 260, 170);
              }, 5000);
}

socket.on('eraseAvatar', function(userPosition) {
    var x;
    var y;

    if (userPosition == 1) {
        x = 170;
        y = 330;
    } else if (userPosition == 2) {
        x = 420;
        y = 360;
    } else {
        x = 640;
        y = 210;
    }

    ctx.clearRect(x - 147, y - 169, 277, 314);
    ctx.drawImage(image, x - 147, y - 169, 277, 314, x - 147, y - 169, 277, 314);
});

socket.on('clearCanvas', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
});

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
   return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
   };
}

canvas.addEventListener('click', function(evt) {
  var mousePos = getMousePos(canvas, evt);
  var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
  console.log(message);
}, false);

socket.on('get users', function(data) {
    var html = '';
    for (i = 0; i < data.length; i++) {
        html += '<li class="list-group-item">' + data[i] + '</li>';
    }
    $('#users').html(html);
});

image.src = 'backgrounds/beachchat.png';
person.src = 'avatars/17_year_old_girl.png';

function draw_bubble(ctx, color, x, y, radius, text) {
    var text_length = text.length;

    var width = 230;
    var height = 50;

    var x = x;
    var y = y;

    x -= 140;

    var text1;
    var text2;
    var text3;
    var text4;
    var text5;

    if (text_length <= 150 && text_length >= 120) {
        text1 = text.substring(0, 29);
        text2 = text.substring(29, 59);
        text3 = text.substring(59, 89);
        text4 = text.substring(89, 119);
        text5 = text.substring(119, text_length);
        height += 80;
        y -= 160;
    } else if (text_length <= 120 && text_length >= 90) {
        text1 = text.substring(0, 29);
        text2 = text.substring(29, 59);
        text3 = text.substring(59, 89);
        text4 = text.substring(89, text_length);
        height += 60;
        y -= 140;
    } else if (text_length <= 90 && text_length >= 60) {
        text1 = text.substring(0, 29);
        text2 = text.substring(29, 59);
        text3 = text.substring(59, text_length);
        height += 40;
        y -= 120;
    } else if (text_length <= 60 && text_length >= 30) {
        text1 = text.substring(0, 29);
        text2 = text.substring(29, text_length);
        height += 20;
        y -= 100;
    } else if (text_length <= 30 && text_length > 0) {
        text1 = text.substring(0, text_length);
        //width = ctx.measureText(text).width + 40;
        //x = person_x - ctx.measureText(text).width + 70;
        y -= 80;
    }

    var radius = Math.min(radius, Math.min(width, height) / 2);
    var color = color;
    var pi2 = Math.PI * 2;
    var r = radius;
    var w = width;
    var h = height;
    var ap = w * 0.2 //arrow position
    var aw = 20 //arrow width
    var ah = 30;  //arrow height

    // Transparent background
    //ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillStyle = color;
    ctx.setTransform(1, 0, 0, 1, x, y);

    // Draw arc
    ctx.beginPath();
    ctx.arc(r  , r  , r, pi2 * 0.5 , pi2 * 0.75);
    ctx.arc(w - r, r, r, pi2 * 0.75, pi2);
    ctx.arc(w - r, h - r, r, 0, pi2 * 0.25);

    ctx.lineTo(w - ap, h); // inserts an arrow (following clock-wise)
    ctx.lineTo(w - ap, h + ah);
    ctx.lineTo(w - ap - aw, h);

    ctx.arc(r  , h - r, r, pi2 * 0.25, pi2 * 0.5);

    ctx.closePath();
    ctx.stroke();

    ctx.fill();

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Text fillstyle
    ctx.fillStyle = "#000";
    ctx.font = "13px Arial";

    if (text_length <= 30) {
        ctx.fillText(text1, x + 20, y + 30);
    } else if (text_length <= 60) {
        ctx.fillText(text1, x + 20, y + 30);
        ctx.fillText(text2, x + 20, y + 50);
    } else if (text_length <= 90) {
        ctx.fillText(text1, x + 20, y + 30);
        ctx.fillText(text2, x + 20, y + 50);
        ctx.fillText(text3, x + 20, y + 70);
    } else if (text_length <= 120) {
        ctx.fillText(text1, x + 20, y + 30);
        ctx.fillText(text2, x + 20, y + 50);
        ctx.fillText(text3, x + 20, y + 70);
        ctx.fillText(text4, x + 20, y + 90);
    } else {
        ctx.fillText(text1, x + 20, y + 30);
        ctx.fillText(text2, x + 20, y + 50);
        ctx.fillText(text3, x + 20, y + 70);
        ctx.fillText(text4, x + 20, y + 90);
        ctx.fillText(text5, x + 20, y + 110);
    }
}

function drawNameTag(ctx, x, y, name) {
    ctx.fillStyle = "#000";
    ctx.font = "bold 20px Arial";
	var width = ctx.measureText(name).width;
	var xWidth = x;
	console.log("name length: " + width);
	if (width < 2)	{
		ctx.fillText(name, xWidth, y + 130);
	} else if (width < 12) {
		ctx.fillText(name, xWidth + 30, y + 130);
	} else if (width < 13) {
		ctx.fillText(name, xWidth + 25, y + 130);
	} else if (width < 8) {
		ctx.fillText(name, xWidth, y + 130);
	} else if (width < 10) {
		ctx.fillText(name, xWidth, y + 130);
	} else if (width < 50) {
		ctx.fillText(name, xWidth + 20, y + 130);
	} else if (width > 50) {
		ctx.fillText(name, xWidth + 2, y + 130);
	} 
	
}

function send_message() {
    var message = document.getElementById('message').value;
    if (message.trim().length > 0) {
        socket.emit('updateCanvas', message);
        socket.emit('sendchat', message);
        $('#message').val('');

    }
}

$('#roombutton').click(function(){
   var name = $('#roomname').val();
   $('#roomname').val('');
   socket.emit('create', name)
});
