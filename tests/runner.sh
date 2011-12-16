#!/bin/sh
#	Test runner
#
#	Copyright (C) 2011 by Ditesh Shashikant Gathani <ditesh@gathani.org>
#
#	Permission is hereby granted, free of charge, to any person obtaining a copy
#	of this software and associated documentation files (the "Software"), to deal
#	in the Software without restriction, including without limitation the rights
#	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
#	copies of the Software, and to permit persons to whom the Software is
#	furnished to do so, subject to the following conditions:
#
#	The above copyright notice and this permission notice shall be included in
#	all copies or substantial portions of the Software.
#
#	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
#	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
#	THE SOFTWARE.

kill_node() {

	OUTPUT=`killall node 2>&1`
	return $?

}

start_pop3d() {

	OUTPUT=`node ../main.js --config $1 --daemonize`
}

print_title() {
	echo -e "\033[1;30m${1}\033[0;30m";
}

print_test_title() {
	print_title "Testing $1"
}

print_test() {
	printf "%-60s" "$1";
}

print_result() {

	echo $* | grep -q "fail"

	# $1: 0 is expecting no failure, 1 is expecting failure
	if [ $? -eq $1 ]; then
		FAILCOUNT=`expr $FAILCOUNT + 1`
		echo -e " [\033[1;31mFAIL\033[0;30m]";
	else
		PASSCOUNT=`expr $PASSCOUNT + 1`
		echo -e " [\033[1;32mPASS\033[0;30m]";
	fi

}

print_debug() {

	for x in $*; do echo $x; done

}

echo "runner.sh v0.1 - a test runner utility"
echo "Copyright (c) 2011 Ditesh Shashikant Gathani <ditesh@gathani.org>"

if [ $# -lt 3 ]; then

	echo "Usage:"
	echo "	runner.sh username password port [test]"
	echo
	echo "	username: 	POP3 username"
	echo "	password: 	POP3 password"
	echo "	port: 		POP3 port"
	echo "	test: 		which test to run (default all)"
	echo
	exit 1

fi

USER=$1
PASS=$2
PORT=$3
PASSCOUNT=0
FAILCOUNT=0

echo
print_title "Setup"
print_test "Removing tests/tmp"
OUTPUT=`rm -rf tmp`
if [ $? -gt 0 ]; then
	OUTPUT="fail";
fi
print_result 0 $OUTPUT

print_test "Creating directories in tests/tmp"
OUTPUT=`mkdir -p tmp/mboxes tmp/logs`
if [ $? -gt 0 ]; then
	OUTPUT="fail";
fi
print_result 0 $OUTPUT

if [ $# -eq 4 ]; then

	echo
	source ./$4
    echo
    source ./cleanup.sh

else

	echo
	source ./login.sh
	echo
	source ./capa.sh
	echo
	source ./list.sh
	echo
	source ./uidl.sh
	echo
	source ./dele.sh
	echo
	source ./cleanup.sh

fi

if [ $FAILCOUNT -eq 0 ]; then

	print_title "Cleanup"
	print_test "Removing tests/tmp"
	OUTPUT=`rm -r tmp`
	if [ $? -gt 0 ]; then
		OUTPUT="fail";
	fi
	print_result 0 $OUTPUT

fi

echo
echo -e "\033[1;30mSummary:"
echo -e "	\033[1;32mPassed tests: ${PASSCOUNT}\033[0;30m"
echo -e "	\033[1;31mFailed tests: ${FAILCOUNT}\033[0;30m"
echo
