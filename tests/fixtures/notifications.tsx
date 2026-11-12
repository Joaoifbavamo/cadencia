import React from 'react';import {createRoot} from 'react-dom/client';import NotificationSettings from '../../src/NotificationSettings.tsx';import '../../src/styles.css';
const choice=new URLSearchParams(location.search).get('theme');document.documentElement.dataset.theme=choice==='dark'?'dark':'light';
createRoot(document.getElementById('fixture')!).render(<div className="public-install"><h1>Ajustes</h1><NotificationSettings demo={false} onInstall={()=>{}}/></div>);
