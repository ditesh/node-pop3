/*

	Node.js POP3 daemon - mbox support
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

var fs = require("fs");
var hashlib = require("hashlib");

module.exports = function(fd, filename) {

	// Read/write buffer
	var bufsize = 4096;

	// UIDL cache
	var uidls = null; 

	// This structure is the original data structure
	var omessages = {
		size: 0,
		count: 0,
		sizes: [],
		deleted:  [],
		offsets:  [],
	};

	// This structure can be manipulated (thru message deletion)
	var messages = {
		size: 0,
		count: 0,
		sizes: [],
		deleted: [],
		offsets: [],
	};

	// Public methods follow
	this.init = function(cb) {
		read(-1, new Buffer("\n"), function(err) {
			cb(err);
		});
	}

	this.list = function(msgnumber, cb) {

		if (msgnumber !== undefined) {

			if (msgnumber > omessages.count || messages.deleted[msgnumber] !== undefined) cb({errno: 5});
			else cb(null, messages.sizes[msgnumber-1]);

		} else cb(null, messages.sizes);
	}

	this.top = function(msgnumber, linesreq, cb) {

		if (msgnumber > omessages.count || messages.deleted[msgnumber] !== undefined) cb({errno: 5});
		else {

			getmessage(msgnumber, function(err, message) {

				if (err) cb(err);
				else {

					var i = 0;
					var lines = 0;
					var bodyend = 0;
					var headersearch = true;

					while (i < message.length) {

						if (headersearch === true && message[i] === "\n" && message[i+1] === "\n") {

							bodyend = i;
							headersearch = false;

						} else if (headersearch === false && lines >= linesreq) {

							break;

						} else if (headersearch === false && message[i] === "\n") {

							lines++;

							if (lines >= linesreq) {

								bodyend = i;
								break;

							}
						}

						i += 1;

					}

					cb(null, message.slice(0, bodyend));

				}
			});
		}
	}

	this.uidl = function(msgnumber, cb) {

		var uidlcb = function(err) {

			if (err) cb(err);
			else if (msgnumber === null) cb(null, uidls);
			else if (msgnumber > omessages.count || messages.deleted[msgnumber] !== undefined) cb({errno: 5});
			else cb(null, uidls[msgnumber-1]);

		}

		if (uidls === null) {

			uidls = [];
			generateUIDLs(1, uidlcb);

		} else uidlcb(null);

	}

	this.stat = function(cb) {
		cb(messages.count, messages.size);
	}

	this.dele = function(msgnumber, cb) {

		if (msgnumber > omessages.count || messages.deleted[msgnumber] !== undefined) cb({errno: 5});
		else {

			var messagesize = messages.sizes[msgnumber-1]
			delete messages.offsets[msgnumber-1];
			delete messages.sizes[msgnumber-1];

			messages.count -= 1;
			messages.size -= messagesize;

			// We take advantage of implicity JS hashing to avoid O(n) lookups
			messages.deleted[msgnumber-1] = 1;
			cb(null);

		}
	}

	this.retr = function(msgnumber, cb) {

		if (msgnumber > omessages.count || messages.deleted[msgnumber] !== undefined) cb({errno: 5});

		else getmessage(msgnumber, cb);

	}

	// Revert datastructures to original state
	this.rset = function(cb) {

		uidls = null;
		messages = omessages;
		cb();

	}

	// Update mbox file
	this.close=function(tmpPath, cb) {

		if (messages.deleted.length === 0) {

			fs.close(fd);
			cb();

		} else  {

			// We have to use O(n) auxilliary storage because it feels slightly
			// saner to aim to run out of disk space vs running out of memory
			unixlib.mkstemp(tmpPath + "/mboxXXXXXX", function(err, tmpfd, tmpfilename) {

				if (err) cb({errno :6});
				else {

					syncToTmp(tmpfd, 1, function() {

						// This should automagically release the lock
						fs.close(fd, function() {
							fs.close(tmpfd, function() {
								fs.rename(tmpfilename, filename, function() {
									cb();
								});
							});
						});
					});
				}
			});
		}
	}

	// Private helper methods follow below

	// Write modifications to temp file
	function syncToTmp(tmpfd, msgnumber, cb) {

		// Pass the last msg
		if (msgnumber > messages.offsets.length) cb();

		// Skip deleted messages
		else if (messages.offsets[msgnumber-1] === undefined) syncToTmp(tmpfd, msgnumber + 1, cb);
		else {

			var buffer = new Buffer(omessages.sizes[msgnumber-1]);

			fs.read(fd, buffer, 0, omessages.sizes[msgnumber-1], messages.offsets[msgnumber-1], function(err, bytesRead, buffer) {

				fs.write(tmpfd, buffer, 0, bytesRead, null, function(err, written, buffer) {

					syncToTmp(tmpfd, msgnumber + 1, cb);

				});
			});
		}
	}

	function read(position, previousbuf, cb) {

		var i = 0;
		var minlen = 0;
		var msgsize = 0;
		var buffer = new Buffer(bufsize);

		fs.read(fd, buffer, 0, bufsize, position, function(err, bytesRead, buffer) {

			if (err) cb(err);
			else {

				if (previousbuf !== null) {

					var newbuffer = new Buffer(previousbuf.length + buffer.length)

					// Fast memcpy()'s for the win
					previousbuf.copy(newbuffer);
					buffer.copy(newbuffer, previousbuf.length);
					buffer = newbuffer;
					previousbuf = null;
					delete newbuffer;

				}

				i = 0;
				minlen = (bytesRead === buffer.length) ? buffer.length : bytesRead;
				while (i < minlen) {

					// Match for newline, ASCII code 10
					if (buffer[i] === 10) {

						// \nFrom is split between the buffers
						if (i + 5 > buffer.length-1) {

							previousbuf = new Buffer(buffer.slice(i));
							break;

						// \nFrom is within buffer 
						} else if (buffer.slice(i+1, i+6).toString() === "From ") {

							messages.offsets.push(position + (i+1));

						}
					}

					i++;

				}

				// There is more to read!
				if (bytesRead === bufsize) read(position + bufsize + 1, previousbuf, cb);
				else {

					i = 0;

					while (i < messages.offsets.length - 1) {

						msgsize = messages.offsets[i+1] - messages.offsets[i];
						messages.size += msgsize;
						messages.sizes.push(msgsize);
						i++;

					}

					if (messages.offsets.length > 0) {

						msgsize = position + bytesRead - messages.offsets[i];
						messages.sizes.push(msgsize);
						messages.size += msgsize;
						messages.count = messages.offsets.length;

					}

					// Make a copy
					// JS seriously needs a good, fast and built-in object clone() method
					omessages.size = messages.size;
					omessages.count = messages.count;

					for (var i in messages.sizes)
						omessages.sizes.push(messages.sizes[i]);

					for (var i in messages.offsets)
						omessages.offsets.push(messages.offsets[i]);

					cb(null);

				}
			}
		});
	}


	function getmessage(msgnumber, cb) {

		var buffer = new Buffer(messages.sizes[msgnumber-1]);

		fs.read(fd, buffer, 0, messages.sizes[msgnumber-1], messages.offsets[msgnumber-1], function(err, bytesRead, buffer) {
			cb(err, buffer.toString());
		});

	}

	// We generate UIDL's for all messages (even deleted ones)
	// because RSET may be called /after/ UIDL's have been generated
	function generateUIDLs(msgnumber, cb) {

        var buffer = new Buffer(bufsize);

		// All UIDL's have been generated
		if (msgnumber >= omessages.count) {

			cb(null);
			return;

		}

		// We could use Dovecot's approach and extract Received and Delivered-To
		// but that requires additional conditional loops.
		// Let's just MD5 the headers, which is probably less then 4kb in length
		// Sloppy? Yes. MD5'ing the whole message is safer.
		// RFC 1939 says clients need to figure out what to do with same UIDL's
		// for duplicate copies of messages, so we'll take refuge in that.
		fs.read(fd, buffer, 0, bufsize, omessages.offsets[msgnumber-1], function(err, bytesRead, buffer) {

			if (err) cb(err);
			else {

				uidls.push(hashlib.md5(buffer.toString("ascii")));
				generateUIDLs(msgnumber + 1, cb);

			}
		});
	}

	// new Buffer(\n): a small required hack for our read() implementation
	};
