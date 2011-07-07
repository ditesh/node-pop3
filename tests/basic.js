var	net = require("net");
	
var	argv = require('optimist')
		.usage("Usage: $0 --port [port] --username username --password password --commands command1 command2")
		.demand(['port', 'username', 'password'])
		.argv;

state = "username";
socket = net.Socket()
socket.addListener('error', function(data) {
	console.log(data);
});

socket.addListener('data', function(data) {

	console.log("GOT data: " + data);

	if (data.substring(data.length-3, 3) === "\n\r\n")
		console.log("wooo");

	if (state === "username") {

		console.log("USER " + argv.username);
		socket.write('USER ' + argv.username + '\r\n');
		state = "password";

	} else if (state === "password") {

		console.log("PASS " + argv.password);
		socket.write('PASS ' + argv.password + '\r\n');
		state = "stat";

	} else if (state === "stat") {

		console.log("STAT");
		socket.write("STAT\r\n");
		state = "list";

	} else if (state === "list") {

		console.log("LIST");
		socket.write("LIST\r\n");
		state = "noop";

	} else if (state === "noop") {

		console.log("NOOP");
		socket.write("NOOP\r\n");
		state = "retr";

	} else if (state === "retr") {

		console.log("RETR 1");
		socket.write("RETR 1\r\n");
		state = "dele";

	}


	console.log(err);

});

socket.connect(argv.port);
