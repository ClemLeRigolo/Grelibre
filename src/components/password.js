import React, { useState } from "react";
import { TextInput } from "carbon-components-react";
import { View, ViewOff } from "@carbon/icons-react";
import "../styles/password.css";

function Password({ onPasswordTextChanged, labelText, placeholder, required, name }) {
  const [passwordShown, setPasswordShown] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordShown(!passwordShown);
  };

  const handleChange = (event) => {
    onPasswordTextChanged(event.target.value);
  };

  return (
    <div className="carbon-password-wrapper">
      <TextInput
        id={name}
        name={name}
        labelText={labelText}
        placeholder={placeholder}
        type={passwordShown ? "text" : "password"}
        onChange={handleChange}
        required={required}
        className="carbon-password-input"
      />
      <button 
        type="button"
        className="carbon-password-toggle"
        onClick={togglePasswordVisibility}
        aria-label={passwordShown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {passwordShown ? (
          <View size={20} className="carbon-password-icon" />
        ) : (
          <ViewOff size={20} className="carbon-password-icon" />
        )}
      </button>
    </div>
  );
}

export default Password;