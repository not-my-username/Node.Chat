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
        this.password = password
    }
    addUser(userID, username) {
        this.users[userID] = { id: userID, username: username }
        this.totalUsers++;
        if (this.totalUsers >= this.maxUsers && this.maxUsers != 0) this.isFull = true;
    }
    removeUser(userID) {
        delete this.users[userID]
        this.isFull = false
        this.totalUsers--
    }
}

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    openChats = ""
    activeChats.forEach(chat => {
        openChats += `<u onclick="openChat(this)" id=${chat.chatID} style="color:#00c8ff;">${chat.chatID}: ${chat.chatName}</u><br/>`;
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
    console.log(req.query);
    console.log("Chat password " + req.query.password);
    activeChats[chatID] = new Chat(chatID, chatName = xss(req.query.chatName) || chatID, maxUsers = req.query.maxUsers || 0, censorChat = censorChat = "off" ? true : censorChat, password = req.query.password)
    res.redirect(`/chat?chatID=${chatID}`)
})

app.get("/newChatID", function(req, res) {
    console.log("New Chat");
    chatID = Math.round(Math.random() * (999999 - 10000) + 10000)
    activeChatIDs.push(chatID)
    censorChat = !!parseInt(req.query.censor)
    activeChats[chatID] = new Chat(chatID, chatName = xss(req.query.chatName) || chatID, maxUsers = req.query.maxUsers || 0, censorChat = censorChat = "off" ? true : censorChat, password = req.query.password)
    res.send({ id: chatID })
})

io.on("connection", (socket) => {
    console.log("Scoket connection");
    socket.on("message", function(data) {
        chatID = parseInt(data.chatID)
        console.log("Message");
        console.log(activeUsers[socket.id].chats);
        console.log(chatID);
        console.log(!activeUsers[socket.id].chats.includes(parseInt(chatID)))
        if (!activeUsers[socket.id]) return
        if (data.message == "" || chatID == false || !activeUsers[socket.id].chats.includes(parseInt(chatID))) return
        censorChat = activeChats[parseInt(chatID)].censorChat
        message = { username: activeUsers[socket.id].username, message: xss(censorChat ? filter.clean(data.message) : data.message), chatID: chatID }
        console.log(message);
        io.sockets.in(chatID).emit("message", message);
    });
    socket.on("joinRoom", function(data) {
        console.log("Socket Join Room " + data.username);
        chatID = parseInt(data.chatID)
        if (!activeChatIDs.includes(parseInt(chatID))) {
            console.log("Invalid chat id");
            socket.emit("message", { username: "SERVER", message: "ERROR: Chat ID Missing" })
            return
        }

        if (data.password != activeChats[chatID].password) {
            log(activeChats[chatID].password + data.password)
            console.log("incorrect password");
            socket.emit("message", { username: "SERVER", message: "INCORRECT PASSWORD!" })
            return
        }

        if (!activeUsers[socket.id]) {
            console.log(data.username);
            username = xss(data.username)
            console.log(username);
            if (username == "") username = Math.round(Math.random() * (999999 - 10000) + 10000)

            activeUsers[socket.id] = { chats: [], username: username, id: socket.id };
        } else { username = activeUsers[socket.id].username }

        activeUsers[socket.id].chats.push(chatID)
        socket.join(chatID)
        socket.emit("roomData", { name: activeChats[chatID].chatName, id: chatID })

        console.log({ username: username, id: socket.id, chatID: chatID });
        io.sockets.in(chatID).emit('newUser', { username: username, id: socket.id, chatID: chatID });
        activeChats[chatID].addUser(socket.id, activeUsers[socket.id].username)

        if (chatsToRemove.includes(activeUsers[chatID])) {
            clearTimeout(chatsToRemove[chatID])
        }
    });
    socket.on('disconnect', function() {
        if (!activeUsers[socket.id]) return
        console.log("User disconnected " + activeUsers[socket.id].username);
        activeUsers[socket.id].chats.forEach(e => {
            io.sockets.in(e).emit('userDisconnected', { id: socket.id, username: activeUsers[socket.id].username, chatID: e });
            activeChats[e].removeUser(socket.id);
            if (activeChats[e].totalUsers <= 0) {
                log("removing: " + e)
                chatsToRemove[e] = setTimeout(() => {
                    id = e
                    log("Chat " + id + " removed")
                    activeChatIDs.splice(activeChatIDs.indexOf(id))
                    delete activeChats[id]
                    delete activeUsers[socket.id]
                }, 60000)
            }
        });
    })
})

server.listen(process.env.PORT || 5000, () => {
    console.log(`listening on *:${process.env.PORT || 5000}`);
});