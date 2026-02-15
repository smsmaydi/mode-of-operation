import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Prevent ResizeObserver loop: run callback in next frame so it doesn't fire during layout
if (typeof window.ResizeObserver !== "undefined") {
  const Original = window.ResizeObserver;
  window.ResizeObserver = class extends Original {
    constructor(callback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
}

// Suppress any remaining ResizeObserver error messages
window.addEventListener("error", (e) => {
  if (e.message?.includes("ResizeObserver") || e.error?.message?.includes("ResizeObserver")) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return true;
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
