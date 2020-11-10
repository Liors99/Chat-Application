const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//Dictiomary with username: {color: }
let all_active_users = {};

//Array containing all the previous messages
let message_stack = [];

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

const addMessageToStack = (message) => {
    const MAX_MSGS = 200;

    if (message_stack.length >= MAX_MSGS) {
        message_stack.shift();
    }

    message_stack.push(message);
}

io.on("connection", (socket) => {

    //Variables holding the user's information
    let username;
    let user_obj;

    //Checks if a username already exists
    const isUsernameExist = (check_username) => {
        for (const sock_id in all_active_users) {
            const connected_user_username = all_active_users[sock_id]["username"];
            if (check_username === connected_user_username) {
                return true;
            }
        }

        return false;
    }

    socket.on('cookie username', (data) => {

        //If the data does contain a username (i.e. the client had a cookie with some username)
        if (data.username !== null && !isUsernameExist(data["username"])) {
            username = data["username"];
        }
        else {
            username = generateUserId();
        }

        //Add the user to all the users list
        all_active_users[socket.id] = {};
        all_active_users[socket.id]["username"] = username;
        all_active_users[socket.id]["att"] = { "color": "rgb(255, 255, 255)" }
        //all_active_users[socket.id][username] = { "color": "rgb(0, 0, 0)" };

        user_obj = all_active_users[socket.id];

        //Assign username
        socket.emit('set username', user_obj["username"]);

        //Dumb first and then emit later so that the order is preseved across different clients

        //Let the new connection know of all the existing users
        for (const sock_id in all_active_users) {
            if (sock_id !== socket.id) {
                const connected_user_obj = all_active_users[sock_id];
                socket.emit('user connect', { username: connected_user_obj["username"], att: connected_user_obj["att"] });
            }
        }

        //Notify all connected users of the newly connected user
        io.emit('user connect', { username: user_obj["username"], att: user_obj["att"] });

        //Let the new connection know of the previous messages
        socket.emit('message log', message_stack);


    });

    //Handle disconnect
    socket.on('disconnect', () => {
        io.emit('user disconnect', user_obj["username"]);
        delete all_active_users[socket.id];
    });


    socket.on('message', (data) => {
        const att = user_obj["att"];
        //Add message to the stack and emit to the rest
        const ts = new Date().toUTCString();
        const send_obj = { username: data.username, att: att, message: data.message, ts: ts, id: socket.id };
        addMessageToStack(send_obj);
        io.emit("message", send_obj);
    });


    //Change color
    socket.on('set color', (data) => {
        user_obj["att"]["color"] = data.color;
        //Notify all the users
        io.emit('update color', { username: data.username, att: user_obj["att"] });
    });

    //Change name
    socket.on('update username', (data) => {
        const old_username = data.old_username;
        const new_username = data.new_username;

        if (isUsernameExist(new_username)) {
            socket.emit('update invalid username');
        }
        else {
            //const temp = user_obj["username"];

            delete user_obj["username"];
            user_obj["username"] = new_username;

            io.emit('update valid username', { old_username: old_username, new_username: new_username });
        }

    });
});


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("Listening on port 4000");
});

