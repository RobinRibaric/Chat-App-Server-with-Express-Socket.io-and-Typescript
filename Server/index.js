"use strict";
exports.__esModule = true;
var timers_1 = require("timers");
var http = require('http');
var express = require('express');
var socketio = require('socket.io');
var logger = require('./logger');
var cors = require('cors');
var PORT = process.env.PORT || 5000;
var inactivityTimeout = 60000 * 15;
var timer;
var router = require('./router');
var _a = require('./users'), addUser = _a.addUser, removeUser = _a.removeUser, getUser = _a.getUser, getAllUsers = _a.getAllUsers;
var app = express();
var server = http.createServer(app);
var io = socketio(server);
app.use(cors());
app.use(router);
io.on('connection', function (socket) {
    socket.on('join', function (_a) {
        var name = _a.name;
        var _b = addUser({ id: socket.id, name: name }), error = _b.error, user = _b.user;
        if (error) {
            socket.emit('username taken', { error: error });
            logger.error({
                description: 'Unavailable username', reason: '', socketID: socket.id, username: name
            });
            return socket.disconnect(true);
        }
        io.emit('user joined', { users: getAllUsers() });
        logger.info({
            description: 'User joined chat', socketID: socket.id,
            name: name
        });
        socket.emit('message', { user: 'admin', text: user.name + ", Welcome!" });
        socket.broadcast.emit('message', { user: 'admin', text: user.name + ", has joined!" });
        resetTimer(socket, user);
        socket.on('sentMessage', function (message) {
            var user = getUser(socket.id);
            io.emit('message', { user: user.name, text: message });
            resetTimer(socket, user);
        });
        socket.on('typing', function (name) {
            var user = getUser(socket.id);
            socket.broadcast.emit('user typing', name);
            resetTimer(socket, user);
        });
        socket.on('stopped typing', function () {
            var user = getUser(socket.id);
            socket.broadcast.emit('user stopped typing');
        });
        socket.on('logged out', function (_a) {
            var name = _a.name;
            var user = removeUser(socket.id);
            if (user) {
                io.emit('user disconnecting', { user: user });
                io.emit('message', { user: 'admin', text: name + " has logged out" });
                logger.error({
                    description: 'User Disconnected', reason: 'User Logged out', socketID: socket.id, username: name
                });
            }
        });
        socket.on('disconnect', function () {
            var user = removeUser(socket.id);
            if (user) {
                io.emit('user disconnecting', { user: user });
                io.emit('message', { user: 'admin', text: user.name + " left the chat" });
                logger.error({
                    description: 'User Disconnected', reason: 'Unknown', socketID: socket.id, username: name
                });
            }
        });
    });
});
var resetTimer = function (socket, user) {
    clearTimeout(timer);
    timer = timers_1.setTimeout(function () {
        socket.emit('message', { user: 'admin', text: user.name + " disconnected due to inactivity" });
        socket.emit('inactivity', { user: user, error: 'disconnected due to inactivity' });
        logger.info({
            description: 'User disconnected', reason: 'disconnected due to inactivity', socketID: socket.id, username: user.name
        });
        socket.disconnect(true);
    }, inactivityTimeout);
};
server.listen(PORT, function () { return console.log("Server has started on port " + PORT); });
