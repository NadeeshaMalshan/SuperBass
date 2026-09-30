import { parseNIC, validateNIC } from '@sliit-foss/lk-nic';

export const validateAndParseNIC = (nicString) => {
  if (!nicString || typeof nicString !== 'string' || nicString.trim() === '') {
    return {
      isValid: false,
      errors: [{ code: 'EMPTY_INPUT', message: 'NIC cannot be empty.' }],
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

  const validation = validateNIC(nicString);
  return {
    isValid: false,
    errors: validation.errors || [{ code: 'INVALID_FORMAT', message: 'Invalid NIC format.' }],
    data: null
  };
};
