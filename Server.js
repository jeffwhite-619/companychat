var main = require('./Main.js');
main.moduleInit();
/*
main.getSocketIo().configure(function (){
    main.getSocketIo().set('authorization', function (handshakeData, callback) {
        // findDatabyip is an async example function
        // replace findDataByIP with some way of getting a safe copy of user instance
        findDatabyIP(handshakeData.address.address, function (err, data) {
            if (err) { return callback(err); }

            if (data.authorized) {
              handshakeData.foo = 'bar';
              for(var prop in data) handshakeData[prop] = data[prop];
              callback(null, true);
            } else {
              callback(null, false);
            }
        }); 

    });
});
*/
main.getSocketIo().sockets.on('connection', function (socket) {
	console.log('new user connected:' + socket.id);
    
	/******************************  MAIN EVENTS  *****************************/
	socket.on('socketinit', function(socketUser) {
		console.log('socket init');
        main.socketInit(socket, socketUser);
	});
	
    // updating activity status
    socket.on('userstatuschange', function (status) {
        console.log('user status change');
        main.statusChange(socket, status);
    });
    
	socket.on('disconnect', function () {
        main.disconnect(socket);
	});
	
	/******************************  STORE EVENTS  ****************************/
    // as of now, none of these are needed
	socket.on('storeadd', function (from, msg) {
		main.getStoresController().onStoreAdd(from, msg);
	});
	
	socket.on('storeupdate', function (from, msg) {
		main.getStoresController().onStoreUpdate(from, msg);
	});
	
	socket.on('storeremove', function (from, msg) {
		main.getStoresController().onStoreRemove(from, msg);
	});
    
    /******************************  CHAT EVENTS  *****************************/
    // user pressed start chat button
    socket.on('chatstart', function() {
        console.log('chat start');
        main.getChatController().start(socket);
	});

    socket.on('chatleaveroom', function (roomData) {
        console.log('client leave room');
        main.getChatController().leaveRoom(socket, roomData);
    });
    
    socket.on('chatsendmessage', function (message) {
        console.log('chat message');
        main.getChatController().sendMessage(socket, message);
    });
    
    socket.on('chatfirstmessage', function (roomId) {
        main.getChatController().joinSupportToRoom(roomId);
    });
});