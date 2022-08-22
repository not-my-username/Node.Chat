var chatID = new URLSearchParams(window.location.search).get('chatID') || localStorage.getItem("chatToJoin")
var activeChat = chatID
var socket = io.connect();
var chats = []
var localUsername = localStorage.getItem("username")
var sessionData = localStorage.getItem("sessionData") || []
$("#username").html(localUsername)
$("#chatID").html("ID: " + chatID)

localStorage.setItem("lastChatID", chatID)
if (!localStorage.getItem("settings")) {
    settings = { darkmode: window.matchMedia('(prefers-color-scheme: dark)').matches, audoScroll: true, notifications: false }
    localStorage.setItem("settings", JSON.stringify(settings))
    saveSettings()
} else(settings = JSON.parse(localStorage.getItem("settings")))

socket.emit("joinRoom", { chatID: chatID, username: localUsername, password: localStorage.getItem("password") })


socket.on("roomData", function(data) {
    console.log("room Data " + data.id);
    chats[data.id] = { name: "Chat Name", history: [] }
    template = $("#templateChatItem").clone();
    template.attr("id", data.id);
    template.children("span").html(data.name)
    template.appendTo("#menu");
    if (activeChat == data.id) {
        $("#chatName").text(data.name)
        chats[chatID] = { name: data.name, history: [] }
    } else chats[data.id] = { name: data.name, history: [] }
    sessionData.push[data.id]
    localStorage.setItem("sessionData", sessionData)
})


isActive = false
$(window).focus(function() {
    isActive = true
});

$(window).blur(function() {
    isActive = false
});

function changeChat(chat) {
    console.log("Changing chat to: " + chat.id)
    activeChat = chat.id
    $("#chatName").text(chats[chat.id].name)
    $("#chatID").text(chat.id)
    $("#history").text("")
    chats[chat.id].history.forEach(message => {
        $("#history").append(message);
    });
    document.title = ($("#pageTitle").val() != "" ? $("#pageTitle").val() : chats[activeChat].name + " | Node.Chat V3")
}

function createChat() {
    console.log("making new chat");
    $.get(`/newChatID?chatName=${$("#newChatName").val()}&maxUsers=${$("#maxUsers").val()}&censorChat=${$("#censorChat").is(":checked")}&antiSpam=${$("#antiSpam").is(":checked")}&password=${ $("#password2").val()}`, function(data, status) {
        console.log(data.id);
        socket.emit("joinRoom", {
            chatID: data.id,
            username: localUsername,
            password: $("#password2").val()
        })
    });
}

function joinChat() {
    socket.emit("joinRoom", {
        chatID: $("#chatIDtoJoin").val(),
        username: localUsername,
        password: $("#password1").val()
    })
}

function newMessage(username, message, id) {
    try {
        chats[id].history.push(`<p><b>${username}: </b>${message}</p>`)
    } catch {}
    if (activeChat == id) {
        // toScroll = !($("#history").scrollTop() + $("#history").height() > $(document).height())
        $("#history").append(`<p><b>${username}: </b>${message}</p>`);
        if (settings.autoScroll) {
            $('#history').scrollTop($('#history')[0].scrollHeight);
        }
    }
    if (settings.notifications) {

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
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
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
    settings.autoScroll = $("#autoScroll").is(":checked")
    settings.notifications = $("#notifications").is(":checked")
    if (settings.notifications) {
        if (!("Notification" in window)) {
            $("#error").text("This browser does not support desktop notification");
            $('#errorModal').modal('show');
            settings.notifications = false
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission()
        }
    }
    localStorage.setItem("settings", JSON.stringify(settings))
    document.title = ($("#pageTitle").val() != "" ? $("#pageTitle").val() : chats[activeChat].name + " | Node.Chat V3")
}

function changeUsername() {
    socket.emit("changeUsername", { username: $("#username1").val() })
}

function leaveChat() {
    socket.emit("leaveChat", { chatID: parseInt(activeChat) })
    $(`#${activeChat}`).remove()
    delete chats[activeChat]
    activeChat = 0
    $("#history").text("");
    $("#chatID").text("");
    $("#chatName").text("You left the chat!");
}

socket.on("newUser", function(data) {
    console.log("New User");
    console.log(data)
    newMessage(username = "SERVER", message = data.username + " Joined The Chat", id = data.chatID)
})

socket.on("changeUsername", function(data) {
    console.log(data)
    newMessage(username = "SERVER", message = data.username + " Joined The Chat", id = data.chatID)
})

socket.on("message", function(data) {
    console.log(data);
    if (data.username == "SERVER ERROR") {
        $("#error").text(data.message);
        $('#errorModal').modal('show');
        return
    }
    if (!isActive) {
        x = new Notification(data.username, { body: data.message })
    }
    newMessage(username = data.username, message = checkURL(data.message), id = data.chatID)
})

socket.on("userDisconnected", function(data) {
    console.log("User Disconnected");
    newMessage(username = "SERVER", message = data.username + " Left The Chat", id = data.chatID)
})