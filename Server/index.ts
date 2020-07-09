import { clearInterval, setTimeout } from "timers";

export{};
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const logger = require('./logger');
const cors = require('cors');

const PORT = process.env.PORT || 5000;
const inactivityTimeout: number = 60000 * 15;
let timer: ReturnType<typeof setTimeout>;

const router = require('./router');
const { addUser, removeUser, getUser, getAllUsers } = require('./users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

interface user {
    id: number;
    name: string;
}


app.use(cors());
app.use(router);


io.on('connection', (socket: any) => {

    socket.on('join', ({ name }: {name: string}) => {
        const { error, user } = addUser({ id: socket.id, name });

        if (error) {
            socket.emit('username taken', { error });

            logger.error({
                description: 'Unavailable username', reason: '', socketID: socket.id, username: name,
            });

            return socket.disconnect(true);
        }

        io.emit('user joined', { users: getAllUsers() });

        logger.info({
            description: 'User joined chat', socketID: socket.id, name
        });

        socket.emit('message', { user: 'admin', text: `${user.name}, Welcome!` });
        socket.broadcast.emit('message', { user: 'admin', text: `${user.name}, has joined!` });

        resetTimer(socket, user);


    socket.on('sentMessage', (message: string) => {
        const user = getUser(socket.id);

        io.emit('message', { user: user.name, text: message });

        resetTimer(socket, user);

    });


    socket.on('typing', (name: string) => {
        const user = getUser(socket.id);

        socket.broadcast.emit('user typing', name );

        resetTimer(socket, user);
    });


    socket.on('stopped typing', () => {
        const user = getUser(socket.id);
        socket.broadcast.emit('user stopped typing');
    })


    socket.on('logged out', ({name}: {name: string}) => {
        const user = removeUser(socket.id);

        if(user) {
            io.emit('user disconnecting', { user });
            io.emit('message', {user: 'admin', text:`${name} has logged out`});

            logger.error({
                description: 'User Disconnected', reason: 'User Logged out', socketID: socket.id, username: name,
            });
        }
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        
        if(user) {
            io.emit('user disconnecting', { user });
            io.emit('message', { user: 'admin', text: `${user.name} left the chat` });

            logger.error({
                description: 'User Disconnected', reason: 'Unknown', socketID: socket.id, username: name,
            });
        }

    });
});
})

const resetTimer = (socket: any, user: user) => {

    clearTimeout(timer);

    timer = setTimeout(() => {
        socket.emit('message', { user: 'admin', text: `${user.name} disconnected due to inactivity` });
        socket.emit('inactivity', { user, error: 'disconnected due to inactivity' });

        logger.info({
            description: 'User disconnected', reason: 'disconnected due to inactivity', socketID: socket.id, username: user.name,
        });

        socket.disconnect(true);
    }, inactivityTimeout);
}









server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));