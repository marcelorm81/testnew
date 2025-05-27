/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
