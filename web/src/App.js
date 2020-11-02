import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';

import './App.css';

const socket = io.connect("http://localhost:4000");

function App() {
  const [thisName, setThisName] = useState("");
  const [message, setMessage] = useState("");
  const [inputErrorMsg, setInputErrorMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);


  useEffect(() => {

    //Handle new user
    socket.on('user connect', (username, username_obj) => {
      console.log("Connected user: " + username);
      setActiveUsers(oldUsers => [...oldUsers, username]);
    });

    //Handle user disconnect
    socket.on('user disconnect', (username) => {
      console.log("Disconnected user: " + username);
      setActiveUsers(oldUsers => oldUsers.filter(val => val !== username));
    });

    socket.on('message', ({ name, user_obj, message }) => {
      setChat(oldChat => [...oldChat, { name, user_obj, message }]);
    });

    socket.on('set username', (username) => {
      setThisName(username);
    });
  }, []);

  const onTextChange = (e) => {
    setMessage(e.target.value);
  }

  const onMessageSubmit = (e) => {
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
        socket.emit('set color', { thisName, color });

        setInputErrorMsg("");
        setMessage("");
      }
      else {
        setInputErrorMsg("Invalid command");
      }
    }
    else {
      //Otherwise it is a normal message
      socket.emit('message', { thisName, message });
      setMessage("");
    }

  }

  const renderActiveUserList = () => {
    return activeUsers.map(username => (
      <Grid item xs={12}>
        <h2>{username} {username === thisName ? "(You)" : ""}</h2>
      </Grid>
    ))


  }

  const renderChat = () => {
    return chat.map(({ name, user_obj, message }, index) => (
      <div key={index}>
        <h3 style={{ "color": user_obj["color"] }}>
          {name}: <span style={{ color: "black" }}>{message}</span>
        </h3>
      </div>
    ))
  }

  return (
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
                      rows={1}
                      multiline
                      fullWidth
                      className={"text-area"}


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
  );
}

export default App;
