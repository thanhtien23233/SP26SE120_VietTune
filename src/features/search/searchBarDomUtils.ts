/** Returns true if the event target coordinates hit the vertical document scrollbar. */
export function isClickOnScrollbar(event: MouseEvent): boolean {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
    return true;
  }
  return false;
}
