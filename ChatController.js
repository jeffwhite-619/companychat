exports.moduleInit = function() {
    console.log('moduleInit...');
    this.main = module.parent;
    this.io = this.main.exports.getSocketIo();
    this.underscore = this.main.exports.getUnderscore();
    this.CHAT_APPLICATION_TITLE = 'Company Chat';
    this.COMPANY_CHAT_ROOM = 'Acompanyemployees'; // first A, to easily sort this at top
    this.COMPANY_CHAT_ROOM_DISPLAY_NAME = 'Company';
    this.CLIENT_ROOM_PREFIX = 'client-to-support-';
    this.roomMetaData = {};
};

exports.initRoom = function(socket, userData) {
    console.log('initRoom');
    var room = {
        roomStatus: '',
        roomStatusDisplay: '',
        roomCreated: this.main.exports.getFormattedTimestamp() 
    };
    console.log('user role: ' + userData.userRole);
    switch (userData.userRole) {
        case 'admin' :
        case 'support' :
            room.id = this.COMPANY_CHAT_ROOM;
            room.roomName = this.COMPANY_CHAT_ROOM_DISPLAY_NAME;
            break;
        case 'client':
            room.id = this.CLIENT_ROOM_PREFIX + userData.id;
            room.roomName = userData.userDisplayName; // in future, this may be Client name
            break;
        default:
            room.id = '';
            room.roomName = null;
    }
    console.log('initRoom has room id: ' + room.id);
    socket.join(room.id);
    this.roomMetaData[room.id] = room;
    this.main.exports.doStatus(socket, 'Chatting');
    return room;
};

// user left the room, still connected to socket
exports.leaveRoom = function(socket, roomData) {
    console.log('leaving room...');
    socket.leave(roomData.roomId);
    switch (socket.user.userRole) {
        case 'admin':
        case 'support':
            console.log('support user leaving room');
            break;
        case 'client':
            console.log('all support leaving client room: ' + roomData.roomId);
            var supportAdmins = this.main.exports.getSupportAdmins();
            for (var i in supportAdmins) {
                //this.io.sockets.socket(supportAdmins[i].socketId).leave(roomData.roomId);
                this.io.sockets.connected[supportAdmins[i].socketId].leave(roomData.roomId);
            }
            break;
        default:
    }
    // if the last person in the room is leaving, remove room from roomMetaData
    if (this.getAllUsersInRoom(roomData.roomId).length < 2) {
        delete this.roomMetaData[roomData.roomId];
    }
    socket.user.rooms = {};
    socket.user.rooms[roomData.roomId] = roomData.roomId;
    console.log('notifying support client left...');
    this.main.exports.broadcastToSupport(socket.user, 'chatleftroom');
    this.main.exports.resetUserStatus(socket);
};

// user pressed start chat button
exports.start = function(socket) {
    switch (socket.user.userRole) {
        case 'admin':
        case 'support':
            this.updateSupportRoomList();
            break;
        case 'client':
            socket.user.room = this.initRoom(socket, socket.user);
            this.main.exports.broadcastToSupport(socket.user, 'chatenteredroom');
            break;
        default:
    }
    socket.emit('chatinit');
};

// user sending a chat message
exports.sendMessage = function(socket, message) {
    console.log('chat sendMessage');
    if (message.roomId !== this.COMPANY_CHAT_ROOM) {
        if (this.getAllUsersInRoom(message.roomId).length < 2) {
            console.log('no users, so rejoin support to the room');
            this.joinSupportToRoom(message.roomId);
        }
    }
    socket.broadcast.to(message.roomId).emit('chatupdate', message);
};

// support user is connecting...
exports.joinSupportToAllRooms = function(socket) {
    console.log('joining support to all rooms');
    // a little security check
    if ('admin' === socket.user.userRole) {
        for (var room in this.getAllChatRooms()) {
            if (this.COMPANY_CHAT_ROOM !== room && '' != room) {
                console.log('joining room: ' + room);
                socket.join(room);
            }
        }
    } else {
        console.log('non admin trying to join themselves to all rooms');
    }
};

// auto join all admin users to a room
exports.joinSupportToRoom = function(roomId) {
    var supportAdmins = this.main.exports.getSupportAdmins();
    for (var i in supportAdmins) {
        //this.io.sockets.socket(supportAdmins[i].socketId).join(roomId);
        this.io.sockets.connected[supportAdmins[i].socketId].join(roomId);
    }
    this.updateSupportRoomList(this.getRoomById(roomId));
};

exports.updateSupportRoomList = function(room) {
    console.log('exports: updateSupportRoomList');
    var rooms = {};
    if (!room) {
        rooms = this.getAllChatRooms();
    } else {
        rooms[room.id] = room;
    }
    this.main.exports.broadcastToSupport({rooms: rooms}, 'chatupdateroomlist');
};

exports.getRoomById = function(roomId) {
    return this.roomMetaData[roomId] || false;
};

exports.getRoomsOccupiedByClient = function(socketId) {
    console.log('getting rooms occupied by client ' + socketId);
    var occupiedRooms = {};
    console.log(this.io.sockets.adapter.rooms);
    //for (var room in this.io.sockets.manager.roomClients[socketId]) {
    //// need to match socketId???
    for (var room in this.io.sockets.adapter.rooms[socketId]) {
        console.log('room: ' + room);
        //var roomId = room.substr(1); // remove leading slash
        //console.log('room after: ' + roomId);
        //if (this.roomMetaData[roomId]) {
        if (this.roomMetaData[room]) {
            //occupiedRooms[roomId] = this.roomMetaData[roomId];
            occupiedRooms[room] = this.roomMetaData[room];
        }
    }
    return occupiedRooms;
};

exports.getAllChatRooms = function(raw) {
    if (raw) {
        return this.io.sockets.manager.rooms;
    }
    return this.roomMetaData;
};

exports.getAllUsersInRoom = function(roomId) {
    console.log('getting all users in room: ' + roomId);
    //var allSockets = this.io.sockets.clients(roomId);
    var allSockets = this.io.sockets.adapter.rooms[roomId];
    
    var allRoomUsers = [];
    for (var client in allSockets) {
        allRoomUsers.push(allSockets[client].user);
    }
    return allRoomUsers;
};