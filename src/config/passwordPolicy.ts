const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return fallback
}

const parseDays = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

export const passwordPolicyConfig = {
  requireByFlag: parseBoolean(import.meta.env.VITE_PASSWORD_POLICY_REQUIRE_BY_FLAG, true),
  maxAgeDays: parseDays(import.meta.env.VITE_PASSWORD_POLICY_MAX_AGE_DAYS, 0),
  changePasswordEndpoint: (import.meta.env.VITE_PASSWORD_CHANGE_ENDPOINT || '/auth/cambiar-password').trim(),
}

export const shouldForcePasswordChange = (params: { necesitaCambio?: boolean; ultimaModificacion?: string }): boolean => {
  const { necesitaCambio, ultimaModificacion } = params

  if (passwordPolicyConfig.requireByFlag && necesitaCambio) {
    return true
  }

  if (passwordPolicyConfig.maxAgeDays <= 0) {
    return false
  }

  if (!ultimaModificacion) {
    return false
  }

  const lastUpdated = new Date(ultimaModificacion)
  if (Number.isNaN(lastUpdated.getTime())) {
    return false
  }

  const diffMs = Date.now() - lastUpdated.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  return diffDays > passwordPolicyConfig.maxAgeDays
}
