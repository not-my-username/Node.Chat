const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Filter = require('bad-words');
const { log } = require("console");
const filter = new Filter();
const package = require('./package.json');
const fs = require('fs');

function xss(string) {
    return !!string ? string.replace(/[<,>]/g, "") : false
}

activeChatIDs = []; //array
activeChats = []; //dictionary
activeUsers = []; //dictionary
publicChats = []; //array
chatsToRemove = [] //dictionary

class Chat {
    constructor(chatID, chatName = "", maxUsers = 4, censorChat = true, antiSpam = true) {
        this.chatID = chatID;
        this.maxUsers = maxUsers;
        this.censorChat = censorChat;
        this.users = [];
        this.isFull = false;
        this.totalUsers = 0;
        this.chatName = chatName;
        this.antiSpam = antiSpam;
    }
    addUser(userID, username) {
        this.users[userID] = { id: userID, username: username }
        this.totalUsers++;
        log(this.totalUsers)
        if (this.totalUsers >= this.maxUsers && this.maxUsers != 0) this.isFull = true;
    }
    removeUser(userID) {
        delete this.users[userID]
        this.isFull = false
        this.totalUsers--
            log(this.totalUsers)
    }
}

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    openChats = ""
    publicChats.forEach(chat => {
        openChats += `<a href="chat?chatID=${chat.chatID}" style="color:#00c8ff;">${chat.chatID}: ${chat.chatName}</a><br/>`;
    });
    changeLogText = fs.readFileSync("./public/change-log.txt").toString().split("\n");
    changeLog = ""
    for (i in changeLogText) {
        changeLog += `<li>${changeLogText[i]} </li>`
    }
    res.render('index', {
        activeChats: openChats,
        version: "V" + package.version,
        changeLog: changeLog
    });
})

app.get("/newChat", function(req, res) {
    console.log("New Chat");
    chatID = Math.round(Math.random() * (999999 - 10000) + 10000)
    activeChatIDs.push(chatID)
    censorChat = !!parseInt(req.query.censor)
    activeChats[chatID] = new Chat(chatID, chatName = xss(req.query.chatName) || chatID, maxUsers = req.query.maxUsers || 0, censorChat = censorChat = "off" ? true : censorChat)
    activeChats[chatID]
    publicChats.push({ chatID: chatID, chatName: chatName })
    res.redirect(`/chat?chatID=${chatID}`)
})

io.on("connection", (socket) => {
    console.log("Scoket connection");
    socket.on("message", function(data) {
        if (data.message == "") return
        censorChat = activeChats[activeUsers[socket.id].chatID].censorChat
        message = { username: activeUsers[socket.id].username, message: xss(censorChat ? filter.clean(data.message) : data.message) }
        console.log(message);
        io.sockets.in(activeUsers[socket.id].chatID).emit("message", message);
    });
    socket.on("joinRoom", function(data) {
        console.log("Socket Join Room");
        username = xss(data.username)
        socket.join(data.chatID)
        if (username == "") username = Math.round(Math.random() * (999999 - 10000) + 10000)
        activeUsers[socket.id] = { chatID: data.chatID, username: username };
        activeChats[data.chatID].addUser(socket.id, username)
        io.sockets.in(data.chatID).emit('newUser', activeChats[data.chatID].users[socket.id]);
        if (chatsToRemove.includes(activeUsers[chatID])) {
            clearTimeout(chatsToRemove[chatID])
        }
    });
    socket.on('disconnect', function() {
        try {
            if (activeChats[activeUsers[socket.id].chatID].totalUsers <= 0) {
                log("removing chat")
                chatsToRemove[activeUsers[socket.id].chatID] = setTimeout(() => {
                    id = activeUsers[socket.id].chatID
                    log("removing: " + id)
                    activeChatIDs.splice(activeChatIDs.indexOf(id))
                    publicChats.splice(publicChats.indexOf({ chatID: id, chatName: activeUsers[socket.id].chatName }))
                    delete activeChats[id]
                }, 60000)
            }
            console.log("User disconnected " + activeUsers[socket.id].username);
            io.sockets.in(activeUsers[socket.id].chatID).emit('userDisconnected', { id: socket.id, username: activeUsers[socket.id].username });
            activeChats[activeUsers[socket.id].chatID].removeUser(socket.id);
        } catch {
            console.log("User disconnected | Unable to remove");
        }
    })
})

server.listen(process.env.PORT || 5000, () => {
    console.log(`listening on *:${process.env.PORT || 5000}`);
});