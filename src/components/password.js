import React, { useState } from "react";
import "../styles/password.css";
import {Icon} from 'react-icons-kit';
import {eyeOff} from 'react-icons-kit/feather/eyeOff';
import {eye} from 'react-icons-kit/feather/eye'

function Password({onPasswordTextChanged, ...props}){
  const [passwordShown, setPasswordShown] = useState(false);

  return (<>
    <div className="passwordInput">
      <input 
        type={(passwordShown) ? "text" : "password"}
        onChange={(event) => onPasswordTextChanged(event.target.value)} 
        className="easy-nput"
        {...props}
      />
      <span className="id" onClick={(_) => setPasswordShown(!passwordShown)}>
        <Icon icon={(passwordShown)
          ? eye
          : eyeOff
        }/>
      </span>
    </div>
  </>);
}

export default Password
