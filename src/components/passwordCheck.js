import React from "react";
import validImg from "../images/validate.png";
import errorImg from "../images/error.png";


import "../styles/passwordCheck.css";

export function PasswordCheckUnit({valid, children}) {
  const srcImg = (valid) 
    ? validImg
    : errorImg
  const altImg = (valid)
    ? "Valid"
    : "Invalid";

  return (<div className="password-rules">
    <span className="valid">
      <img src={srcImg} alt={altImg} className="icon" />
    </span>
    <p className="password-rule">{children}</p>
  </div>);
}

export default function PasswordCheck({props}) {
  return <div className="passwordChecker">
    <PasswordCheckUnit valid={props.length}>Longueur minimale de 8 caractères</PasswordCheckUnit>
    <PasswordCheckUnit valid={props.uppercase}>Au moins une lettre majuscule</PasswordCheckUnit>
    <PasswordCheckUnit valid={props.lowercase}>Au moins une lettre minuscule</PasswordCheckUnit>
    <PasswordCheckUnit valid={props.specialChar}>Au moins un caractère spécial</PasswordCheckUnit>
  </div>;
}
