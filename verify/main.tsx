import React from 'react';
import {createRoot} from 'react-dom/client';
import '../src/style.css';
import {Dashboard} from '../src/teacher/Dashboard';

createRoot(document.getElementById('root')!).render(<Dashboard email="teacher@example.com" leaving={false} logoutError="" onLogout={()=>undefined}/>);
