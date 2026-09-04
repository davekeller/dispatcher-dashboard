// Validates the text tokens against the grounds they sit on. Run once at theme setup and
// whenever a token moves; paste the table into docs/DECISIONS.md.
const tokens = {
  panel: '#ffffff', canvas: '#f8f6f3', well: '#f1ede9',
  ink: '#211e1c', muted: '#625d59', label: '#6d6661',
  'lookout-strong': '#a93817', lookout: '#cf4620',
  'act-now': '#942b38', watch: '#6f4a00', clear: '#1f593e', offline: '#484d54', break: '#2e518d',
  'act-now-soft': '#fdf0f1', 'watch-soft': '#fff7e7', 'clear-soft': '#edf7f1', 'offline-soft': '#f2f1f0', 'break-soft': '#eef2fb', 'lookout-soft': '#fff0e9',
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
