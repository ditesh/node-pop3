var	mboxPath = "/home/ditesh/code/node-pop3",
	activeSessions = [];

var 	fs = require("fs"),
	net = require("net"),
	sys = require("sys"),
	path = require("path"),
	support = require("./support"),
	mailbox = require("./mailbox"),
	simplelogger = require("simplelogger").simplelogger;

var	argv = require('optimist')
		.usage("Usage: $0 --config [configfile]")
		.demand(['config'])
		.argv;

var logger = new simplelogger({
	autolog: ["stdout"]
});

path.exists(argv.config, function(result) {

	if (result === false) {

		logger.error("Invalid config file");
		return;

	}

	try  {

		var config = JSON.parse(fs.readFileSync(argv.config, "UTF-8"))

	} catch (e) {

		logger.error("A small problem parsing the config file: " + e);
		return;

	}

	var hostname = config.hostname;
	var port = config.port || 110;
	var log = config.log || "/var/log/node-pop3.log";
	var spoolpath = config.spoolpath || "/var/spool/mail";

	var server = net.createServer(function (socket) {

		var mbox;
		var state = 1;
		var username = "";
		var password = "";

		socket.setEncoding("ascii");

		socket.addListener("data", function (data) {

			var command = data.substring(0, 4).toLowerCase();
			var argument = "";

			logger.log("Got command: " + command);

			// Invalid commmand
			if (data.length <=7 || data.substring(4, 5) !== " ") {

				support.sorry(socket);
				return;

			}

			// Get the argument to the command, excluding the CRLF
			argument = data.substring(5, data.length-2);
			logger.log("Got argument: " + argument);

			if (state === 1 && command === "user") {

				state = 2;
				username = argument;
				support.ok(socket);

			} else if (state === 2 && command === "pass") {

				password = argument;

				// Session is active
				if (activeSessions.indexOf(username) > 0) {

					support.sorry(socket);

				} else {

//					activeSessions.push(username);

					mailbox.authenticate(mboxPath, username, password, function(err, obj) {

						// Succeeded
						if (err === null) {

							state = 3;
							mbox = obj;
							support.ok(socket);

						} else {

							// We go back to state 1
							state = 1;
							username = "";
							password = "";
							support.sorry(socket);

							if (err.errno === 1) {

								// Authentication failed
								logger.error("Authentication failed for user " + username);


							} else if (err.errno === 2) {

								// Cannot open mailbox file
								logger.error("Cannot open mailbox file for user " + username);

							} else if (err.errno === 3) {

								// Cannot get a lock on mailbox
								logger.error("Unable to get a lock on mailbox for user " + username);


							}
						}
					});
				}

			} else if (state === 3 && command === "stat") {

				mbox.stat(function(count, size) {

					support.ok(socketcount + " " + size);

				});

			} else if (state === 3 && command === "retr") {

				var msgNumber = parseInt(argument, 10);

				if (msgNumber === NaN) {

					support.sorry(socket);

				} else {

					mbox.retr(msgNumber);

				}

			} else if (state === 3 && command === "list") {

				mbox.list(function(err) {

					support.ok(socket);

					for (var i =0; i < msgList.length; i++) {

						socket.write((i + 1) + " " + msgList[i].size); 

					}

				});

			} else if (state === 3 && command === "dele") {

				var msgNumber = parseInt(argument, 10);

				if (msgNumber === NaN) {

					support.sorry(socket);

				} else {

					mbox.dele(msgNumber);

				}

			} else if (state === 3 && command === "noop") {

				support.ok(socket);

			} else if (state === 3 && command === "quit") {

				mbox.sync(function() {

					support.sorry(socket);
					socket.end();

				}, function() {

					support.ok(socket);
					socket.close();

				});

			} else {

				support.sorry(socket);

			}

		});

		socket.addListener("end", function () {

			if (typeof mbox === "object") {

				unlock();

			}

			socket.end();
			logger.log("Closing connection from " + socket.remoteAddress);

		});

		// We are in AUTHORIZATION state
		logger.log("Got a connection from " + socket.remoteAddress);
		support.ok(socket, "go ahead");

	});

	server.on("error", function(err) {

		if (err.errno === 13) {

			logger.error("Unable to bind to port " + port + " (permission denied)");
			return;

		}
	});

	logger.log("Node.js POP3 server starting up");
	server.listen(port, hostname, function() {
		logger.log("Listening on port " + port);
	});

});

/*
process.addListener("uncaughtException", function (err) {
        logger.stdout("Uncaught exception: " + err);
        console.log(err);
        console.trace();
});
*/
