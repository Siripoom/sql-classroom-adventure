import React from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {TeacherPortal} from './TeacherPortal';
import {StudentApp} from './student/StudentApp';

createRoot(document.getElementById('root')!).render(<React.StrictMode><TeacherPortal><StudentApp/></TeacherPortal></React.StrictMode>);
