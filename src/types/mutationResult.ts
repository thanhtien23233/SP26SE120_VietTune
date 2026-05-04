/** Kết quả thao tác ghi server — UI quyết định có gọi uiToast hay không. */
export type MutationOk = { ok: true };
export type MutationFail = { ok: false; error: unknown; httpStatus?: number };
export type MutationResult = MutationOk | MutationFail;

export function mutationOk(): MutationOk {
  return { ok: true };
}

export function mutationFail(error: unknown, httpStatus?: number): MutationFail {
  return { ok: false, error, httpStatus };
}
