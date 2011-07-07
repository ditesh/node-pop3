var	mboxPath = "/home/ditesh/code/node-pop3",
	activesessions = {};

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

		// Here is a list of valid states as per RFC 1939:
		// State 1: AUTHORIZATION
		// State 2: TRANSACTION
		// State 3: UPDATE

		var mbox;
		var state = 1;
		var username = "";
		var password = "";

		socket.setEncoding("ascii");

		socket.addListener("data", function (data) {

			var argument = "";
			var command = data.substring(0, 4).toLowerCase();

			logger.log("Got command: '" + command + "'");

			if (data.charAt(5) === "\n")
				argument = "";
			else
				argument = data.substring(5, data.length-2); // Get the argument to the command, excluding the CRLF

			logger.log("Got argument: '" + argument + "'");

			if (state === 1 && command === "user") {

				logger.log("Got USER for user " + username);

				state = 2;
				username = argument;
				support.ok(socket);

			} else if (state === 2 && command === "pass") {

				logger.log("Got PASS for user " + username);

				password = argument;

				// Session is active
				if (activesessions[username] !== undefined) {

					// Should we close the socket here?
					logger.error("Login rejected as session still active for user " + username);
					support.sorry(socket);

				} else {

					// We store the active session to avoid duplicate attempts at login
					activesessions[username] = new Date().getTime();

					mailbox.authenticate(mboxPath, username, password, function(err, fd) {

						mbox = new mailbox.mailbox(fd, function(err) {

							// Succeeded
							if (err === null) {

								state = 3;
								support.ok(socket);
								logger.log("Successful authentication for user " + username);
								logger.log("Entering TRANSACTIONAL state for user " + username);

							} else {

								// We go back to state 1
								state = 1;
								username = "";
								password = "";
								support.sorry(socket);
								delete activesessions[username];

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
					});
				}

			} else if (state === 3 && command === "stat") {

				logger.log("Got STAT from user " + username);

				mbox.stat(function(count, size) {

					support.ok(socket, count + " " + size);

				});

			} else if (state === 3 && command === "retr") {

				logger.log("Got RETR from user " + username);

				var msgnumber = parseInt(argument, 10);

				if (msgnumber === NaN) {

					logger.error("Invalid message number " + argument + " in RETR for user " + username);
					support.sorry(socket);

				} else {

					mbox.retr(msgnumber, function (err, data) {

						if (err) {

							logger.error("Invalid message number " + msgnumber + " in RETR for user " + username);
							support.sorry(socket);

						} else {

							support.ok(socket);
							logger.log("Successfully retrieved message number " + msgnumber + " for user " + username);
							support.write(socket, data);
							support.write(socket, ".");

						}
					});
				}

			} else if (state === 3 && command === "list") {

				logger.log("Got LIST for user " + username);

				mbox.list(function(msgsizes) {

					support.ok(socket);
					var count = 1;

					for (var i in msgsizes) {

						support.write(socket, count + " " + msgsizes[i]); 
						count++;

					}

					support.write(socket, ".");

				});

			} else if (state === 3 && command === "dele") {

				var msgnumber = parseInt(argument, 10);

				if (msgnumber === NaN) {

					support.sorry(socket);

				} else {

					mbox.dele(msgnumber, function(err) {

						if (err) {

							support.sorry(socket);
							logger.error("Attempted to delete invalid message number " + msgnumber + " for user " + username);

						} else {

							support.ok(socket);
							logger.log("Deleted message number " + msgnumber + " for user " + username);

						}
					});

				}

			} else if (state === 3 && command === "noop") {

				logger.log("Got NOOP for user " + username);
				support.ok(socket);

			} else if (state === 3 && command === "rset") {

				logger.log("Got RSET for user " + username);
				mbox.rset(function() {
					support.ok(socket);
				});


			} else if (state === 3 && command === "quit") {

				support.ok(socket, undefined, function() {
					socket.emit("end");
				});

			} else {

				support.sorry(socket);

			}

		});

		socket.addListener("end", function () {

			socket.destroy();
			logger.log("Entering UPDATE state");

			if (typeof mbox === "object") {

				mbox.close(function() {

					delete activesessions[username];
					logger.log("Closed file descriptor for user " + username);

				});
			}

			logger.log("Closing connection from " + socket.remoteAddress);

		});

		// We are in AUTHORIZATION state
		logger.log("Got a connection from " + socket.remoteAddress);
		support.ok(socket);
		logger.log("Entering AUTHORIZATION state");

	});

	server.on("error", function(err) {

		if (err.errno === 13) {

			logger.error("Unable to bind to port " + port + " (permission denied)");

		} else {

			logger.error("Some unforeseen error has occured: " +err);

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
