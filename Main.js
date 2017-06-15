var io = require('socket.io').listen(3000),
	underscore = require('./Underscore.js'),
	storesController = require('./StoresController.js'),
	chatController = require('./ChatController.js');

exports.moduleInit = function() {
	this.getStoresController().moduleInit();
	this.getChatController().moduleInit();
};

exports.socketInit = function(socket, user) {
    socket.emit('appinit', {
        // Other properties the client needs...
            // ...
        // Chat properties the client Chat controller needs
        CHAT_TITLE: this.getChatController().CHAT_APPLICATION_TITLE,
        COMPANY_CHAT_ROOM: this.getChatController().COMPANY_CHAT_ROOM,
        COMPANY_CHAT_ROOM_DISPLAY_NAME: this.getChatController().COMPANY_CHAT_ROOM_DISPLAY_NAME,
        CLIENT_ROOM_PREFIX: this.getChatController().CLIENT_ROOM_PREFIX
    });
    socket.user = user;
    user.socketId = socket.id;
    switch (user.userRole) {
        case 'admin':
        case 'support':
            this.getChatController().initRoom(socket, user);
            this.getChatController().joinSupportToAllRooms(socket);
            socket.broadcast.emit('chatuserconnected', user);
            this.getChatController().updateSupportRoomList();
            break;
        case 'client':
            this.broadcastToSupport(user, 'chatuserconnected');
            break;
        default:
    }
    this.sendConnectedUsers(socket);
};

exports.sendConnectedUsers = function(socket) {
    console.log('getting connected users');
    var allUsers;
    switch (socket.user.userRole) {
        case "admin":
        case "support":
            allUsers = this.getAllUsers();
            break;
        case "client":
            allUsers = this.getSupportAdmins();
            break;
        default:
    }
    socket.emit('chatsendconnectedusers', {users: allUsers});
};

// user was disconnected from socket, clean up the mess
exports.disconnect = function (socket) {
    console.log('user disconnected: ' + socket.id);
    switch (socket.user.userRole) {
        case 'admin':
        case 'support':
            // admins need to announce their disconnect per room they're connected to
            var occupiedRooms = this.getChatController().getRoomsOccupiedByClient(socket.id);
            socket.user.rooms = occupiedRooms;
            socket.broadcast.emit('socketuserdisconnected', {user: socket.user});
            break;
        case 'client':
            // for now we can assume client users have only one room connected
            var roomId = this.getChatController().CLIENT_ROOM_PREFIX + socket.user.id;
            console.log('client is leaving, deleting room: ' + roomId);
            delete this.getChatController().roomMetaData[roomId];
            socket.user.rooms = {};
            socket.user.rooms[roomId] = roomId;
            this.broadcastToSupport({user: socket.user}, 'socketuserdisconnected');
            break;
        default:
            socket.broadcast.emit('socketuserdisconnected', {user: socket.user});
    }
};

exports.statusChange = function(socket, status) {
    console.log(status);
    if (undefined === status.status) {
        console.log('status change - no status - setting to Online');
        status.status = 'Online';
    }
    if (status.roomId instanceof Array) {
        for (var room in status.roomId) {
            socket.broadcast.in(status.roomId[room]).emit('userupdatestatus', status);
        }
    } else {
        socket.broadcast.in(status.roomId).emit('userupdatestatus', status);
    }
};

exports.resetUserStatus = function(socket) {
    var reset = true;
    switch (socket.user.userRole) {
        case 'admin':
        case 'support':
            //if (this.io.sockets.manager.roomClients[socket.id].length < 2) { // there's a default room called "" that all sockets are joined to
            if (this.io.sockets.adapter.rooms[socket.id].length < 2) { 
                reset = false;
            }
            break;
        case 'client':
        default:
    }
    if (reset) {
        console.log('reset user status');
        this.doStatus(socket, 'Online');
    }
    return reset;
};

exports.doStatus = function (socket, status) {
    console.log('do ' + socket.user.userRole + ' status: ' + status);     
    var statusObj = {
        status: status,
        userId: socket.user.id
    };
    switch (socket.user.userRole) {
        case 'admin':
        case 'support':
            socket.broadcast.emit('userupdatestatus', statusObj);
            break;
        case 'client':
            this.broadcastToSupport(statusObj, 'userupdatestatus');
            break;
        default:
    }
};

exports.broadcastToSupport = function (data, event) {
    console.log("broadcastToSupport: " + event);
    var supportAdmins = this.getSupportAdmins();
    var i;
    for (i in supportAdmins) {
        //this.getSocketIo().sockets.socket(supportAdmins[i].socketId).emit(event, data);
        this.getSocketIo().sockets.connected[supportAdmins[i].socketId].emit(event, data);
    }
};

exports.getSocketIo = function() {
	return io;
};

exports.getUnderscore = function() {
	return underscore;
};

exports.getStoresController = function() {
	return storesController;
};

exports.getChatController = function() {
	return chatController;
};

exports.getSupportAdmins = function () {
    console.log('getting support admin users');
    var allUsers = [];
    //var allSockets = this.getSocketIo().sockets.clients(); // socket.io v0.6
    var allSockets = this.getSocketIo().sockets.adapter.rooms[this.getChatController().COMPANY_CHAT_ROOM];
    var u;
    for (u in allSockets) {
        //user = io.sockets.connected[u].user;
        //console.log(findingUser.user);
        //if ('admin' === allSockets[u].user.userRole) {
        if ('admin' === this.getSocketIo().sockets.connected[u].user.userRole) {
            allUsers.push(this.getSocketIo().sockets.connected[u].user);
        }
    }
    return allUsers;
};

exports.getAllUsers = function () {
    console.log('getting all users');
    var allUsers = [];
    //var allSockets = this.getSocketIo().sockets.clients();
    var allSockets = this.getSocketIo().sockets.adapter.rooms[this.getChatController().COMPANY_CHAT_ROOM];
    var u;
    for (u in allSockets) {
        //allUsers.push(allSockets[u].user);
        allUsers.push(this.getSocketIo().sockets.connected[u].user);
    }
    return allUsers;
};

exports.getFormattedTimestamp = function () {
    var timeStamp = new Date().toTimeString();
    var nowtime = timeStamp.substring(0, timeStamp.indexOf(' '));
    var nowhour = nowtime.substring(0, nowtime.indexOf(':'));
    var rTime = nowtime.substring(nowtime.indexOf(':'), nowtime.length);
    var meridian = 'AM';
    if (nowhour >= 12) {
        nowhour = Math.abs(nowhour - 12);
        meridian = 'PM';
    }
    nowhour = (nowhour == '00' || nowhour == 0) ? 12 : nowhour;
    return nowhour + rTime + ' ' + meridian;
};