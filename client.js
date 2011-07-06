var	net = require("net");
	
var	argv = require('optimist')
		.usage("Usage: $0 --port [port] --username username --password password")
		.demand(['port', 'username', 'password'])
		.argv;

state = "username";
socket = net.Socket()
socket.addListener('error', function(data) {
	console.log(data);
});

socket.addListener('data', function(data) {

	console.log("GOT data: " + data);

	try {

		if (state === "username") {

			console.log("USER " + argv.username);
			socket.write('USER ' + argv.username + '\r\n');
			state = "password";

		} else if (state === "password") {

			console.log("PASS " + argv.password);
			socket.write('PASS ' + argv.password + '\r\n');
			state = "";

		}

	} catch(err) {

		console.log(err);

	}

});

socket.connect(argv.port);
