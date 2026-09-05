// Minimal class-name joiner: keeps truthy class strings, drops the rest. Avoids
// a clsx dependency for the conditional-class needs of the base components.
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
