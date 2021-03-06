/*

	Node.js POP3 daemon test file

	Copyright (C) 2011 by Ditesh Shashikant Gathani <ditesh@gathani.org>

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

*/

var POP3Client = require("poplib");
var     argv = require('optimist')
                .usage("Usage: $0 --host [host] --port [port] --username [username] --password [password] --debug [on/off] --networkdebug [on/off] --deleinvalid --deletwice")
                .argv;

var host = argv.host || "localhost";
var port = argv.port || 110;
var debug = argv.debug === "on" ? true : false;
var username = argv.username;
var password = argv.password;
var twicetest = argv.deletwice ? true: false;
var invalidtest = argv.deleinvalid ? true: false;

var client = new POP3Client(port, host, { debug: (argv.debug === "on" ? true: false) });

client.on("error", function(err) {
	console.log("Server error occurred, failed, " + err);
});

client.on("connect", function(status, rawdata) {

	if (status) {

		console.log("CONNECT success");

		if (argv.username) client.login(username, password);
		else client.dele(1);

	} else {

		console.log("CONNECT failed because " + rawdata);
		return;

	}
});

client.on("invalid-state", function(cmd) {
	console.log("Invalid state, failed. You tried calling " + cmd);
    client.quit();
});

client.on("locked", function(cmd) {
	console.log("Current command has not finished yet, failed. You tried calling " + cmd);
});

client.on("login", function(status, rawdata) {

	if (status) {

		console.log("LOGIN success");

        if (invalidtest) client.dele(9999999999999999);
        else client.dele(1);

	} else {

		console.log("LOGIN failed because " + rawdata);
		client.quit();

	}
});

client.on("dele", function(status, rawdata) {

	if (status) console.log("DELE success");
	else console.log("DELE failed");

    if (twicetest) {

        twicetest = false;
        client.dele(1);

    }

	client.quit();

});

client.on("quit", function(status, rawdata) {

	if (status === true) console.log("QUIT success");
	else console.log("QUIT failed because " + rawdata);

});
