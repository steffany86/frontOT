import { useState } from 'react'
import FormCard from '../components/common/FormCard'
import PageLayout, { PagePanel, PageTabs } from '../components/common/PageLayout'
import type { ConfigCatalogoKey } from '../api/supervisionV2Api'
import { useAuth } from '../context/AuthContext'
import { CatalogoPanel, normalizeRole } from './SupervisionV2ConfiguracionPage'

const PESTANAS: Array<{ key: ConfigCatalogoKey; label: string; singular: string }> = [
  { key: 'tipo-comunicacion', label: 'Tipo comunicación', singular: 'tipo de comunicación' },
  { key: 'motivo-llamada', label: 'Motivo', singular: 'motivo' },
]

const ROLES_PERMITIDOS = ['backoffice', 'backofficev', 'sistemas']

const SeguimientoControlConfPage = () => {
  const { usuario, roleName } = useAuth()
  const [activa, setActiva] = useState<ConfigCatalogoKey>('tipo-comunicacion')
  const pestana = PESTANAS.find((p) => p.key === activa) ?? PESTANAS[0]
  const permitido = ROLES_PERMITIDOS.includes(normalizeRole(roleName || usuario?.rol))

  if (!permitido) {
    return (
      <FormCard title="Seguimiento y Control Conf">
        <p className="font-semibold text-red-600">Solo BackOffice y Sistemas pueden administrar esta sección.</p>
      </FormCard>
    )
  }

  return (
    <PageLayout
      title="Seguimiento y Control Conf"
      tabs={<PageTabs items={PESTANAS.map((p) => ({ id: p.key, label: p.label }))} activeId={activa} onChange={(id) => setActiva(id as ConfigCatalogoKey)} />}
    >
      <PagePanel>
        <CatalogoPanel key={pestana.key} catalogo={pestana.key} singular={pestana.singular} />
      </PagePanel>
    </PageLayout>
  )
}

export default SeguimientoControlConfPage
