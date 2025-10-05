import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const resizeObserverErr = /ResizeObserver loop completed/;
const resizeObserverWarn = /ResizeObserver loop limit exceeded/;

console.error = (function (orig) {
  return function (...args) {
    if (typeof args[0] === "string" && args[0].includes("ResizeObserver")) return;
    orig(...args);
  };
})(console.error);



const handler = (e) => {
  if (resizeObserverErr.test(e.message) || resizeObserverWarn.test(e.message)) {
    e.stopImmediatePropagation();
    console.warn("⚠️ Suppressed ResizeObserver error:", e.message);
    return;
  }
};

window.addEventListener("error", handler);
window.addEventListener("unhandledrejection", (e) => {
  if (resizeObserverErr.test(e.reason?.message)) {
    e.stopImmediatePropagation();
    console.warn("⚠️ Suppressed ResizeObserver rejection:", e.reason?.message);
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
     <App />
);

reportWebVitals();
