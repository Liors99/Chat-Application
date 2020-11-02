import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';

import './App.css';

const socket = io.connect("http://localhost:4000");

function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);


  useEffect(() => {

    //Handle new user
    socket.on('user connect', (username) => {
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
      setName(username);
    });
  }, []);

  const onTextChange = (e) => {
    setMessage(e.target.value);
  }

  const onMessageSubmit = (e) => {
    e.preventDefault();
    socket.emit('message', { name, message });
    setMessage("");
  }

  const renderActiveUserList = () => {
    return activeUsers.map(username => (
      <Grid item xs={12}>
        <h2>{username} {username === name ? "(You)" : ""}</h2>
      </Grid>
    ))


  }

  const renderChat = () => {
    return chat.map(({ name, user_obj, message }, index) => (
      <div key={index}>
        <h3>
          {name}: <span style={{ "color": user_obj["color"] }}>{message}</span>
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
