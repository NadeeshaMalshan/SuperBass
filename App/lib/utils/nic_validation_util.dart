import 'package:sri_lanka_nic/sri_lanka_nic.dart';

class NicValidationResult {
  final bool isValid;
  final String? error;
  final DateTime? dateOfBirth;
  final String? gender;

  NicValidationResult({
    required this.isValid,
    this.error,
    this.dateOfBirth,
    this.gender,
  });
}

class NicValidationUtil {
  static NicValidationResult validateAndParse(String nicString) {
    if (nicString.trim().isEmpty) {
      return NicValidationResult(isValid: false, error: 'NIC cannot be empty.');
    }

    try {
      final NicDetails parsed = Nic.parse(nicString);
      return NicValidationResult(
        isValid: true,
        dateOfBirth: parsed.birthday,
        gender: parsed.gender == Gender.male ? 'Male' : 'Female',
      );
    } catch (e) {
      return NicValidationResult(isValid: false, error: 'Invalid NIC format.');
    }
  }
}
