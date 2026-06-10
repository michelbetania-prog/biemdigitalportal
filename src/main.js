import { createElement, StrictMode } from './mini-react.js';
import { createRoot } from './mini-react.js';
import App from './App.js';
createRoot(document.getElementById('root')).render(createElement(StrictMode, null,
    createElement(App, null)));
