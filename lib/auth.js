/*

	Node.js POP3 daemon - authentication wrapper
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

var pamauth = require("./pamauth.js");
var anonauth = require("./anonauth.js");

function auth(config, username, password, cb) {

	if (config.type === "pam") pamauth(config, username, password, cb);
	else if (config.type === "anon") anonauth(config, username, password, cb);
	else cb({errno: 7});

}

module.exports = auth;
