import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'
import TextField from '@material-ui/core/TextField'

import './App.css';

const socket = io.connect("http://localhost:4000");

function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);


  useEffect(() => {
    socket.on('message', ({ name, message }) => {
      setChat(oldChat => [...oldChat, { name, message }]);
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
  }

  const renderChat = () => {
    return chat.map(({ name, message }, index) => (
      <div key={index}>
        <h3>
          {name}: <span>{message}</span>
        </h3>
      </div>
    ))
  }

  return (
    <div>
      {renderChat()}
      <form onSubmit={onMessageSubmit}>
        <div>
          <TextField
            name="message"
            onChange={e => onTextChange(e)}
            value={message}
            label="Message"
            //Material UI stuff
            id="outlined-multiline-static"
            variant="outlined"
          />
          <button type="submit"> Send Message </button>
        </div>

      </form>
    </div>
  );
}

export default App;
