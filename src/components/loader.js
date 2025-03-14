import React from "react";
import { InlineLoading } from "carbon-components-react";

import "../styles/loader.css";

export default function Loader({ description = "Chargement..." }) {
  return (
    <div className="carbon-loader-container">
      <InlineLoading 
        description={description} 
        status="active"
        iconDescription="Chargement" 
      />
    </div>
  );
}
