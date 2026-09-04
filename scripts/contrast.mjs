// Validates the text tokens against the grounds they sit on. Run once at theme setup and
// whenever a token moves; paste the table into docs/DECISIONS.md.
const tokens = {
  panel: '#ffffff', canvas: '#f8f6f3', well: '#f1ede9',
  ink: '#211e1c', muted: '#625d59', label: '#6d6661',
  'lookout-strong': '#a93817', lookout: '#cf4620',
  'act-now': '#9f1f3b', watch: '#755000', clear: '#165d3f', offline: '#424c60', break: '#28549a',
  'act-now-soft': '#fff0f3', 'watch-soft': '#fff6df', 'clear-soft': '#eaf8f0', 'offline-soft': '#eff2f6', 'break-soft': '#edf3ff', 'lookout-soft': '#fff0e9',
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2) }
const pairs = [
  ['ink', 'panel'], ['muted', 'panel'], ['label', 'panel'], ['muted', 'canvas'], ['muted', 'well'],
  ['lookout-strong', 'panel'], ['lookout', 'panel'], ['lookout-strong', 'lookout-soft'],
  ['act-now', 'panel'], ['act-now', 'act-now-soft'], ['watch', 'panel'], ['watch', 'watch-soft'],
  ['clear', 'panel'], ['clear', 'clear-soft'], ['offline', 'panel'], ['offline', 'offline-soft'], ['break', 'panel'], ['break', 'break-soft'],
]
let fails = 0
console.log('| text | ground | ratio | AA |\n|---|---|---|---|')
for (const [t, g] of pairs) { const r = ratio(tokens[t], tokens[g]); if (r < 4.5) fails++; console.log(`| ${t} | ${g} | ${r} | ${r >= 4.5 ? 'pass' : 'FAIL'} |`) }
process.exit(fails ? 1 : 0)
