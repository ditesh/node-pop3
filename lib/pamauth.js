/*

	Node.js POP3 daemon - PAM auth support
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
// 1: Cannot auth

var 	fs = require("fs"),
	path = require("path"),
	util = require("util"),
	unixlib = require("unixlib"),
	hashlib = require("hashlib");

function auth(config, username, password, cb) {

	unixlib.pamauth(config["pam-service-name"], username, password, function(result) {

		if (result === false) cb({errno: 1});
		else cb(null);

	});
}

module.exports = auth;
