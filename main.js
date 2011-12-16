/*

	Node.js POP3 daemon
	By Ditesh Shashikant Gathani (ditesh@gathani.org) Copyright 2011

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

// Exit values:
// 0: All good
// 1: Unable to bind to port
// 2: Cannot kill process

var 	fs = require("fs"),
	net = require("net"),
	path = require("path"),
	util = require("util"),
	daemon = require("daemon"),
	auth = require("./lib/auth"),
	mailbox = require("./lib/mailbox"),
	support = require("./lib/support"),
	pamauth = require("./lib/pamauth"),
	configure = require("./lib/config"),
	simplelogger = require("simplelogger").simplelogger;

var	spoolPath ="",
	activesessions = {},
	argv = require('optimist')
		.usage("Usage: $0 --config [configfile] --daemonize --kill")
		.demand(['config'])
		.argv;

var debug = false;
var logger = new simplelogger({});

path.exists(argv.config, function(result) {

	if (result === false) {

		console.log("Invalid config file");
		process.exit(1);

	}

	var configopts = configure(argv.config);

	if (configopts.error === true) {

		console.log("Invalid config file");
		process.exit(1);

	}

	// Reload logger with new options
	debug = configopts.debug;
	logger.parseOptions(configopts.logger);

	if (argv.kill === true) {

		daemon.kill(configopts.server.pidpath, function(err) {

			if (err !== undefined) process.exit(2);
			else process.exit();

		});

	}

    if (argv.daemonize !== true) support.printBanner(logger);

	var server = net.createServer(function (socket) {

		// Here is a list of valid states as per RFC 1939:
		// State 1: AUTHORIZATION
		// State 2: TRANSACTION
		// State 3: UPDATE

		var state = 1;
		var mbox = null;
		var username = "";
		var password = "";
		var supporter = new support.support(socket, logger, debug);

		socket.setEncoding("ascii");

		socket.addListener("data", function (data) {

			var datums = data.trim().split(" ");
			var command = datums.shift().trim().toUpperCase();
			logger.debug("Got command: '" + command + "'");

			var argument = datums.join(" ").trim();
			logger.debug("Got argument: '" + argument + "'");

			if (state === 1 && password.length === 0 && command === "USER") {

				logger.debug("Got USER for user " + username);

				username = argument;
				supporter.ok();

			} else if (state === 1 && username.length > 0 && command === "PASS") {

				logger.debug("Got PASS for user " + username);

				password = argument;

				// Session is active
				if (activesessions[username] !== undefined) {

					// Should we close the socket here?
					logger.error("Login rejected as session is still active for user " + username);
					supporter.sorry();

				} else {

					// We store the active session to avoid duplicate attempts at login
					activesessions[username] = new Date().getTime();
					auth(configopts.auth, username, password, function(err) {

						if (err === null) {

							var box = new mailbox(configopts, username);
							box.lock(function (err, obj) {

								mbox = obj;

								// Succeeded
								if (err === null) {

									mbox.init(function(err) {

										if (err === null) {

											state = 2;
											supporter.ok();
											logger.info("Successful authentication for user " + username);
											logger.debug("Entering TRANSACTIONAL state for user " + username);

										} else {

											logger.error("Unable to read mailbox for user " + username);
											logger.debug("Entering AUTHORIZATION state for user " + username);

											// We go back to state 1
											delete activesessions[username];

											state = 1;
											username = "";
											password = "";
											supporter.sorry();

										}
									});

								} else {

									logger.error("Unable to read mailbox for user " + username + util.inspect(err));
									logger.debug("Entering AUTHORIZATION state for user " + username);

									// We go back to state 1
									delete activesessions[username];

									state = 1;
									username = "";
									password = "";
									supporter.sorry();

								}
							});

						} else {

							// We go back to state 1
							delete activesessions[username];

							state = 1;
							username = "";
							password = "";
							supporter.sorry();

							if (err.errno === 1) {

								// Cannot get a lock on mailbox
								logger.error("Authentication failed for user " + username);

							} else if (err.errno === 2) {

								// Cannot open mailbox file
								logger.error("Flock failed, cannot open mailbox file for user " + username);

							} else if (err.errno === 3) {

								// Cannot get a lock on mailbox
								logger.error("Unable to get a lock on mailbox for user " + username);

							}

							logger.debug("Entering AUTHORIZATION state for user " + username);

						}
					});
				}

			} else if (state === 2 && command === "STAT") {

				logger.debug("Got STAT from user " + username);

				mbox.stat(function(count, size) {

					supporter.ok(count + " " + size);

				});

			} else if (state < 3 && command === "CAPA") {

				logger.debug("Got CAPA from user " + username);

				supporter.ok();
				supporter.write("TOP");

				if (state === 1) supporter.write("USER");
				else supporter.write("UIDL");

				supporter.write(".");

			} else if (state === 2 && command === "RETR") {

				logger.debug("Got RETR from user " + username);

				var msgnumber = parseInt(argument, 10);

				if (isNaN(msgnumber) || msgnumber <= 0) {

					logger.error("Invalid message number " + argument + " in RETR for user " + username);
					supporter.sorry();

				} else {

					mbox.retr(msgnumber, function (err, data) {

						if (err) {

							logger.error("Invalid message number " + msgnumber + " in RETR for user " + username);
							supporter.sorry();

						} else {

							logger.info("Successfully retrieved message number " + msgnumber + " for user " + username);
							supporter.ok();
							supporter.write(data + ".");

						}
					});
				}

			} else if (state === 2 && command === "LIST") {

				logger.debug("Got LIST for user " + username);

				if (argument.length > 0) {

					var msgnumber = parseInt(argument, 10);

					if (isNaN(msgnumber) || msgnumber <= 0) supporter.sorry();
					else {

						mbox.list(msgnumber, function(err, size) {

							if (err) {

								supporter.sorry();
								logger.error("Attempted to list invalid message number " + msgnumber + " for user " + username);

							} else supporter.ok(msgnumber + " " + size);

						});
					}

				} else {

					mbox.list(undefined, function(err, msgsizes) {

						supporter.ok();
						var count = 1;

						for (var i in msgsizes) {

							supporter.write(count + " " + msgsizes[i]); 
							count++;

						}

						supporter.write(".");

					});

				}

			} else if (state === 2 && command === "DELE") {

				logger.debug("Got DELE for user " + username);
				var msgnumber = parseInt(argument, 10);

				if (isNaN(msgnumber) || msgnumber <= 0) {

					logger.error("Invalid message number " + argument + " in DELE for user " + username);
					supporter.sorry();

				} else {

					mbox.dele(msgnumber, function(err) {

						if (err) {

							supporter.sorry();
							logger.error("Unable to delete invalid message number " + msgnumber + " for user " + username);

						} else {

							supporter.ok();
							logger.info("Deleted message number " + msgnumber + " for user " + username);

						}
					});

				}

			} else if (state === 2 && command === "NOOP") {

				logger.debug("Got NOOP for user " + username);
				supporter.ok();

			} else if (state === 2 && command === "RSET") {

				logger.debug("Got RSET for user " + username);
				mbox.rset(function() {
					supporter.ok();
				});

			} else if (state === 2 && command === "TOP") {

				logger.debug("Got TOP for user " + username);
				var args = argument.split(" ");

				if (args.length !== 2) {

					logger.error("Invalid arguments " + argument + " in TOP for user " + username);
					supporter.sorry();

				} else {

					var msgnumber = parseInt(args[0], 10);
					var lines = parseInt(args[1], 10);

					if (isNaN(msgnumber) || msgnumber <= 0 || isNaN(lines) || lines <= 0) {

						logger.error("Invalid arguments " + argument + " in TOP for user " + username);
						supporter.sorry();

					} else {

						mbox.top(msgnumber, lines, function(err, msg) {

							if (err) {

								supporter.sorry();
								logger.error("Attempted to TOP invalid message number " + msgnumber + " for user " + username);

							} else {

								supporter.ok();
								supporter.write(msg);
								supporter.write(".");

							}
						});

					}
				}

			} else if (state === 2 && command === "UIDL") {

				var msgnumber = null;

				logger.debug("Got UIDL for user " + username);
				if (argument.length > 0) {

					msgnumber = parseInt(argument, 10);

					if (isNaN(msgnumber) || msgnumber <= 0) {

						logger.error("Invalid message number " + argument + " in UIDL for user " + username);
						supporter.sorry();
						return;

					} 
				}

				mbox.uidl(msgnumber, function(err, uidl) {

					if (err) {

						supporter.sorry();
						logger.error("Unable to get UIDL for invalid message number " + msgnumber + " for user " + username);

					} else if (msgnumber === null) {
						
						supporter.ok();

						// Do we write 
						for (var i=0; i < uidl.length; i++) {

							// To skip over deleted messages
							if (uidl[i] !== undefined)
								supporter.write((i+1) + " " + uidl[i]);

						}

					} else {

						supporter.ok(msgnumber + " " + uidl);

					}
				});

			} else if (command === "QUIT") {

				state = 3;
				supporter.ok(undefined, function() {
					socket.emit("end");
				});

			} else supporter.sorry();
		});

		socket.on("end", function () {

			state = 3;

			logger.debug("Client has closed connection");
			logger.debug("Entering UPDATE state");
			logger.debug("Closing connection from " + (socket.remoteAddress || "<closed connection>"));
			socket.destroy();

			// TODO: undefined needs looking at
			if (mbox !== null && mbox !== undefined) {

				mbox.close(configopts.mailbox["tmppath"], function(err) {

					delete activesessions[username];

					if (err) logger.error("Unable to close file descriptor for user " + username);
					else logger.debug("Closed file descriptor for user " + username);

				});
			}

		});

		socket.on("timeout", function() {

			logger.warn("Remote host " + socket.remoteAddress + " has timed out, ending connection");
			socket.emit("end");

		});

		socket.on("error", function(err) {

			if (err.errno === 32) {

				socket.emit("end");
				logger.warn("Broken pipe, ending connection");

			} else if (err.errno === 104) {

				socket.emit("end");
				logger.warn("Connection reset by peer, ending connection");

			} else logger.error("Some unforeseen error has occured: " +err);

		});

		socket.setTimeout(configopts.server.timeout);

		// We are in AUTHORIZATION state
		logger.debug("Got a connection from " + socket.remoteAddress);
		supporter.ok();
		logger.debug("Entering AUTHORIZATION state");

	});

	logger.log("Starting up");

	server.on("error", function(err) {

		if (err.errno === "EADDRINUSE") logger.error("Unable to bind to port " + configopts.server.port + " on " + configopts.server.hostname + " (permission denied)");
		else logger.error("Something bad happened: " + err);

        process.exit(1);

	});

	server.listen(configopts.server.port, configopts.server.hostname, function() {

		logger.log("Listening on port " + configopts.server.port);

		if (configopts.debug) logger.log("Debugging turned on");

        if (argv.daemonize === true) {

            daemon.start();
            daemon.lock(configopts.server.pidpath);

        }
	});
});

//process.addListener("uncaughtException", function (err) {
//        logger.error("Uncaught exception: " + err);
//});
