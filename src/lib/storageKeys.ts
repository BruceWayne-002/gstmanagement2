export const storageKeys = {
  fileReturns: (fy: string, q: string, p: string) => `file_returns:${fy}:${q}:${p}`,
  gstr1B2B: (fy: string, q: string, p: string) => `gstr1:b2b:${fy}:${q}:${p}`,
  gstr1B2CS: (fy: string, q: string, p: string) => `gstr1:b2cs:${fy}:${q}:${p}`,
  gstr1HSN: (fy: string, q: string, p: string) => `gstr1:hsn:${fy}:${q}:${p}`,
  gstr1Docs: (fy: string, q: string, p: string) => `gstr1:docs:${fy}:${q}:${p}`,
};
