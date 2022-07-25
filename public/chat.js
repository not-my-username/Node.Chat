var chatID = new URLSearchParams(window.location.search).get('chatID') || localStorage.getItem("chatToJoin")
var activeChat = chatID
var socket = io.connect();
var chats = []
var localUsername = localStorage.getItem("username")
$("#username").html(localUsername)
$("#chatID").html("ID: " + chatID)

localStorage.setItem("lastChatID", chatID)
if (!localStorage.getItem("settings")) {
    settings = { darkmode: window.matchMedia('(prefers-color-scheme: dark)').matches }
    localStorage.setItem("settings", JSON.stringify(settings))
    saveSettings()
}

socket.emit("joinRoom", { chatID: chatID, username: localUsername, password: localStorage.getItem("password") })

template = $("#templateChatItem").clone();
template.attr("id", chatID);
template.appendTo("#menu");

socket.on("roomData", function(data) {
    console.log("room Data " + data.id);
    $(`#${data.id}`).children("span").html(data.name)
    if (activeChat == data.id) {
        $("#chatName").text(data.name)
        chats[chatID] = { name: data.name, history: [] }
    } else chats[data.id] = { name: data.name, history: [] }

})

function changeChat(chat) {
    console.log("Changing chat to: " + chat.id)
    activeChat = chat.id
    $("#chatName").text(chats[chat.id].name)
    $("#chatID").text(chat.id)
    $("#history").text("")
    chats[chat.id].history.forEach(message => {
        $("#history").append(message);
    });
}

function createChat() {
    console.log("making new chat");
    $.get(`/newChatID?chatName=${$("#newChatName").val()}&maxUsers=${$("#maxUsers").val()}&censorChat=${$("#censorChat").is(":checked")}&antiSpam=${$("#antiSpam").is(":checked")}&password=${ $("#password2").val()}`, function(data, status) {
        console.log(data.id);
        chats[data.id] = { name: "Chat Name", history: [] }
        socket.emit("joinRoom", {
            chatID: data.id,
            username: localUsername,
            password: $("#password2").val()
        })
        template = $("#templateChatItem").clone();
        template.attr("id", data.id);
        template.appendTo("#menu");

    });
}

function joinChat() {
    socket.emit("joinRoom", {
        chatID: $("#chatIDtoJoin").val(),
        username: localUsername,
        password: $("#password1").val()
    })
    template = $("#templateChatItem").clone();
    template.attr("id", $("#chatIDtoJoin").val());
    template.appendTo("#menu");
}

function newMessage(username, message, id) {
    try {
        chats[id].history.push(`<p><b>${username}: </b>${message}</p>`)
    } catch {}
    if (activeChat == id) {
        toScroll = $("#history").scrollTop() + $("#history").height() > $(document).height() - 150
        console.log(toScroll);
        $("#history").append(`<p><b>${username}: </b>${message}</p>`);
        if (toScroll) {
            $('#history').scrollTop($('#history')[0].scrollHeight);
        }
    }
}

function sendMessage(username, message, chatID) {
    console.log("sending");
    socket.emit("message", { username: username, message: message, chatID: chatID })
}

function clearChat() {
    $("#history").text("")
    chats[activeChat].history = []
    console.log("chat clered");
}

function checkURL(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    })
}

function messageEnter() {
    console.log("Endered");
    message = $("#message").val()
    if (message.split("")[0] == "/") {
        console.log(message.split()[0]);
        switch (message.split()[0]) {
            case "/clear":
                console.log("command /clear");
                clearChat();
                break;
        }
        $("#message").val("")
        return
    }
    sendMessage(username = localUsername, message = message, chatID = activeChat)
    document.getElementById("message").value = ""
}

document.addEventListener("keyup", function(event) {
    if (event.code == "Enter") {
        messageEnter()
    }
})

function saveSettings() {
    document.styleSheets[4].disabled = !$("#darkmode").is(":checked")
    settings.darkmode = $("#darkmode").is(":checked")
    localStorage.setItem("settings", JSON.stringify(settings))
}

socket.on("newUser", function(data) {
    console.log("New User");
    console.log(data)
    newMessage(username = "SERVER", message = data.username + " Joined The Chat", id = data.chatID)
})

socket.on("message", function(data) {
    console.log(data);
    newMessage(username = data.username, message = checkURL(data.message), id = data.chatID)
})

socket.on("userDisconnected", function(data) {
    console.log("User Disconnected");
    newMessage(username = "SERVER", message = data.username + " Left The Chat", id = data.chatID)
})