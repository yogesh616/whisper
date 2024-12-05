
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Profile from './components/Profile.jsx'
import { UserProvider } from './Context/Context.jsx'
import Chat from './components/Chat.jsx'

createRoot(document.getElementById('root')).render(
 <UserProvider>
  <BrowserRouter>
 <Routes>
   <Route path="/" element={<App />} />
   <Route path="profile" element={<Profile />} />
   <Route path="chat/:id" element={<Chat />} />
 </Routes>
 </BrowserRouter>
 </UserProvider>
)
