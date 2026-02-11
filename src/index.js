import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// COMPLETE ResizeObserver suppression - suppress ALL ResizeObserver errors silently
window.addEventListener("error", (e) => {
  if (e.message?.includes("ResizeObserver") || e.error?.message?.includes("ResizeObserver")) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }
}, true);

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message?.toString() || "";
  if (msg.includes("ResizeObserver")) {
    e.preventDefault();
  }
}, true);

// Patch console to suppress ResizeObserver
const originalError = console.error;
console.error = function(...args) {
  const msg = args.join(" ");
  if (msg.includes("ResizeObserver")) return;
  originalError.apply(console, args);
};

const originalWarn = console.warn;
console.warn = function(...args) {
  const msg = args.join(" ");
  if (msg.includes("ResizeObserver")) return;
  originalWarn.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
     <App />
);

reportWebVitals();
