import type { SendFormInit } from '@discordia/core'

/**
 * Envío de formularios con archivos para core (configureClient({ sendForm })), con XMLHttpRequest: el
 * fetch global de Expo rechaza el { uri, name, type } de React Native con "Unsupported FormDataPart
 * implementation". Token, reintento del 401 y errores siguen en core: esto solo reemplaza el transporte.
 * No se setea Content-Type: XMLHttpRequest le agrega el boundary solo.
 */
export function sendFormWithXhr(url: string, { method, headers, body, signal }: SendFormInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.setRequestHeader('Accept', 'application/json')

    const onAbort = () => xhr.abort()
    signal.addEventListener('abort', onAbort)
    const done = () => signal.removeEventListener('abort', onAbort)

    xhr.onload = () => {
      done()
      // status 0: el pedido no llegó a una respuesta (sin red, CORS, certificado)
      if (xhr.status === 0) return reject(new Error('Error de red al subir la imagen.'))
      resolve(toResponse(xhr))
    }
    xhr.onerror = () => {
      done()
      reject(new Error('Error de red al subir la imagen.'))
    }
    xhr.onabort = () => {
      done()
      reject(Object.assign(new Error('Subida cancelada.'), { name: 'AbortError' }))
    }

    if (signal.aborted) return xhr.abort()
    xhr.send(body)
  })
}

/**
 * Lo que core lee de la respuesta (status, ok, headers.get, json, text), armado a mano: no depende de que
 * el Response del entorno acepte construirse desde un string.
 */
function toResponse(xhr: XMLHttpRequest): Response {
  const text = xhr.responseText ?? ''
  const headers = parseHeaders(xhr.getAllResponseHeaders())
  return {
    status: xhr.status,
    ok: xhr.status >= 200 && xhr.status < 300,
    statusText: xhr.statusText,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => JSON.parse(text),
    text: async () => text,
  } as unknown as Response
}

function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':')
    if (index > 0) headers.set(line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim())
  }
  return headers
}
