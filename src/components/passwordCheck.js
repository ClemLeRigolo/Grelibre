import React from "react";
import { CheckmarkFilled, WarningFilled } from "@carbon/icons-react";
import "../styles/passwordCheck.css";

export function PasswordCheckUnit({ valid, children }) {
  return (
    <div className={`carbon-password-rule ${valid ? 'valid' : 'invalid'}`}>
      {valid ? (
        <CheckmarkFilled size={16} className="carbon-password-icon success" />
      ) : (
        <WarningFilled size={16} className="carbon-password-icon error" />
      )}
      <span className="carbon-password-rule-text">{children}</span>
    </div>
  );
}

export default function PasswordCheck({ props }) {
  return (
    <div className="carbon-password-checker">
      <PasswordCheckUnit valid={props.length}>
        Longueur minimale de 8 caractères
      </PasswordCheckUnit>
      <PasswordCheckUnit valid={props.uppercase}>
        Au moins une lettre majuscule
      </PasswordCheckUnit>
      <PasswordCheckUnit valid={props.lowercase}>
        Au moins une lettre minuscule
      </PasswordCheckUnit>
      <PasswordCheckUnit valid={props.specialChar}>
        Au moins un caractère spécial
      </PasswordCheckUnit>
    </div>
  );
}