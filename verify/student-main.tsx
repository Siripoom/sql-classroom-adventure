import React from 'react';
import {createRoot} from 'react-dom/client';
import '../src/style.css';
import {StudentApp} from '../src/student/StudentApp';

createRoot(document.getElementById('root')!).render(<React.StrictMode><StudentApp/></React.StrictMode>);
