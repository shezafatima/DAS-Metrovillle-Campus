/**
 * Whole years between a birth date and `today`, both "YYYY-MM-DD" calendar
 * dates (no time zone). The birthday is compared as "MM-DD", so a 29 February
 * birthday is reached on 1 March in a year without one (research §3).
 */
export function ageOn(dob: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(dob.slice(0, 4));
  return today.slice(5) < dob.slice(5) ? years - 1 : years;
}
