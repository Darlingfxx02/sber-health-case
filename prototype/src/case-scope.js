// The assignment exposes two homes and only the pulse detail.
export const canOpenDetail = item => item?.id === 'pulse' && item?.kind === 'metric';
