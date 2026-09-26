export interface PermissionDefinition {
  /** Posición del bit dentro del bitmask (Server-Roles-Core-Service, core/permissions.py). */
  bit: number
  name: string
  desc: string
}

export interface PermissionCategory {
  category: string
  permissions: PermissionDefinition[]
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: 'General',
    permissions: [
      { bit: 20, name: 'Administrador', desc: 'Otorga todos los permisos y omite los chequeos.' },
      { bit: 3, name: 'Gestionar servidor', desc: 'Editar la configuración del servidor.' },
      { bit: 2, name: 'Gestionar roles', desc: 'Crear, editar y eliminar roles.' },
      { bit: 1, name: 'Gestionar canales', desc: 'Crear, editar y eliminar canales.' },
      { bit: 0, name: 'Ver canales', desc: 'Ver los canales del servidor.' },
    ],
  },
  {
    category: 'Miembros',
    permissions: [
      { bit: 6, name: 'Crear invitaciones', desc: 'Crear invitaciones al servidor.' },
      { bit: 4, name: 'Expulsar miembros', desc: 'Expulsar miembros del servidor.' },
      { bit: 5, name: 'Banear miembros', desc: 'Banear miembros del servidor.' },
      { bit: 7, name: 'Cambiar apodo', desc: 'Cambiar el propio apodo.' },
      { bit: 8, name: 'Gestionar apodos', desc: 'Cambiar el apodo de otros miembros.' },
    ],
  },
  {
    category: 'Texto',
    permissions: [
      { bit: 9, name: 'Enviar mensajes', desc: 'Enviar mensajes en canales de texto.' },
      { bit: 11, name: 'Insertar enlaces', desc: 'Mostrar previews de los enlaces.' },
      { bit: 12, name: 'Adjuntar archivos', desc: 'Subir imágenes, videos y documentos.' },
      { bit: 13, name: 'Agregar reacciones', desc: 'Reaccionar a los mensajes.' },
      { bit: 14, name: 'Mencionar @everyone', desc: 'Mencionar a todos con @everyone y @here.' },
      { bit: 10, name: 'Gestionar mensajes', desc: 'Editar o eliminar mensajes de otros.' },
    ],
  },
  {
    category: 'Voz',
    permissions: [
      { bit: 15, name: 'Conectar', desc: 'Conectarse a canales de voz.' },
      { bit: 16, name: 'Hablar', desc: 'Hablar en canales de voz.' },
      { bit: 17, name: 'Silenciar miembros', desc: 'Silenciar a otros en voz.' },
      { bit: 18, name: 'Ensordecer miembros', desc: 'Ensordecer a otros en voz.' },
      { bit: 19, name: 'Mover miembros', desc: 'Mover miembros entre canales de voz.' },
    ],
  },
]

export function hasPermission(bitmask: number, bit: number): boolean {
  return ((bitmask >> bit) & 1) === 1
}

export function togglePermission(bitmask: number, bit: number): number {
  return bitmask ^ (1 << bit)
}
