var	net = require("net");
	
var	argv = require('optimist')
		.usage("Usage: $0 --port [port] --username username --password password")
		.demand(['port', 'username', 'password'])
		.argv;

var	state = "username";
var	multiline = false;

socket = net.Socket()
socket.addListener('error', function(data) {
	console.log(data);
});

socket.addListener('data', function(data) {

	console.log("GOT data: '" + data + "'");

	if (multiline && data.slice(data.length-5).toString() === "\r\n.\r\n") {
		multiline = false;
	}

	if (!multiline) {

		if (state === "username") {

			console.log("USER " + argv.username);
			socket.write('USER ' + argv.username + '\r\n');
			state = "password";

		} else if (state === "password") {

			console.log("PASS " + argv.password);
			socket.write('PASS ' + argv.password + '\r\n');
			state = "noop";

		} else if (state === "noop") {

			console.log("NOOP");
			socket.write("NOOP\r\n");
			state = "stat";

		} else if (state === "stat") {

			console.log("STAT");
			socket.write("STAT\r\n");
			state = "list";

		} else if (state === "list") {

			console.log("LIST");
			socket.write("LIST\r\n");
			state="retr";
			multiline = true;

		} else if (state === "retr") {

			console.log("RETR 1");
			socket.write("RETR 1\r\n");
			state = "dele";
			multiline = true;

		} else if (state === "dele") {

			console.log("DELE 1");
			socket.write("DELE 1\r\n");
			state = "quit";

		} else if (state === "quit") {

			console.log("QUIT");
			socket.write("QUIT\r\n");
			socket.destroy();
			return;

		}
	}
});

socket.connect(argv.port);

function send(msg) {
	socket.write(msg);
}
