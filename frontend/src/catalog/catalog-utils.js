export function sizeMatchesFilter(productSize, selectedSize) {
  if (!selectedSize) return true;
  if (!productSize) return false;
  return String(productSize)
    .split("/")
    .map((part) => part.trim())
    .includes(String(selectedSize).trim());
}
