export function formatXof(value) {
  return `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} FCFA`;
}
