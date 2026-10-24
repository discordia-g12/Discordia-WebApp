import React from 'react'
import { Pressable, View } from 'react-native'
import { useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { Toast as ToastStrip } from '../../ui'

/**
 * Aviso de la app: la tira negra apoyada sobre lo que haya abajo (la barra de escritura, la llamada o la
 * barra inferior), del ancho de la pantalla. Tocarla la cierra. Se monta dentro de la columna de
 * contenido, que la posiciona al pie.
 */
export default function Toast() {
  const styles = useStyles()
  const { toast, dismissToast } = useUI()
  if (!toast) return null
  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable onPress={dismissToast} accessibilityHint="Tocá para cerrar">
        {/* La clave hace que un aviso nuevo vuelva a entrar desde abajo */}
        <ToastStrip key={toast.id} message={toast.message} tone={toast.type === 'error' ? 'error' : 'default'} />
      </Pressable>
    </View>
  )
}

const useStyles = makeStyles(() => ({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 999 },
}))
