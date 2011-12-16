/*

	Node.js POP3 daemon - configuration parser
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

function configure(filename) {

	var debug = false;
	var mailbox = { "path" : "/var/spool/mail/$USER" };
	var server = { "hostname" : "localhost", "port": 110, "timeout": 30000, "pidpath": "/tmp/pop3d.pid" };

	try {
		var config = JSON.parse(fs.readFileSync(filename, "utf8"))
	} catch (e) {
		return {error: true};
	}

	if (config.logging.enable) {

		var enabled = config.logging.enable;
		for (var i in enabled) if (enabled[i] === "debug") debug = true;

	}

	if (config.mailbox !== undefined) {

		if (config.mailbox.type === "mbox") mailbox.type="mbox";
		if (config.mailbox.path !== undefined) mailbox.path = config.mailbox.path;
		if (config.mailbox.tmppath !== undefined) mailbox.tmppath = config.mailbox.tmppath;

	}

	if (config.auth !== undefined) {

		if (config.auth.type !== "pam") config.auth.type = "anonymous";
		if (config.auth.type !== "pam-service-name") config.auth["pam-service-name"] = "system-auth";

	}

	if (config.server !== undefined) {

		if (config.server.hostname !== undefined) server.hostname = config.server.hostname;
		if (config.server.port !== undefined && (parseFloat(config.server.port) == parseInt(config.server.port)) && !isNaN(config.server.port)) server.port = config.server.port;
		if (config.server.timeout !== undefined && (parseFloat(config.server.timeout) == parseInt(config.server.timeout)) && !isNaN(config.server.timeout)) server.timeout = config.server.timeout*1000;
		if (config.server.pidpath !== undefined) server.pidpath = config.server.pidpath;

	}

	return {

		debug: debug,
		auth: config.auth,
		
		mailbox: {

			type: mailbox.type|| "mbox",
			path: mailbox.path || "/var/mail",
			tmppath: mailbox.tmppath || "/tmp"

		},

		server: server,

		logger: {

			enable: config.logging.enable || {},
			autolog: config.logging.autolog || {},
			destinations: {
				default: config.logging.default || undefined,
				debug: config.logging.debug || undefined,
				warn: config.logging.warn || undefined,
				info: config.logging.info || undefined,
				error: config.logging.error || undefined
			},
			syslogopts: config.syslogopts || {}
		}
	}
}

module.exports = configure;
