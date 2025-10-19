/**
 * Validates Argentine license plates according to the official formats:
 * - Old format: AAA999 (3 letters followed by 3 numbers)
 * - New format: AA999AA (2 letters, 3 numbers, 2 letters)
 * 
 * Also normalizes the input by removing spaces and converting to uppercase
 * 
 * @param {string} value - The license plate to validate
 * @returns {string} - The normalized license plate if valid
 * @throws {Error} - If the license plate is invalid
 */
const licensePlateValidator = (value) => {
  const normalized = value.replace(/\s+/g, "").toUpperCase();

  const oldPlateRegex = /^[A-Z]{3}[0-9]{3}$/;

  const newPlateRegex = /^[A][A-H][0-9]{3}[A-Z]{2}$/;

  if (oldPlateRegex.test(normalized) || newPlateRegex.test(normalized)) {
    return normalized;
  }

  throw new Error(
    "Patente inválida: debe ser formato antiguo AAA999 o nuevo AA999AA"
  );
};

module.exports = licensePlateValidator;