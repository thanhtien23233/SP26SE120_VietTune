/** Replace `{{key}}` in template with vars. Missing keys become empty string. */
export function interpolate(
  template: string,
  vars: Record<string, string | number | undefined> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v != null ? String(v) : '';
  });
}
