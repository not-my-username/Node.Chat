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

var activeChatIDs = [];
var activeChats = [];
var activeUsers = [];
var chatsToRemove = [];
var openChats = "";
var changeLog = "";
var isValid = true;

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

function xss(string) {
    return !!string ? string.replace(/[<,>]/g, "") : false
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
    isValid = true
    while (isValid) {
        chatID = Math.round(Math.random() * (999999 - 10000) + 10000)
        isValid = activeChatIDs.includes(chatID)
    }
    activeChatIDs.push(chatID)
    censorChat = (req.query.censorChat == "true" ? true : false),
        console.log(censorChat);
    activeChats[chatID] = new Chat(
        chatID = chatID,
        chatName = xss(req.query.chatName) || chatID,
        maxUsers = req.query.maxUsers || 0,
        censorChat = censorChat,
        password = req.query.password
    )
    res.redirect(`/chat?chatID=${chatID}`)
})

app.get("/newChatID", function(req, res) {
    console.log("New Chat");
    isValid = true
    while (isValid) {
        chatID = Math.round(Math.random() * (999999 - 10000) + 10000)
        isValid = activeChatIDs.includes(chatID)
    }
    activeChatIDs.push(chatID)
    censorChat = !!parseInt(req.query.censor)
    activeChats[chatID] = new Chat(
        chatID = chatID,
        chatName = xss(req.query.chatName) || chatID,
        maxUsers = req.query.maxUsers || 0,
        censorChat = censorChat = "off" ? true : censorChat,
        password = req.query.password
    )
    res.send({ id: chatID })
})

io.on("connection", (socket) => {
    console.log("Scoket connection");
    socket.on("message", function(data) {
        console.log("test message on socket.on");
        try {
            chatID = parseInt(data.chatID)
            if (!activeUsers[socket.id] || data.message == "" || chatID == false || !activeUsers[socket.id].chats.includes(parseInt(chatID))) return
            console.log(data.message);
            console.log(data.message.replace('"', '"').replace("'", "'"));
            io.sockets.in(chatID).emit("message", { username: activeUsers[socket.id].username, message: xss(activeChats[parseInt(chatID)].censorChat ? filter.clean(data.message.replace(/["]/g, "\"").replace(/[']/g, "\'")) : data.message), chatID: chatID });
        } catch {
            console.log("An error when relaying message");
        }
    });

    socket.on("joinRoom", function(data) {
        console.log("Socket Join Room " + data.username);
        chatID = parseInt(data.chatID)
        if (!activeChatIDs.includes(parseInt(chatID))) {
            console.log("Invalid chat id");
            socket.emit("message", { username: "SERVER ERROR", message: "ERROR: Chat ID Missing", chatID: chatID })
            return
        }

        if (data.password != activeChats[chatID].password) {
            console.log("incorrect password");
            socket.emit("message", { username: "SERVER ERROR", message: "INCORRECT PASSWORD!", chatID: chatID })
            return
        }

        if (!activeUsers[socket.id]) {
            username = xss(data.username)
            if (username == "") username = Math.round(Math.random() * (999999 - 10000) + 10000)

            activeUsers[socket.id] = { chats: [], username: username, id: socket.id };
        } else { username = activeUsers[socket.id].username }

        activeUsers[socket.id].chats.push(chatID)
        socket.join(chatID)
        socket.emit("roomData", { name: activeChats[chatID].chatName, id: chatID })
        activeChats[chatID].addUser(socket.id, activeUsers[socket.id].username)

        io.sockets.in(chatID).emit('newUser', { username: username, id: socket.id, chatID: chatID });

        if (chatsToRemove.includes(activeUsers[chatID])) {
            clearTimeout(chatsToRemove[chatID])
        }
    });
    socket.on("changeUsername", function(data) {
        console.log(data.username);
        console.log(activeUsers[socket.id].username);
        console.log(activeChats);
        activeUsers[socket.id].username = data.username;
        activeUsers[socket.id].chats.forEach(chat => {
            activeChats[chat].users[socket.id].username = data.username
        })
        console.log(activeUsers[socket.id].username);
        console.log(activeChats);
    })
    socket.on("leaveChat", function(data) {
        if (!activeUsers[socket.id]) return
        console.log(data.chatID);
        io.sockets.in(data.chatID).emit('userDisconnected', { id: socket.id, username: activeUsers[socket.id].username, chatID: data.chatID });
        activeChats[data.chatID].removeUser(socket.id);
        delete activeUsers[socket.id]
        if (activeChats[data.chatID].totalUsers <= 0) {
            log("removing: " + data.chatID)
            chatsToRemove[data.chatID] = setTimeout(() => {
                id = data.chatID
                log("Chat " + id + " removed")
                activeChatIDs.splice(activeChatIDs.indexOf(id))
                delete activeChats[id]
            }, 60000)
        }
    })
    socket.on("disconnect", function() {
        if (!activeUsers[socket.id]) return
        console.log("User disconnected " + activeUsers[socket.id].username);

        activeUsers[socket.id].chats.forEach(e => {
            log(e)
            io.sockets.in(e).emit('userDisconnected', { id: socket.id, username: activeUsers[socket.id].username, chatID: e });
            activeChats[e].removeUser(socket.id);
            if (activeChats[e].totalUsers <= 0) {
                log("removing: " + e)
                chatsToRemove[e] = setTimeout(() => {
                    id = e
                    log("Chat " + id + " removed")
                    activeChatIDs.splice(activeChatIDs.indexOf(id))
                    delete activeChats[id]
                }, 60000)
            }
        });
        delete activeUsers[socket.id]

    })
})

server.listen(process.env.PORT || 5000, () => {
    console.log(`listening on *:${process.env.PORT || 5000}`);
});