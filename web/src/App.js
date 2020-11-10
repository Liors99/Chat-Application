import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Grid from '@material-ui/core/Grid';
import SendIcon from '@material-ui/icons/Send';

import './App.css';

const socket = io.connect("https://lior-chatapp-server.herokuapp.com/");

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
      socket.emit('cookie username', { "username": cookieValue });
    }
    else {
      socket.emit('cookie username', { "username": null });
    }

    //Handle new user
    socket.on('user connect', (data) => {
      setActiveUsers((oldUsers) => ({ ...oldUsers, [data.username]: data.att }));
    });


    //Handle user disconnect
    socket.on('user disconnect', (username) => {
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

      //Date formatting (convert UTC time to local time)
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: 'numeric' };
      const local_time = new Date(data.ts);
      const ts = local_time.toLocaleDateString("en-US", options);
      const id = data.id;

      setChat(oldChat => [...oldChat, { username: username, att: att, message: message, ts: ts, id: id }]);
      dummy.current.scrollIntoView({ behavior: 'smooth' });
    });

    socket.on('message log', (data) => {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: 'numeric' };
      for (let dataItem of data) {
        let local_ts = new Date(dataItem.ts);
        dataItem.ts = local_ts.toLocaleDateString("en-US", options);
      }
      setChat(data);
      dummy.current.scrollIntoView();
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
        else if (msg_ar[1] === "") {
          setInputErrorMsg("Name cannot be empty");
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

      //Check if not empty
      if (message !== "") {
        //Parse any emojis
        let parsed_msg = parseEmojisMsg(message);
        socket.emit('message', { username: thisName, message: parsed_msg });
        setMessage("");
        setInputErrorMsg("");
      }

    }

  }

  const renderActiveUserList = () => {
    let ret = [];
    for (let user in activeUsers) {
      const user_color = activeUsers[user]["color"];
      ret.push(
        <Grid item xs={12}>
          <h2 className="user-display" style={{ color: user_color }}>{user}{user === thisName ? " (You)" : ""}</h2>
        </Grid>
      );
    }

    return ret;

  }

  const renderChat = () => {
    return chat.map(({ username, att, message, ts, id }, index) => (
      <div key={index} className="no-text-overflow">
        <h2 style={{ "color": att["color"], fontSize: "1.2rem" }}>
          {username} <span className="chat-message-ts"> {ts}</span>
        </h2>
        <div className="chat-message no-text-overflow" style={{ width: "100%" }}>
          <span style={{ fontWeight: (id === sockid ? "bold" : "normal") }}>{message}</span>
        </div>

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
              <h1 id="user-list-title">Online - {Object.keys(activeUsers).length}</h1>
              {renderActiveUserList()}
            </main>
          </section>
        </Grid>

        <Grid item xs={8}>
          <section id="chat-window">
            <main id="chat-display">
              {renderChat()}
              <div ref={dummy} id="last-message"></div>
            </main>

            <form onSubmit={onMessageSubmit}>
              <input placeholder="Message" onChange={e => onTextChange(e)} value={message} />
              <button type="submit"><SendIcon /></button>
            </form>
            <span id="error-message">{inputErrorMsg === "" ? "" : inputErrorMsg}</span>
          </section>
        </Grid>

      </Grid>



    </>
  );
}

export default App;
