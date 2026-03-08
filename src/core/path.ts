const cssRE = /\.(?:css|scss|sass|postcss|pcss|less|stylus|styl)(?:\?[^.]+)?$/

export function isCSS(id: string): boolean {
  return cssRE.test(id)
}
