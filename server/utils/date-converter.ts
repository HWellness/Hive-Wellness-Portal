// Utility function to convert DD-MM-YYYY to YYYY-MM-DD with validation
export function convertDDMMYYYYtoYYYYMMDD(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected DD-MM-YYYY or YYYY-MM-DD');
  }
  
  const [part1, part2, part3] = parts;
  
  let day: number, month: number, year: number;
  
  // Detect format: if part1 is 4 digits, it's YYYY-MM-DD
  if (part1.length === 4) {
    year = parseInt(part1, 10);
    month = parseInt(part2, 10);
    day = parseInt(part3, 10);
  } else {
    // DD-MM-YYYY format
    day = parseInt(part1, 10);
    month = parseInt(part2, 10);
    year = parseInt(part3, 10);
  }
  
  // Check for NaN values from malformed input
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    throw new Error('Invalid date format. Date components must be numeric');
  }
  
  // Basic range check
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Invalid date values. Year must be 2000-2100, month 1-12, day 1-31');
  }
  
  // Validate actual calendar date by round-trip check
  const testDate = new Date(year, month - 1, day); // month is 0-indexed in Date
  
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    throw new Error(`Invalid calendar date. ${day}-${month}-${year} does not exist`);
  }
  
  // Return in YYYY-MM-DD format
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
