export enum ReviewDecision {
  Reject = 0,
  RequestUpdate = 1,
}

export function reviewDecisionLabelVi(decision: ReviewDecision | number): string {
  if (decision === ReviewDecision.RequestUpdate) return 'Yêu cầu cập nhật';
  return 'Từ chối';
}
