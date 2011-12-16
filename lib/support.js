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

this.printBanner = function(logger) {

	logger
	.disableDate()
	.stdout("Node.js POP3 server v0.1.0".bold)
	.stdout("By Ditesh Shashikant Gathani Copyright 2011")
	.stdout("This is free software with ABSOLUTELY NO WARRANTY.")
	.stdout("See LICENSE for copyright license.")
	.stdout()
	.enableDate();

}

this.support = function(socket, logger, debug) {

	this.write = function(msg) {

		logger.debug("sent: '" + msg + "‖'");
		socket.write(msg + "\r\n");

	};

	this.ok= function(msg, cb) {

		if (msg === undefined) {

			logger.debug("sent: '+OK‖'");
			socket.write("+OK\r\n", cb);

		} else {

			logger.debug("sent: '+OK " + msg + "‖'");
			socket.write("+OK " + msg + "\r\n", cb);

		}
	};

	this.sorry = function(msg) {

		if (msg === undefined) {

			logger.debug("sent: '-ERR‖'");
			socket.write("-ERR\r\n");

		} else {

			logger.debug("sent: '-ERR " + msg + "‖'");
			socket.write("-ERR " + msg + "\r\n");

		}
	};

	// We do a conditional include to avoid unnecessary toString() conversions
	// ‖ is a indicator for \r\n
	if (debug === true) {

		socket.on("data", function(data) {
			logger.debug("recv: '" + data.toString().replace("\r\n", "‖") + "'");
		});
	}
}
