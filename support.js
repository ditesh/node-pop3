this.write = function(socket, msg) {
	socket.write(msg + "\r\n");
};

this.ok= function(socket, msg, cb) {

	if (msg === undefined)
		socket.write("+OK\r\n", cb);

	else
		socket.write("+OK " + msg + "\r\n", cb);

};

this.sorry = function(socket, msg) {

	try {

		if (msg === undefined) {

			socket.write("-ERR\r\n");

		} else {

			socket.write("-ERR " + msg + "\r\n");

		}

	} catch (err) {

		require("util").log(err);

	}
};
