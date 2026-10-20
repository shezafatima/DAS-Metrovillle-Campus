/** `now` minus whole calendar months (UTC). Shared by careers (012) and registrations (013). */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}
