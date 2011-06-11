var	mboxPath = "/home/ditesh/code/pop3",
	activeSessions = [];

var 	fs = require("fs"),
	net = require("net"),
	sys = require("sys"),
	console = require("console"),
	support = require ("./support"),
	mailbox = require ("./mailbox");

var server = net.createServer(function (socket) {

		var mbox;
		var state = 1;
		var username = "";
		var password = "";

		socket.setEncoding("ascii");

		socket.addListener("data", function (data) {

					var command = data.substring(0, 4).toLowerCase();
					var argument = "";

					console.log("Got command: " + command);

					// Invalid commmand
					if (data.length <=7 || data.substring(4, 5) !== " ") {

						support.sorry(socket);
						return;

					}

					// Get the argument to the command, excluding the CRLF
					argument = data.substring(5, data.length-2);
					console.log("Got argument: " + argument);

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

//							activeSessions.push(username);

							try {

								mailbox.authenticate(mboxPath, username, password, function(mailboxObj) {

									if (mailboxObj === false) {

										state = 1;
										username = "";
										password = "";
										support.sorry(socket);

									} else {

										state = 3;
										support.ok(socket);

									}

								});

							} catch (e) {

								if (e === "NOPATH") {

									console.log("Error: mbox path not found (" + mboxPath + ")");

								}

								support.sorry(socket);
								socket.end();

							}
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
					console.log("Closing connection from " + socket.remoteAddress);

				});

		console.log("Got a connection from " + socket.remoteAddress);
		support.ok(socket, "go ahead");

	});

server.listen(1110, "localhost");
console.log("POP3 server listening on port 1110")
