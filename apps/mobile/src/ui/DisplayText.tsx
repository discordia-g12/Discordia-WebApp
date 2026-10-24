import React, { useEffect, useRef, useState } from 'react'
import { Animated, Platform, Pressable, StyleSheet, Text as RNText, View, type LayoutChangeEvent } from 'react-native'
import { textStyles } from '@discordia/tokens'
import { useTheme } from '../theme'
import { distance, useRise } from './motion'

interface DisplayTextProps {
  children: string
  /**
   * nav: palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE, el menú de ajustes).
   * watermark: el contexto en gigante ("AMIGOS", el servidor); en mobile es el encabezado de cada pantalla.
   */
  variant?: 'nav' | 'watermark'
  /** nav: la palabra de la vista actual (en el color del texto; las demás, en gris). */
  active?: boolean
  /** nav: con onPress es un botón. */
  onPress?: () => void
  /** watermark: tinta (por defecto, el título de la pantalla), cielo (servidor) o gris (en llamada). */
  tone?: 'ink' | 'sky' | 'muted'
  /** watermark: tamaño máximo en px (por defecto, el mínimo del token: 72). */
  maxSize?: number
  testID?: string
}

/** Texto gigante del rediseño: navegación o marca de agua. Misma API que el de la web. */
export function DisplayText({ children, variant = 'nav', active = false, onPress, tone = 'ink', maxSize, testID }: DisplayTextProps) {
  if (variant === 'watermark') {
    return <Watermark text={children} tone={tone} maxSize={maxSize} />
  }

  const content = <RisingLetters text={children} active={active} />
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={children}
        accessibilityState={{ selected: active }}
        testID={testID}
        hitSlop={4}
      >
        {content}
      </Pressable>
    )
  }
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={children} testID={testID}>
      {content}
    </View>
  )
}

/**
 * Cuando la palabra pasa a ser la activa, sus letras suben una tras otra mientras se oscurece. No anima
 * al montarse (solo al cambiar), ni con movimiento reducido. Las letras son decorativas: el texto
 * entero es el nombre accesible de quien las contiene.
 */
function RisingLetters({ text, active }: { text: string; active: boolean }) {
  const theme = useTheme()
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])
  const rise = mounted.current && active
  const style = [theme.text.display, { color: active ? theme.colors.text : theme.colors.textDisplayInactive }]

  let index = 0
  return (
    // La clave cambia al activarse: las letras se vuelven a montar y arrancan desde abajo
    <View key={active ? 'on' : 'off'} style={styles.words} importantForAccessibility="no-hide-descendants">
      {text.split(' ').map((word, w) => (
        <View key={w} style={styles.word}>
          {Array.from(word).map(letter => {
            const i = index++
            return (
              <Letter key={i} delay={i * 18} rise={rise} style={style}>
                {letter}
              </Letter>
            )
          })}
          {/* El espacio entre palabras, del ancho de la fuente */}
          <RNText style={style}> </RNText>
        </View>
      ))}
    </View>
  )
}

function Letter({ children, delay, rise, style }: { children: string; delay: number; rise: boolean; style: object[] }) {
  const enter = useRise({ delay, offset: distance('rise', false) * 2, name: 'base', enabled: rise })
  return <Animated.Text style={[...style, enter]}>{children}</Animated.Text>
}

/** Por debajo de este tamaño en un renglón, la marca de agua parte en renglones por palabra. */
const ONE_LINE_MIN = 26
/** Tamaño mínimo: por debajo, una palabra muy larga se corta a la derecha. */
const MIN_SIZE = 28
/** Tamaño al que se mide el texto (el ancho escala lineal con el tamaño). */
const PROBE = 100

/**
 * Marca de agua: la palabra entera, ajustada al ancho disponible hasta su tamaño del token. Si un nombre
 * largo quedaría por debajo de ONE_LINE_MIN, parte en renglones por palabra con el tamaño que hace entrar
 * a la más larga. El ancho del texto se mide con una copia invisible a 100 px.
 */
function Watermark({ text, tone, maxSize }: { text: string; tone: 'ink' | 'sky' | 'muted'; maxSize?: number }) {
  const theme = useTheme()
  const [available, setAvailable] = useState(0)
  const [measured, setMeasured] = useState<{ line?: number; words: Record<number, number> }>({ words: {} })
  const words = text.split(/\s+/).filter(Boolean)
  const upper = text.toUpperCase()
  const color = { ink: theme.colors.text, sky: theme.colors.skyDecoration, muted: theme.colors.decoration }[tone]
  const max = maxSize ?? textStyles.watermark.minSize

  // Al cambiar el texto se vuelve a medir
  useEffect(() => setMeasured({ words: {} }), [text])

  let size = max
  let wrap = false
  if (available > 0 && measured.line) {
    const oneLine = Math.floor((available / measured.line) * PROBE)
    wrap = oneLine < ONE_LINE_MIN && words.length > 1
    const longest = Math.max(...words.map((_, i) => measured.words[i] ?? 0))
    const target = wrap && longest > 0 ? Math.floor((available / longest) * PROBE) : oneLine
    size = Math.min(max, Math.max(MIN_SIZE, target))
  }

  const base = {
    fontFamily: theme.text.watermark.fontFamily,
    letterSpacing: textStyles.watermark.letterSpacing,
  }
  const sized = (px: number) => ({
    ...base,
    fontSize: px,
    letterSpacing: textStyles.watermark.letterSpacing * px,
    // Interlineado corto: las mayúsculas quedan apoyadas sobre lo que haya debajo
    lineHeight: Math.round(px * (wrap ? 0.96 : 0.86)),
  })

  return (
    <View
      style={styles.watermark}
      onLayout={(e: LayoutChangeEvent) => setAvailable(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <SweepIn key={text}>
        <RNText
          style={[sized(size), { color }, Platform.OS === 'android' && styles.noFontPadding]}
          numberOfLines={wrap ? undefined : 1}
          ellipsizeMode="clip"
        >
          {upper}
        </RNText>
      </SweepIn>

      {/* Medición: el texto entero y cada palabra a 100 px, sin límite de ancho */}
      <View style={styles.probe} pointerEvents="none">
        <RNText
          style={[sized(PROBE), styles.probeText]}
          onLayout={e => {
            const line = e.nativeEvent.layout.width
            setMeasured(m => (m.line === line ? m : { ...m, line }))
          }}
        >
          {upper}
        </RNText>
        {words.length > 1 &&
          words.map((word, i) => (
            <RNText
              key={i}
              style={[sized(PROBE), styles.probeText]}
              onLayout={e => {
                const width = e.nativeEvent.layout.width
                setMeasured(m => (m.words[i] === width ? m : { ...m, words: { ...m.words, [i]: width } }))
              }}
            >
              {word.toUpperCase()}
            </RNText>
          ))}
      </View>
    </View>
  )
}

/** Al cambiar de contexto la palabra nueva entra con un barrido horizontal. */
function SweepIn({ children }: { children: React.ReactNode }) {
  const mounted = useRef(false)
  const enter = useRise({ axis: 'x', offset: 32, name: 'slow', enabled: mounted.current })
  useEffect(() => {
    mounted.current = true
  }, [])
  return <Animated.View style={enter}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { flexDirection: 'row' },
  watermark: { overflow: 'hidden' },
  noFontPadding: { includeFontPadding: false },
  probe: { position: 'absolute', top: 0, left: 0, width: 10000, opacity: 0 },
  probeText: { alignSelf: 'flex-start' },
})
