export type NavigationItem = {
  label: string
  to: string
  routePatterns: string[]
  requiredPageNames?: string[]
  requiredAnyPageNames?: string[]
  allowedRoles?: string[]
  showInSidebar?: boolean
  sidebarLabelFromMenu?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Gestion de Ordenes de Trabajo',
    to: '/ot',
    routePatterns: ['/ot'],
    requiredAnyPageNames: [
      'OtDashboardPage',
      'OtListPage',
      'OtDetailPage',
      'OtCreatePage',
      'OtRealizadaPage',
      'RegistrarOTAgendaPage',
      'OtModificarPage',
      'OtModificarFechaPage',
      'OtAnularPage',
      'CuNoRealizadoListPage',
      'CuNoRealizadoCreatePage',
      'CuNoRealizadoDetailPage',
    ],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Ordenes pendientes',
    to: '/ot/lista',
    routePatterns: ['/ot/lista', '/ot/:id'],
    requiredAnyPageNames: ['OtListPage', 'OtDetailPage'],
    showInSidebar: false,
  },
  {
    label: 'Crear OT',
    to: '/ot/crear',
    routePatterns: ['/ot/crear'],
    requiredAnyPageNames: ['OtCreatePage'],
    showInSidebar: false,
  },
  {
    label: 'RegistrarOrdenAgenda_Detalle',
    to: '/ot/RegistrarOrdenAgenda_Detalle',
    routePatterns: ['/ot/RegistrarOrdenAgenda_Detalle', '/ot/realizada'],
    requiredAnyPageNames: ['OtRealizadaPage'],
    showInSidebar: false,
  },
  {
    label: 'RegistrarOrdenAgenda',
    to: '/ot/RegistrarOrdenAgenda',
    routePatterns: ['/ot/RegistrarOrdenAgenda'],
    requiredAnyPageNames: ['RegistrarOTAgendaPage'],
    showInSidebar: false,
  },
  {
    label: 'Modificar OT',
    to: '/ot/modificar',
    routePatterns: ['/ot/modificar'],
    requiredAnyPageNames: ['OtModificarPage'],
    showInSidebar: false,
  },
  {
    label: 'Modificar fecha OT',
    to: '/ot/modificar-fecha',
    routePatterns: ['/ot/modificar-fecha'],
    requiredAnyPageNames: ['OtModificarFechaPage'],
    showInSidebar: false,
  },
  {
    label: 'Anular OT',
    to: '/ot/anular',
    routePatterns: ['/ot/anular'],
    requiredAnyPageNames: ['OtAnularPage'],
    showInSidebar: false,
  },
  {
    label: 'CuNoRealizado Lista',
    to: '/cu-no-realizado',
    routePatterns: ['/cu-no-realizado'],
    requiredAnyPageNames: ['CuNoRealizadoListPage'],
    showInSidebar: false,
  },
  {
    label: 'CuNoRealizado Crear',
    to: '/cu-no-realizado/nuevo',
    routePatterns: ['/cu-no-realizado/nuevo'],
    requiredAnyPageNames: ['CuNoRealizadoCreatePage'],
    showInSidebar: false,
  },
  {
    label: 'CuNoRealizado Detalle',
    to: '/cu-no-realizado/:id',
    routePatterns: ['/cu-no-realizado/:id'],
    requiredAnyPageNames: ['CuNoRealizadoDetailPage'],
    showInSidebar: false,
  },
  {
    label: 'Cuadrillas',
    to: '/supervisor/conformacion-cuadrilla',
    routePatterns: [
      '/supervisor/conformacion-cuadrilla',
      '/supervisor/conformacion-cuadrilla/ver',
      '/supervisor/conformacion-cuadrilla/crear',
      '/supervisor/conformacion-cuadrilla/editar',
    ],
    requiredAnyPageNames: ['ConformacionCuadrillaPage'],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Llamada de Atencion',
    to: '/supervisor/llamada-atencion',
    routePatterns: ['/supervisor/llamada-atencion'],
    requiredAnyPageNames: ['LlamadaAtencionPage', 'LlamadaAtencionPrincipal'],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Supervision',
    to: '/supervisor/supervision',
    routePatterns: ['/supervisor/supervision'],
    allowedRoles: ['supervisor'],
    sidebarLabelFromMenu: false,
  },
  {
    label: 'NPS',
    to: '/nps',
    routePatterns: ['/nps'],
    allowedRoles: ['tecnico', 'supervisor', 'central', 'sistemas', 'admin'],
    showInSidebar: true,
  },
  {
    label: 'Central Grupos',
    to: '/central/grupos',
    routePatterns: ['/central/grupos'],
    allowedRoles: ['central'],
    showInSidebar: true,
  },
  {
    label: 'Pool de Privilegios',
    to: '/admin/privilegios',
    routePatterns: ['/admin/privilegios'],
    requiredAnyPageNames: ['PrivilegiosPage'],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Prueba',
    to: '/prueba',
    routePatterns: ['/prueba'],
    requiredAnyPageNames: ['PruebaPage'],
    sidebarLabelFromMenu: true,
  },
]
