export {
  PRODUCTION_CONNECTION_NOT_CONFIGURED,
  getBackendEnvironmentStatus,
  getProductionConnectionStatus,
  getSupabasePublicConfig,
  isProductionBackendConfigured,
  type BackendEnvironmentStatus,
} from './config'
export {
  isDemoBackendMode,
  isDemoLoginAllowed,
  isRealBackendMode,
  shouldPersistSensitiveLocalStorage,
} from './mode'
