import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative h-[100dvh] overflow-hidden lg:grid lg:grid-cols-[17rem_1fr]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <div className="px-4 pt-4 lg:px-7 lg:pt-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="bento-main min-h-0 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
