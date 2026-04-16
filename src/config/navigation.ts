import { otActionItems, otModuleMenuIds } from './otModule'

const OT_FULL_ACCESS_MENU_ID = 2
const otModuleAccessMenuIds = Array.from(new Set([...otModuleMenuIds, OT_FULL_ACCESS_MENU_ID]))

export type NavigationItem = {
  label: string
  to: string
  routePatterns: string[]
  requiredMenuIds?: number[]
  requiredAnyMenuIds?: number[]
  requiredMenuNames?: string[]
  requiredAnyMenuNames?: string[]
  adminOnly?: boolean
  showInSidebar?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Gestion de OTs',
    to: '/GestionOTs',
    routePatterns: ['/GestionOTs', '/ot'],
    requiredAnyMenuIds: otModuleAccessMenuIds,
  },
  ...otActionItems.map((action) => ({
    label: action.label,
    to: action.to,
    routePatterns: action.routePatterns,
    requiredAnyMenuIds: [action.requiredMenuId, OT_FULL_ACCESS_MENU_ID],
    showInSidebar: false,
  })),
  {
    label: 'Cargo Usuario No Realizado',
    to: '/cu-no-realizado',
    routePatterns: ['/cu-no-realizado', '/cu-no-realizado/nuevo', '/cu-no-realizado/:id'],
    requiredMenuIds: [54],
  },
  {
    label: 'Conformacion de cuadrillas',
    to: '/supervisor/conformacion-cuadrilla',
    routePatterns: [
      '/supervisor/conformacion-cuadrilla',
      '/supervisor/conformacion-cuadrilla/ver',
      '/supervisor/conformacion-cuadrilla/crear',
      '/supervisor/conformacion-cuadrilla/editar',
    ],
    requiredAnyMenuNames: ['tsm_conformacioncuadrillas'],
    requiredAnyMenuIds: [1, 62],
  },
  {
    label: 'Pool de Privilegios',
    to: '/admin/privilegios',
    routePatterns: ['/admin/privilegios'],
    requiredAnyMenuNames: ['tsm_privilegios'],
    requiredAnyMenuIds: [3],
  },
]
