import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./Fonts/fonts.css";
import 'bootstrap/dist/css/bootstrap.min.css';

/* Disable right-click only for images */
document.addEventListener("contextmenu", function (e) {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});


ReactDOM.createRoot(document.getElementById("root")).render(<App />);
