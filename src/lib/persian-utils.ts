// Persian number conversion utilities

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Convert English digits to Persian digits
 */
export const toPersianDigits = (input: string | number): string => {
  const str = String(input);
  return str.replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit)]);
};

/**
 * Convert Persian digits to English digits
 */
export const toEnglishDigits = (input: string): string => {
  return input.replace(/[۰-۹]/g, (digit) => {
    const index = persianDigits.indexOf(digit);
    return index !== -1 ? englishDigits[index] : digit;
  });
};

/**
 * Mask phone number with Persian digits
 */
export const maskPhoneNumber = (phoneNumber: string): string => {
  const cleanNumber = toEnglishDigits(phoneNumber);
  const masked = cleanNumber.slice(0, 4) + "****" + cleanNumber.slice(-3);
  return toPersianDigits(masked);
};
