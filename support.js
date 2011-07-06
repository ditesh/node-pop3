this.ok= function(socket, msg) {

	if (msg === undefined) {

		socket.write("+OK\r\n");

	} else {

		socket.write("+OK " + msg + "\r\n");

	}

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
