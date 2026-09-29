import 'package:sri_lanka_nic/sri_lanka_nic.dart';

/// A custom structured response for NIC validation.
class NicValidationResult {
  final bool isValid;
  final String? errorMessage;
  final DateTime? dateOfBirth;
  final String? gender;

  NicValidationResult({
    required this.isValid,
    this.errorMessage,
    this.dateOfBirth,
    this.gender,
  });
}

class NicValidatorUtils {
  /// Validates and parses a Sri Lankan NIC (both old and new formats).
  /// 
  /// Returns a [NicValidationResult] containing the validity and extracted details.
  static NicValidationResult validateAndParse(String? nicInput) {
    if (nicInput == null || nicInput.trim().isEmpty) {
      return NicValidationResult(
        isValid: false,
        errorMessage: 'NIC cannot be empty.',
      );
    }

    try {
      final String trimmedNic = nicInput.trim();
      final NicDetails details = Nic.parse(trimmedNic);

      // Extract gender as a clean string ("Male" or "Female")
      // Depending on the version, details.gender might be an enum Gender.male.
      final String parsedGender = details.gender.toString().toLowerCase().contains('male') 
          && !details.gender.toString().toLowerCase().contains('female') 
          ? 'Male' 
          : 'Female';

      return NicValidationResult(
        isValid: true,
        dateOfBirth: details.birthday,
        gender: parsedGender,
      );
    } on NicException catch (e) {
      // Handles library specific errors like length, format, day of year issues
      return NicValidationResult(
        isValid: false,
        errorMessage: 'Invalid NIC: ${e.message}',
      );
    } catch (e) {
      // Fallback for any unknown errors
      return NicValidationResult(
        isValid: false,
        errorMessage: 'Invalid NIC format.',
      );
    }
  }
}
