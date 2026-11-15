/** Une clases condicionalmente, ignorando valores falsy. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
