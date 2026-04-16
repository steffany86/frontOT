export type OtActionItem = {
  key: string
  label: string
  description: string
  buttonLabel: string
  to: string
  routePatterns: string[]
  requiredMenuId: number
}

export const otActionItems: OtActionItem[] = [
  {
    key: 'pendientes',
    label: 'Ordenes pendientes',
    description: 'Consulta el listado diario de OT pendientes y su detalle.',
    buttonLabel: 'Ver pendientes',
    to: '/GestionOTs/lista',
    routePatterns: ['/GestionOTs/lista', '/GestionOTs/:id', '/ot/lista', '/ot/:id'],
    requiredMenuId: 2,
  },
  {
    key: 'crear',
    label: 'Crear OT',
    description: 'Registra una nueva orden de trabajo.',
    buttonLabel: 'Nueva OT',
    to: '/GestionOTs/crear',
    routePatterns: ['/GestionOTs/crear', '/ot/crear'],
    requiredMenuId: 2,
  },
  {
    key: 'realizada',
    label: 'RegistrarOrdenAgenda_Detalle',
    description: 'Actualiza una OT con estado y observacion.',
    buttonLabel: 'Registrar detalle',
    to: '/GestionOTs/RegistrarOrdenAgenda_Detalle',
    routePatterns: [
      '/GestionOTs/RegistrarOrdenAgenda_Detalle',
      '/GestionOTs/realizada',
      '/ot/RegistrarOrdenAgenda_Detalle',
      '/ot/realizada',
    ],
    requiredMenuId: 2,
  },
  {
    key: 'modificar',
    label: 'Modificar OT',
    description: 'Edita observacion, estado y numero de la orden.',
    buttonLabel: 'Modificar OT',
    to: '/GestionOTs/modificar',
    routePatterns: ['/GestionOTs/modificar', '/ot/modificar'],
    requiredMenuId: 2,
  },
  {
    key: 'modificar-fecha',
    label: 'Modificar fecha OT',
    description: 'Reagenda una OT validando ruta y usuario.',
    buttonLabel: 'Modificar fecha',
    to: '/GestionOTs/modificar-fecha',
    routePatterns: ['/GestionOTs/modificar-fecha', '/ot/modificar-fecha'],
    requiredMenuId: 2,
  },
  {
    key: 'anular',
    label: 'Anular OT',
    description: 'Anula ordenes de trabajo segun modo seleccionado.',
    buttonLabel: 'Anular OT',
    to: '/GestionOTs/anular',
    routePatterns: ['/GestionOTs/anular', '/ot/anular'],
    requiredMenuId: 2,
  },
]

export const otModuleMenuIds = otActionItems.map((item) => item.requiredMenuId)
