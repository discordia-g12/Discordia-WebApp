/** DTO de rol retornado por Server-Roles-Core-Service. */
export interface RoleBackendResponse {
  id: string
  name: string
  color: string | null
  position: number
  permissions_bitmask: number
  is_default: boolean
}

/** Rol de un servidor, en el modelo de dominio del cliente mobile. */
export interface Role {
  id: string
  name: string
  color: string | null
  position: number
  permissionsBitmask: number
  isDefault: boolean
}
