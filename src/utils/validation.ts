export function validateEmail(email: string): boolean {
  const regex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return regex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Mật khẩu phải có ít nhất 6 ký tự');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu cần ít nhất một chữ cái in hoa');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu cần ít nhất một chữ cái thường');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu cần ít nhất một chữ số');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isUuid(input: string): boolean {
  const s = (input || '').trim();
  // Accept any 8-4-4-4-12 hex string (including seed/test UUIDs with zero version/variant).
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
