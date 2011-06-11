var 	fs = require("fs"),
	sys = require("sys"),
	path = require("path");

this.authenticate = function(mboxPath, username, password, fn) {

	// Real auth has to go in here
	// Locking then follows

	path.exists(mboxPath, function(exists) {

		if (exists === true) {

			var mboxPath = path.join(mboxPath, username);

			path.exists(mboxPath, function(exists) {

				sys.log("flocking child process");
				var ls = process.createChildProcess("ls");
				ls.addListener("exit", function(code) {

					if (code === 1) {

						fn(mailbox(null));

					} else {

						fn(mailbox(mboxPath, username));

					}

				});
			});


		} else {

			throw "NOPATH";

		}

	});

}

this.unlock= function(fn) {

	process.ChildProcess("flock", ["-u", "-nb", mboxPath + "/" + username]);

}

this.mailbox = function(path, username) {

	var mbox;
	var msgList;
	var mailboxSize;
	var locked = false;
	var mboxPath = path;
	var username = username;
	var password = password;

	// Determine msglist
	function list(fn) {

		if (locked === true) {

			return false;

		}

		locked = true;

		// Mailbox does not exist, thus no messages are available
		if (mboxPath === null) {

			mbox = "";
			mailboxSize = 0;
			msgList = [];

		} else if (msgList === undefined) {

			fs.readFile(mboxPath + "/" + username, "ascii", function(err, data) {

				if (err) {

					locked = false;
					throw err;

				} else {

					mbox = data;
					mailboxSize = data.length;

					if (mailboxSize <= 6) {

						msgList = [];
						return;

					}

					var i = 0;
					var mboxOffset = 0;
					var parsedLength = 0;

					if (data.substring(0, 4) === "From") {

						msgList.push({ offset: 0, deleted: false });
						parsedLength = 7;

					}

					while (parsedLength < mailboxSize) {

						i++;
						mboxOffset = data.indexOf("\r\nFrom", parsedLength);

						if (offset > 0) {

							msgList[i-1].size = (mboxOffset + 2) - msgList[i-1].offset;
							msgList.push({ offset: mboxOffset + 2, deleted: false});
							parsedLength += 6;

						} else {

							msgList[i-1].size = mailboxSize;
							break;

						}
					}

				}
			});
		}

		if (typeof fn === "function") {

			fn();

		}

		locked = false;

	}

	function stat(fn) {

		locked = true;
		fn(msgList.length, mailboxSize);
		locked = false;

	}

	function dele(msgNumber) {

		if (msgNumber > (msgList.length + 1)) {

			sorry(socket);

		} else {

			msgList[msgNumber].deleted = true;
			ok();

		}
	}

	function retr() {

		if (msgNumber > (msgList.length + 1)) {

			sorry(socket);

		} else {

			var startOffset = msgList[msgNumber].offset;

			if ((msgNumber + 1) > (msgList.length + 1)) {

				var endOffset = mbox.length;

			} else {

				var endOffset = msgList[msgNumber+1] - 2;

			}

			var msg = mbox.substring(msgList[msgNumber].offset, msgList[msgNumber].size);
			ok(socket);
			socket.write(msg);

		}
	}

	function sync(errfn, okfn) {

		var newMbox = mbox;

		for (var i = 0; i < msgList.length; i++) {

			if (msgLisg.hasOwnProperty(i)) {

				if (msgList[i] !== undefined) {

					newMbox = mbox.substring(msgList[i].offset, msgList[i].size);

				}
			}
		}

		fs.writeFile(mboxPath + "/" + username, newMbox, function(err) {

			if (err) {

				errfn();
				throw err;

			} else {

				okfn();

			}
		});

	}

	function close() {

		fs.close(fd);

	}

	list();

}
