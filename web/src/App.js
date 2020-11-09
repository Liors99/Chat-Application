import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';

import './App.css';

const socket = io.connect("http://localhost:4000");

function App() {
  let [, setState] = useState();
  const [thisName, setThisName] = useState("");
  const [sockid, setSockId] = useState();
  const [message, setMessage] = useState("");
  const [inputErrorMsg, setInputErrorMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [activeUsers, setActiveUsers] = useState({});


  const dummy = useRef(); //for autoscroll

  useEffect(() => {

    setSockId(socket.id);
    console.log(socket.id);
    //Sets the cookie username information
    const setCookieUsername = (username) => {
      const MINUTES = 5;
      let date = new Date();
      date.setTime(date.getTime() + (MINUTES * 60 * 1000));
      document.cookie = "username=" + username + "; expires = " + date.toUTCString() + ";";
    }

    //If there is a cookie with a username attribute on it (not expired), send it to the server (adapted from https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie)
    if (document.cookie.split(';').some((item) => item.trim().startsWith('username='))) {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('username'))
        .split('=')[1];
      console.log(cookieValue);
      socket.emit('cookie username', { "username": cookieValue });
    }
    else {
      socket.emit('cookie username', { "username": null });
    }

    //Handle new user
    socket.on('user connect', (data) => {
      console.log("Connected user: " + data.username);
      setActiveUsers((oldUsers) => ({ ...oldUsers, [data.username]: data.att }));
    });


    //Handle user disconnect
    socket.on('user disconnect', (username) => {
      console.log("Disconnected user: " + username);
      setActiveUsers((oldUsers) => {
        let newUsers = oldUsers;
        delete newUsers[username];
        return (newUsers);
      });

      //Force the render (for some reason returning a new object does not seem to re-render, just 1 clock cycle mutation operations on object...)
      setState({});
    });


    socket.on('message', (data) => {
      const username = data.username;
      const att = data.att;
      const message = data.message;
      const ts = data.ts
      const id = data.id;

      console.log(id);

      dummy.current.scrollIntoView({ behavior: 'smooth' });
      setChat(oldChat => [...oldChat, { username: username, att: att, message: message, ts: ts, id: id }]);
    });

    socket.on('message log', (data) => {
      setChat(data);
    });

    socket.on('set username', (username) => {
      //Set the cookie info
      setCookieUsername(username);
      setThisName(username);
    });

    socket.on('update color', (data) => {
      setActiveUsers((oldUsers) => ({ ...oldUsers, [data.username]: data.att }));
    });

    //Checking for new updated username
    socket.on('update valid username', (data) => {

      const old_username = data.old_username;
      const new_username = data.new_username;

      //Update the cookie information
      setCookieUsername(new_username);



      //Add the "new" username and assign it all the attributes of the old name
      setActiveUsers((oldUsers) => {
        const keys = Object.keys(oldUsers)
        let index_username = keys.indexOf(old_username); //Get the position of the old username
        console.log(index_username);
        let newUsers = {};
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (i === index_username) {
            newUsers[new_username] = oldUsers[old_username];
          }
          else {
            newUsers[key] = oldUsers[key];
          }
        }

        console.log(newUsers);

        return newUsers;
      });

      //Update our name if it matches with the one sent
      setThisName(oldName => {
        if (oldName === old_username) {
          return new_username;
        }
        else {
          return oldName;
        }
      });

      //Force the render
      setState({});
    });

    //Checking for invalid username (i.e. taken)
    socket.on('update invalid username', () => {
      setInputErrorMsg("Selected username is already taken")
    });
  }, []);

  const onTextChange = (e) => {
    setMessage(e.target.value);

  }

  const onMessageSubmit = (e) => {

    const parseEmojisMsg = (msg) => {
      msg = msg.replace(":)", "🙂");
      msg = msg.replace(":(", "🙁");
      msg = msg.replace(":D", "😁");
      msg = msg.replace(":O", "😮");
      msg = msg.replace("<3", "❤️");

      return msg;
    }

    e.preventDefault();
    //Check if the message is a command
    if (message.charAt(0) === '/') {
      const msg_ar = message.split(' ');

      //Input validation for the color command
      if (msg_ar[0] === "/color") {
        if (msg_ar.length !== 4) {
          setInputErrorMsg("Usage: /color R G B");
          return;
        }
        for (let i = 1; i < 4; i++) {
          //Check if it is a number
          if (isNaN(msg_ar[i])) {
            setInputErrorMsg("Colors must be numbers");
            return;
          }

          //At this point the value is a number, so check if value is between 0 and 255
          const c_val = parseInt(msg_ar[i]);
          if (c_val < 0 || c_val > 255) {
            setInputErrorMsg("Colors values must be between 0 and 255 (inclusively)");
            return;
          }
        }

        //If we got to this stage, then the input is valid
        const color = "rgb(" + msg_ar[1] + "," + msg_ar[2] + "," + msg_ar[3] + ")";
        socket.emit('set color', { username: thisName, color: color });

        setInputErrorMsg("");
        setMessage("");
      }
      //Input validation for the name command
      else if (msg_ar[0] === "/name") {
        if (msg_ar.length !== 2) {
          setInputErrorMsg("Usage: /name <new name>");
          return;
        }

        //If we are at this point the input has been validated
        socket.emit('update username', { old_username: thisName, new_username: msg_ar[1] });
        setInputErrorMsg("");
        setMessage("");
      }
      else {
        setInputErrorMsg("Invalid command");
      }
    }
    else {
      //Otherwise it is a normal message

      //Parse any emojis
      let parsed_msg = parseEmojisMsg(message);
      console.log(parsed_msg);
      socket.emit('message', { username: thisName, message: parsed_msg });
      setMessage("");
      setInputErrorMsg("");
    }

  }

  const renderActiveUserList = () => {
    let ret = [];
    for (let user in activeUsers) {
      const user_color = activeUsers[user]["color"];
      ret.push(
        <Grid item xs={12}>
          <h2 style={{ color: user_color }}>{user} {user === thisName ? "(You)" : ""}</h2>
        </Grid>
      );
    }

    return ret;

  }

  const renderChat = () => {
    return chat.map(({ username, att, message, ts, id }, index) => (
      <div key={index}>
        <h3 style={{ "color": att["color"] }}>
          {username} at {ts} <span style={{ color: "black", fontWeight: (id === sockid ? "bold" : "normal") }}>{message}</span>
        </h3>
      </div>
    ))
  }

  return (
    <>
      <Grid
        container
        spacing={0}
        id="app-container"
      >
        <Grid item xs={4}>
          <section id="user-list">
            <main id="user-display">
              <h1>User list</h1>
              {renderActiveUserList()}
            </main>
          </section>
        </Grid>

        <Grid item xs={8}>
          <section id="chat-window">
            <main id="chat-display">
              {renderChat()}
              <span ref={dummy}></span>
            </main>

            <form onSubmit={onMessageSubmit}>
              <input placeholder="say something nice" onChange={e => onTextChange(e)} value={message} />
              <button type="submit">🕊️</button>
            </form>
            <span id="error-message">{inputErrorMsg === "" ? "" : inputErrorMsg}</span>
          </section>
        </Grid>

      </Grid>



    </>
    /*
    <Grid
      container
      spacing={0}
      id="chat-container"
    >
      <Grid item xs={3} id="user-list">
        <h1> Online Users </h1>
        <Grid container
          direction="column"
          justify="center"
          alignItems="center"
        >
          {renderActiveUserList()}
        </Grid>
      </Grid>

      <Grid item xs={9}>
        <Grid container id="chat-and-msg">
          <Grid item xs={12} id="chat-window">
            {renderChat()}

          </Grid>


          <Grid item xs={12} id="new-message-container">

            {
              <form onSubmit={onMessageSubmit} style={{ height: "100%" }}>
                <Grid container spacing={0} style={{ height: "100%" }}>
                  <Grid item xs={10}>
                    <TextField
                      error={inputErrorMsg === "" ? false : true}
                      helperText={inputErrorMsg}
                      name="message"
                      onChange={e => onTextChange(e)}
                      value={message}
                      label="Message"
                      fullWidth
                      className={"text-area"}
                      variant="outlined"

                    />

                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      endIcon={<SendIcon />}
                      type="submit"
                      fullWidth
                      className={"text-area"}
                    >
                      Send
                  </Button>

                  </Grid>

                </Grid>
              </form>
            }
          </Grid>
        </Grid>
      </Grid>



    </Grid>
    */
  );
}

export default App;
