import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Modal from '../common/Modal'
import Sidebar from './Sidebar'
import CierreJornadaForm from '../tecnico/CierreJornadaForm'
import { fetchCierreJornadaEstado } from '../../api/inicioJornadaApi'
import { useAuth } from '../../context/AuthContext'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openCierreModal, setOpenCierreModal] = useState(false)
  const { roleId, roleName } = useAuth()
  const roleNormalized = roleName.trim().toLowerCase()
  const isTecnico = roleId === 8 || roleNormalized === 'tecnico'

  const cierreEstadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'cierre-estado'],
    queryFn: fetchCierreJornadaEstado,
    enabled: isTecnico,
    refetchInterval: 30_000,
  })

  return (
    <div className="relative h-[100dvh] overflow-hidden lg:grid lg:grid-cols-[19rem_1fr]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        showCierreJornada={Boolean(isTecnico && cierreEstadoQuery.data?.requiereCierre)}
        onCierreJornadaClick={() => setOpenCierreModal(true)}
      />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <div className="px-4 pt-4 lg:px-7 lg:pt-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="bento-main min-h-0 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
      <Modal
        open={openCierreModal}
        onClose={() => setOpenCierreModal(false)}
        title="Cierre de jornada"
        maxWidthClass="max-w-3xl"
      >
        <CierreJornadaForm submitLabel="Registrar cierre" onClosed={() => setOpenCierreModal(false)} />
      </Modal>
    </div>
  )
}

export default MainLayout
