import axe from 'axe-core';

/**
 * Corre axe-core sobre un nodo y devuelve las violaciones como texto legible ("regla: nodo"), para que
 * el test muestre qué falló. El contraste no se mide: jsdom no calcula estilos (eso lo cubre Lighthouse
 * sobre /?catalogo en los dos temas).
 */
export async function a11yViolations(node: Element = document.body): Promise<string[]> {
  const { violations } = await axe.run(node, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 120)}`));
}
