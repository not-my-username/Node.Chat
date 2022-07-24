$(document).ready(function() {
    if (localStorage.getItem("username")) {
        $("#username1").text(localStorage.getItem("username"))
        $("#username2").text(localStorage.getItem("username"))
    }
    $("#joinChat").on("click", function() {
        // x = []
        // x[$("#gameID").val()] = $("#password1").val()
        // localStorage.setItem("sessionData", x)
        localStorage.setItem("username", $("#username1").val())
        localStorage.setItem("password", $("#password1").val())
        location.href = "/chat?chatID=" + $("#chatID").val()
    });

    $("#createChat").on("click", function() {
        localStorage.setItem("password", $("#password2").val())
        localStorage.setItem("username", $("#username2").val())
        location.href = `/newChat?chatName=${$("#chatName").val()}&maxUsers=${$("#maxUsers").val()}&censorChat=${$("#censorChat").is(":checked")}&antiSpam=${$("#antiSpam").is(":checked")}&password=${ $("#password2").val()}`
    });
});