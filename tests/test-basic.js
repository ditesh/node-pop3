var	net = require("net");
	
var	argv = require('optimist')
		.usage("Usage: $0 --port [port] --username username --password password --list msgnumber")
		.demand(['port', 'username', 'password'])
		.argv;

var	state = "username";
var	multiline = false;

var 	msgnumber = argv.list || 1;

socket = net.Socket()
socket.addListener('error', function(data) {
	console.log(data);
});

socket.addListener('data', function(data) {

	data = data.toString("ascii");
	console.log("received: '" + data + "'");

	if (multiline && data.slice(data.length-5).toString() === "\r\n.\r\n") {
		multiline = false;
	} else if (multiline && data.toString() === "-ERR\r\n") {
		multiline = false;
	}

	if (!multiline) {

		if (state === "username") {

			send('USER ' + argv.username + '\r\n');
			state = "password";

		} else if (state === "password") {

			send('PASS ' + argv.password + '\r\n');
			state = "noop";

		} else if (state === "noop") {

			send("NOOP\r\n");
			state = "stat";

		} else if (state === "stat") {

			send("STAT\r\n");
			state = "list";

		} else if (state === "list") {

			send("LIST\r\n");
			state="listone";
			multiline = true;

		} else if (state === "listone") {

			send("LIST " + msgnumber +"\r\n");
			state="retr";

		} else if (state === "retr") {

			send("RETR " + msgnumber + "\r\n");
			state = "top";
			multiline = true;

		} else if (state === "top") {

			send("TOP " + msgnumber + " 10\r\n");
			state = "dele";
			multiline = true;

		} else if (state === "dele") {

			send("DELE " + msgnumber + " \r\n");
			state = "quit";

		} else if (state === "quit") {

			send("QUIT\r\n");
			socket.destroy();
			return;

		}
	}
});

socket.connect(argv.port);

function send(msg) {
	console.log("send: " + msg);
	socket.write(msg);
}
