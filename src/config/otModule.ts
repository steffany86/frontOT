export type OtActionItem = {
  key: string
  label: string
  description: string
  buttonLabel: string
  to: string
  routePatterns: string[]
  requiredAnyPageNames: string[]
  requiredMenuId: number
}

export const otActionItems: OtActionItem[] = [
  {
    key: 'pendientes',
    label: 'Ordenes pendientes',
    description: 'Consulta el listado diario de OT pendientes y su detalle.',
    buttonLabel: 'Ver pendientes',
    to: '/ot/lista',
    routePatterns: ['/ot/lista', '/ot/:id'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredMenuId: 2,
  },
  {
    key: 'crear',
    label: 'Crear OT',
    description: 'Registra una nueva orden de trabajo.',
    buttonLabel: 'Nueva OT',
    to: '/ot/crear',
    routePatterns: ['/ot/crear'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredMenuId: 2,
  },
  {
    key: 'realizada',
    label: 'RegistrarOrdenAgenda_Detalle',
    description: 'Actualiza una OT con estado y observacion.',
    buttonLabel: 'Registrar detalle',
    to: '/ot/RegistrarOrdenAgenda_Detalle',
    routePatterns: ['/ot/RegistrarOrdenAgenda_Detalle', '/ot/realizada'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredMenuId: 2,
  },
  {
    key: 'modificar-fecha',
    label: 'Modificar fecha OT',
    description: 'Reagenda una OT validando ruta y usuario.',
    buttonLabel: 'Modificar fecha',
    to: '/ot/modificar-fecha',
    routePatterns: ['/ot/modificar-fecha'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredMenuId: 2,
  },
  {
    key: 'anular',
    label: 'Anular OT',
    description: 'Anula ordenes de trabajo segun modo seleccionado.',
    buttonLabel: 'Anular OT',
    to: '/ot/anular',
    routePatterns: ['/ot/anular'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredMenuId: 2,
  },
]

export const otModuleMenuIds = otActionItems.map((item) => item.requiredMenuId)
