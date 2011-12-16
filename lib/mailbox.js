/*

	Node.js POP3 daemon - mailbox support functionality
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

// List of errno's:
// 1: PAM authentication failed
// 2: Flock failed
// 3: mboxfile doesn't exist
// 4: Cannot deflock
// 5: Unknown message number
// 6: Cannot open Unknown message number

var 	fs = require("fs"),
	path = require("path"),
	util = require("util"),
	mbox = require("./mbox"),
	unixlib = require("unixlib");

function mailbox(config, username) {

	this.username = username;
	this.type = config.mailbox.type;
	if (config.mailbox.type === "mbox") this.path = config.mailbox.path;

	this.lock = function(cb) {

		var self = this;

		if (self.type === "mbox") {

			var filename = self.path.replace("$USER", self.username);

			fs.open(filename, "a+", function(err, fd) {

				if (err) cb({errno: 3, filename: filename});
				else {

					unixlib.flock(fd, function(result) {

						if (result === true) cb(null, new mbox(fd, filename));
						else cb({errno: 2}, null);

					});
				}
			});

		} else {

			// TODO

		}
	};

	this.unlock= function(cb) {

		unixlib.deflock(fd, function(result) {

			if (result === true) cb();
			else cb({errno: 4});

		});
	};
}

module.exports = mailbox;
