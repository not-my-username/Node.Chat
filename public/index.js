$(document).ready(function() {
    $("#joinChat").on("click", function() {
        localStorage.setItem("chatToJoin", $("#gameID").val())
        localStorage.setItem("username", $("#username1").val())
        localStorage.setItem("password", $("#password1").val())
        location.href = "/chat"
    });

    $("#createChat").on("click", function() {
        localStorage.setItem("username", $("#username2").val())
        localStorage.setItem("password", $("#password2 ").val())
        chatName = $("#chatName").val()
        maxUsers = $("#maxUsers").val()
        password = $("#password2").val()
        censorChat = $("#censorChat").is(":checked")
        antiSpam = $("#antiSpam").is(":checked")
        location.href = `/newChat?chatName=${chatName}&maxUsers=${maxUsers}&censorChat=${censorChat}&antiSpam=${antiSpam}&password=${password}`
    });
});