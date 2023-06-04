"use strict";
var express = require('express');
var socket = require('socket.io');
var fs = require('fs');


var config = JSON.parse(fs.readFileSync('config.json')); //读取配置文件

const FOBIDEN_NAMES = ['系统消息', '系统', '管理员', 'admin'];
const ADMIN_SEC = fs.readFileSync("SEC", { encoding: 'utf-8' });
const MAX_MSG_LEN = 128;
const MAX_NAME_LEN = 32;
var person = new Map();//记录在线情况
var history = [];//需要缓存的消息
var history_num = config.history_num; //服务器缓存的历史消息条数
var port = config.sever_port;	//端口号
var backup = config.backup; //是否开启备份
var backup_filename = config.backup_filename; //备份文件名字

var app = express();
var server = app.listen(port);
var io = new socket(server);

app.use(express.static('node_modules'));
app.use('/static', express.static('public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});
io.on('connection', (socket) => {
	var user = null;
	var backup_file = fs.readFileSync(backup_filename);
	var backup_msg = backup_file != '' ? JSON.parse(backup_file) : [];
	var history = backup_msg.length <= history_num ? backup_msg : backup_msg.slice(backup_msg.length - history_num, backup_msg.length + history_num);

	socket.emit('history', history); //发送服务器记录的历史消息
	io.sockets.emit('updatePerson', mapToArray(person));
	socket.on('sendMsg', (data) => {
		if (typeof data !== "string" || data.length > MAX_MSG_LEN) {
			socket.emit("server_error", "InvaildMessage");
			return;
		}
		if (typeof user !== "string") {
			socket.emit("server_error", "NotLogin");
			return;
		}
		var obj = new Object();
		obj.content = data;
		obj.time = Now();
		obj.name = user;
		if (history.length == history_num) {
			history.shift();
		}
		if (backup) {
			backupMsg(backup_filename, obj);
		}
		history.push(obj);
		io.sockets.emit('news', obj);
	});

	socket.on('setUserName', (data) => {
		if (typeof data !== "string" || data.length > MAX_NAME_LEN) {
			socket.emit("server_error", "InvaildUserName");
			return;
		}
		if (data.indexOf(ADMIN_SEC) != -1) {
			data = data.replace(ADMIN_SEC, "");
			let socket = person.get(data);
			if (socket) {
				socket.emit("server_error", "KickByAdmin");
				socket.disconnect(true);
			}
		} else {
			if (FOBIDEN_NAMES.indexOf(data) != -1) {
				socket.emit("server_error", "InvaildUserName");
				return;
			}

			if (person.has(data)) {
				socket.emit("server_error", "UserNameExist");
				return;
			}
		}
		user = data;
		person.set(user, socket);
		io.sockets.emit('updatePerson', mapToArray(person));
		io.sockets.emit('news', { content: user + '进入房间', time: Now(), name: '系统消息' });
	});

	socket.on('disconnect', (socket) => {
		if (typeof user === "string") {
			person.delete(user);
			io.sockets.emit('news', { content: user + '离开房间', time: Now(), name: '系统消息' });
			io.sockets.emit('updatePerson', mapToArray(person));
		}
	});

});
function mapToArray(set) {
	let values = set.keys();
	let arr = [];
	for (let i = 0; i < set.size; i++) {
		arr.push(values.next().value);
	}
	return arr;
}
function Now() {
	var date = new Date();
	return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '  ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function backupMsg(filename, obj) {
	var backup_file = fs.readFileSync(backup_filename);
	var msg = backup_file != '' ? JSON.parse(backup_file) : [];
	msg.push(obj);
	var str = '[\n'
	msg.forEach((value, index) => {
		if (index !== 0) {
			str += ',\n';
		}
		str += '  {\n    "name":"' + value.name + '",\n    "time":"' + value.time + '",\n    "content":"' + value.content + '"\n  }';
	});
	str += '\n]';
	fs.writeFile(filename, str, (err) => {
		if (err) {
			console.log("fail write :" + arr + "   " + Date() + "\n error:" + err);
		}
	});
}



