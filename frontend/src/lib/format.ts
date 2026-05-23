// Centralized currency formatter — PKR
export const fmt = (n: string | number): string => {
  const num = Number(n);
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const fmtCompact = (n: string | number): string => {
  const num = Number(n);
  if (num >= 100_000) return `Rs. ${(num / 100_000).toFixed(1)}L`;
  if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(1)}K`;
  return fmt(n);
};
