var chatID = new URLSearchParams(window.location.search).get('chatID') || localStorage.getItem("chatToJoin")

var socket = io.connect();
var localUsername = localStorage.getItem("username")
socket.emit("joinRoom", { chatID: chatID, username: localUsername, password: localStorage.getItem("password") })
var messageColor = 0;

localStorage.setItem("lastChatID", chatID);
$("#username").html(localUsername)

function newMessage(username, message) {
    toScroll = $("#history").scrollTop() + $("#history").height() > $(document).height() - 150
    console.log(toScroll);
    $("#history").append(`<p><b>${username}: </b>${message}</p>`);
    if (toScroll) {
        $('#history').scrollTop($('#history')[0].scrollHeight);
    }
}

function sendMessage(username, message) {
    socket.emit("message", { username: username, message: message })
}

function clearChat() {
    document.getElementById("history").innerHTML = ""
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
    message = document.getElementById("message").value
    if (message.split("")[0] == "/") {
        console.log(message.split()[0]);
        switch (message.split()[0]) {
            case "/clear":
                console.log("command /clear");
                clearChat();
                break;
        }
        document.getElementById("message").value = ""
        return
    }
    sendMessage(username = localUsername, message = message)
    document.getElementById("message").value = ""
}

document.addEventListener("keyup", function(event) {
    if (event.code == "Enter") {
        messageEnter()
    }
})

socket.on("newUser", function(data) {
    newMessage(username = "SERVER", message = data.username + " Joined The Chat")
    console.log("New User");
})

socket.on("message", function(data) {
    console.log("New Message" + data);
    newMessage(username = data.username, message = data.message)
})

socket.on("userDisconnected", function(data) {
    console.log("User Disconnected");
    newMessage(username = "SERVER", message = data.username + " Left The Chat")
})