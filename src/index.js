import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const resizeObserverErr = /ResizeObserver loop completed/;
const resizeObserverWarn = /ResizeObserver loop limit exceeded/;

const ignoreResizeObserverError = (e) => {
  if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
    e.stopImmediatePropagation();
  }
};

window.addEventListener("error", ignoreResizeObserverError);

window.addEventListener('error', (e) => {
  if (resizeObserverErr.test(e.message)) {
    e.stopImmediatePropagation();
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (resizeObserverErr.test(e.reason?.message)) {
    e.stopImmediatePropagation();
  }
});


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
