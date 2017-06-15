exports.disconnect = function (socketId) {
    var supportDisconnecting = this.isSupportOnline(socketId);
    if (supportDisconnecting) {
        console.log('support disconnect');
        this.removeSupportUser(socketId);
    } else {
        console.log('client disconnect');
        this.removeRoomByClientId(socketId);
        // notify admins that the client has left their room
        this.notifySupportClientLeft(socketId, 'client disconnected'); // do first before removing user
        this.removeClientUser(socketId);
    }
}

exports.joinClientToRoom = function (socket, room) {
    socket.join(room);
    var roomObj = {uniqueId: room, initiated: false};
    chatRooms.push(roomObj); 
    //io.sockets.socket(socket.id).emit('client entered room'); // event in chatclient.js
    io.sockets.connected[socket.id].emit('client entered room'); // event in chatclient.js
}
    
exports.getClientBySocketId = function (socketId) {
    var clientObj = 'error';
    for (var idx in sockUsers) {
        if (socketId == sockUsers[idx].id) {
            clientObj = sockUsers[idx];
        }
    }
    return clientObj;
}
    
exports.getClientByUniqueId = function (uniqueId) {
    var clientObj = 'error';
    for (var idx in sockUsers) {
        if (uniqueId == sockUsers[idx].uniqueId) {
            clientObj = sockUsers[idx];
        }
    }
    return clientObj;
}

exports.removeClientUser = function (socketId) {
    for (var i in sockUsers) {
        if (sockUsers[i].id == socketId) {
            sockUsers.splice(i, 1);
        }
    }
}

exports.joinSupportToAllRooms = function (socket) {
    var doUpdate = false;
    for (var room in chatRooms) {
        // only connect if client has begun chatting
        if (chatRooms[room].initiated) {
            this.doUpdate = true;
            socket.join(chatRooms[room].uniqueId);
        }
    }
    console.log('do update:');
    console.log(this.doUpdate);
    if (this.doUpdate) {
        this.updateSupportRoomList();
    }
}
    
exports.joinSupportToRoom = function (room) {
    for (var i in supportAdmins) {
        //io.sockets.socket(supportAdmins[i].socketId).join(room);
        io.sockets.connected[supportAdmins[i].socketId].join(room);
    }
    this.updateSupportRoomList(room);
}

exports.supportLeaveRoom = function (socket, room) {
    console.log('support leaving room: ' + room);
    //io.sockets.socket(socketId).leave(room);
    socket.leave(room);
    // check if support is connected to any other rooms and if not set status
    //resetSupportStatus(io.sockets.socket(socketId));
    this.resetSupportStatus(socket);
}

// this may not be needed; admins may decide to stay in room after client leaves
exports.supportAllLeaveRoom = function (room) {
    console.log('all support leaving room: ' + room);
    for (var i in supportAdmins) {
        //io.sockets.socket(supportAdmins[i].socketId).leave(room);
        io.sockets.connected[supportAdmins[i].socketId].leave(room);
        //this.resetSupportStatus(io.sockets.socket(supportAdmins[i].socketId));
        this.resetSupportStatus(io.sockets.connected[supportAdmins[i].socketId]);
    }
}

exports.resetSupportStatus = function (socket) {
    //var connectedRooms = io.sockets.manager.roomClients[socket.id];
    var connectedRooms = io.sockets.adapter.rooms[socket.id];
    console.log(connectedRooms);
    if (connectedRooms.length < 2) { // there's a default room called "" that all sockets are joined to
        this.doStatus(socket, 'Online', 'support');
    }
}
    
/*
 * Send list of available rooms to all support admins
 * chatRooms list has corresponding ids from sockUsers list,
 * but we want to send their screen names too
 */
exports.updateSupportRooms = function (room) {
    var rooms = sockUsers;
    var justOne = false;
    if (room) {
        console.log("updating support rooms: " + room);
        rooms = getClientByUniqueId(room);
        justOne = true;
    }
    var data = { rooms: rooms, justOne: justOne };
    this.broadcastToSupport(data, 'rooms connected');
}

exports.broadcastToSupport = function (data, event) {
    console.log("broadcastToSupport: " + event);
    for (var i in supportAdmins) {
        //io.sockets.socket(supportAdmins[i].socketId).emit(event, data);
        io.sockets.connected[supportAdmins[i].socketId].emit(event, data);
    }
}

exports.notifySupportClientLeft = function (socketId, notice) {
    console.log('notifying support client left...');
    var client = this.getClientBySocketId(socketId);
    console.log(client);
    var room = this.getRoomById(client.uniqueId);
    console.log(room);
    if ("error" === room) {
        client.chatting = false;
    } else {
        client.chatting = true;
    }
    this.broadcastToSupport(client, notice);
}

exports.notifyClientSupportConnected = function (support) {
    console.log('notifying clients company connected');
    for (var i in sockUsers) {
        //io.sockets.socket(sockUsers[i].id).emit('company connected', support);
        io.sockets.connected[sockUsers[i].id].emit('company connected', support);
    }
}

exports.sendConnectedAdmins = function (socket) {
    console.log('getting connected admins');
    //io.sockets.socket(socket.id).emit('connected admins', {admins: supportAdmins});
    socket.emit('connected admins', {admins: supportAdmins});
}

exports.sendConnectedClients = function (socket) {
    console.log('getting connected clients:');
    console.log(sockUsers);
    //io.sockets.socket(socket.id).emit('connected clients', {clients: sockUsers});
    socket.emit('connected clients', {clients: sockUsers});
}

exports.isSupportOnline = function (socketId) {
    var isOnline = false;
    for (var i in supportAdmins){
        if (supportAdmins[i].socketId == socketId) {
            isOnline = true;
        }
    }
    return isOnline;
}

exports.removeSupportUser = function (socketId) {       
    for (var i in supportAdmins) {
        if (supportAdmins[i].socketId == socketId) {
            supportAdmins.splice(i, 1);
        }
    }
}

exports.getSupportAdminBySocketId = function (socketId) {
    for (var i in supportAdmins) {
        if (socketId == supportAdmins[i].socketId) {
            return supportAdmins[i];
        }
    }
    return 'error';
}

exports.getRoomById = function (roomId) {
    var room = "error";
    for (var i in chatRooms) {
        if (roomId == chatRooms[i].uniqueId) {
            room = chatRooms[i];
        }
    }
    return room;
}
    
exports.getRoomBySocketId = function (socketId) {
    var room = "error"; // may not be a room for this user
    var roomId;
    for (var i in sockUsers) {
        if (socketId == sockUsers[i].id) {
            roomId = sockUsers[i].uniqueId;
        }
    }
    console.log(roomId);
    return this.getRoomById(roomId); 
}

exports.removeRoomByClientId = function (socketId) {
    var client = this.getClientBySocketId(socketId);
    for (var i in chatRooms) {
        if (chatRooms[i].uniqueId == client.uniqueId) {
            chatRooms.splice(i, 1);
        }
    }
}

exports.doStatus = function (socket, status, userType) {
    console.log('do status: ' + status);
    var thisUser;
    switch (userType) {
        case 'client' :
            // returns 'error' if not found
            thisUser = this.getClientBySocketId(socket.id);
            break;
        case 'support' :
            // returns 'error' if not found
            thisUser = this.getSupportAdminBySocketId(socket.id);
            break;
        default:
            thisUser = 'error';
    }
    if ('error' === thisUser) {
        console.log('Status failed, unable to identify socket user');
        return;
    }        
    var statusObj = {
        chatStatus: status,
        userId: thisUser.uniqueId,
    };
    if (!thisUser.admin) {
        console.log('do status: support');
        // user only needs to tell admins
        this.broadcastToSupport(statusObj, 'update chat status');
    } else {
        // admins tell everyone
        console.log('do status: client');
        socket.broadcast.emit('update chat status', statusObj);
    }
}

exports.updateBackfill = function (chatMsg) {
    console.log("updating backfill: " + chatMsg.chatMessage);
    if (!chatBackfill.hasOwnProperty(chatMsg.room)) {
        console.log("creating backfill room");
        chatBackfill[chatMsg.room] = [];
    }
    chatBackfill[chatMsg.room].push(chatMsg);
    if (chatBackfill[chatMsg.room].length > 20) {
        chatBackfill[chatMsg.room].shift();
    }
    console.log(chatBackfill[chatMsg.room]);
}

// no longer needed, but may be useful to have implementation for storage
exports.cleanupBackfill = function (roomId) {
    delete chatBackfill[roomId];
}

// when an admin connects, get chat history for all connected rooms
exports.getBackfillForAllRooms = function (socketId) {
    console.log(chatBackfill);
    //io.sockets.socket(socketId).emit('chat backfill', { oldChatMsgs: chatBackfill} );
    io.sockets.connected[socketId].emit('chat backfill', { oldChatMsgs: chatBackfill} );
}

// when a client connects, get chat history for client's room
exports.getBackfillForRoom = function (socketId, room) {
    console.log('getting backfill for room: ' + room);
    var backfill = chatBackfill[room];
    console.log(backfill);
    //io.sockets.socket(socketId).emit('room backfill', {room: room, backfill: backfill} );
    io.sockets.connected[socketId].emit('room backfill', {room: room, backfill: backfill} );
}

exports.getSocketInfo = function (socket) {
    console.log('getting socket info...');
    //var socketInfo = io.sockets.socket(socket.id);
    var socketInfo = io.sockets.connected[socket.id];
    console.log(socketInfo);
}
