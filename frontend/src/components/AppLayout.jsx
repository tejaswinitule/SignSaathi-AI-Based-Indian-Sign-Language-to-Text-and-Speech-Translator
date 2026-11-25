import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Bell, Search } from 'lucide-react'
import Sidebar from './Sidebar'
export default function AppLayout() {
  const [open,setOpen] = useState(false)
  return <div className="min-h-screen bg-[#f8f7fc]">
    <Sidebar open={open} onClose={()=>setOpen(false)}/>
    <div className="lg:pl-[264px]">
      <header className="topbar">
        <button className="icon-button lg:hidden" onClick={()=>setOpen(true)}><Menu size={20}/></button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400"><Search size={16}/><span>AI-powered sign language workspace</span></div>
        <div className="ml-auto flex items-center gap-3"><span className="hidden sm:block text-xs text-slate-400">Indian Sign Language</span><button className="icon-button relative" aria-label="Notifications"><Bell size={18}/><i className="notification-dot"/></button><div className="avatar">U</div></div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9"><Outlet/></main>
    </div>
  </div>
}