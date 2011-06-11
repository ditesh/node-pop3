var	net = require("net"),
	console = require("console");

state = "username";
socket = net.Socket()
socket.addListener('error', function(data) {
	console.log(data);
});

socket.addListener('data', function(data) {

	console.log("GOT data: " + data);

	try {

		if (state === "username") {

			console.log("USER ditesh");
			socket.write('USER ditesh\r\n');
			state = "password";

		} else if (state === "password") {

			console.log("PASS ditesh");
			socket.write('PASS ditesh\r\n');
			state = "";

		}

	} catch(err) {

		console.log(err);

	}

});

socket.connect(1110);
