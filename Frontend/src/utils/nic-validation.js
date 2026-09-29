import { parseNIC, validateNIC } from '@sliit-foss/lk-nic';

/**
 * Validates and extracts data from a Sri Lankan NIC (National Identity Card).
 * Supports both old (9 digits + V/X) and new (12 digits) formats.
 * 
 * @param {string} nicString - The NIC string to validate.
 * @returns {Object} An object containing the validation boolean, errors (if any), and parsed data.
 */
export const validateAndParseNIC = (nicString) => {
  if (!nicString || typeof nicString !== 'string' || nicString.trim() === '') {
    return {
      isValid: false,
      errors: [{ code: 'EMPTY_INPUT', message: 'NIC string cannot be empty.' }],
      data: null
    };
  }

  const parsed = parseNIC(nicString);

  if (parsed.isValid) {
    return {
      isValid: true,
      errors: [],
      data: {
        nic: parsed.normalized,
        format: parsed.format,
        dateOfBirth: parsed.birthDateString,
        gender: parsed.gender,
        oldFormat: parsed.oldFormat,
        newFormat: parsed.newFormat,
      }
    };
  }

  // If invalid, fetch specific validation errors to provide detailed feedback
  const validation = validateNIC(nicString);
  return {
    isValid: false,
    errors: validation.errors || [{ code: 'INVALID_FORMAT', message: 'Invalid NIC format.' }],
    data: null
  };
};

/**
 * Example usage in a React Form or API Controller:
 * 
 * import { validateAndParseNIC } from './utils/nic-validation';
 * 
 * const handleFormSubmit = (nicInput) => {
 *   const result = validateAndParseNIC(nicInput);
 *   
 *   if (!result.isValid) {
 *     // Display errors to the user
 *     console.error('Validation failed:', result.errors);
 *     return;
 *   }
 *   
 *   // Proceed with the extracted data
 *   console.log('Date of Birth:', result.data.dateOfBirth);
 *   console.log('Gender:', result.data.gender);
 * }
 */
