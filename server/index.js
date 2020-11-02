const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//Dictiomary with username: {color: }
let all_active_users = {};

//Generates a random 5 digit ID
const generateUserId = () => {
    let id;
    let username;
    do {
        id = Math.floor(Math.random() * 90000) + 10000;
        username = "user-" + id
    } while (username in all_active_users);
    return username;
}


io.on("connection", (socket) => {
    //TODO: Check cookie and assign previous username
    const username = generateUserId();

    //Assign username
    socket.emit('set username', username);
    //Notify all connected users of the newly connected user
    io.emit('user connect', username);

    //Let the new connection know of all the existing users
    for (const connected_user in all_active_users) {
        socket.emit('user connect', connected_user);
    }

    //Add the user to all the users list
    //all_active_users.push(username);
    all_active_users[username] = { "color": "rgb(0, 0, 0)" };

    //Handle disconnect
    socket.on('disconnect', () => {
        delete all_active_users[username];
        io.emit('user disconnect', username);
    });


    socket.on("message", ({ name, message }) => {
        const user_obj = all_active_users[name];
        io.emit("message", { name, user_obj, message, })
    });
});



http.listen(4000, () => {
    console.log("Listening on port 4000");
});

