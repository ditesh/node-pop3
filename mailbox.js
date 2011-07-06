var 	fs = require("fs"),
	path = require("path"),
	unixlib = require("unixlib");

this.authenticate = function(mboxPath, username, password, cb) {

	var self = this;

	unixlib.pamauth("system-auth", username, password, function(result) {

		if (result === false) {

			cb({
				errno: 1
			}, null);

		} else {

			var mboxfile = path.join(mboxPath, username);

			path.exists(mboxfile, function(exists) {

				if (exists === true) {

					fs.open(mboxfile, "w+", function(err, fd) {

						unixlib.flock(fd, function(result) {

							if (result === true) {

								cb(null, new self.mailbox(fd, username));

							} else {

								cb({
									errno: 2
								});
							}

						});
					});

				} else {

					cb({
						errno: 3
					});

				}
			});
		}
	});

}

this.unlock= function(cb) {

	unixlib.deflock(fd, function(result) {

		if (result === true) 
			cb();

		else
			cb({
				errno: 4
			});
	});

}

this.mailbox = function(fd, username) {

	var msglist;
	var username = username;

	// A work in progress
	function readmbox(position) {

		var buffer = new Buffer();
		fs.read(fd, buffer, 0, position, function(err, data) {

			if (err === null) {

				readmbox();

			}

		});
	}

	this.list = function(cb) {

		if (msglist === undefined) {

			fs.readFile(fd, "ascii", function(err, data) {

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

		cb(null, msglist);

	}

	function stat(cb) {
		cb(msgList.length, mailboxSize);
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
