import 'package:flutter/material.dart';
import '../utils/nic_validation_util.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class VerificationForm extends StatefulWidget {
  final VoidCallback onVerifySuccess;

  const VerificationForm({super.key, required this.onVerifySuccess});

  @override
  State<VerificationForm> createState() => _VerificationFormState();
}

class _VerificationFormState extends State<VerificationForm> {
  final _nicController = TextEditingController();
  DateTime? _selectedDate;
  String _selectedGender = 'Male';
  bool _isVerified = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    // If user is already verified in the current session, skip the form immediately
    final user = AuthService().currentUser;
    if (user != null && user.isVerified) {
      _isVerified = true;
    }
  }

  void _submit() {
    setState(() {
      _errorText = null;
    });

    final result = NicValidationUtil.validateAndParse(_nicController.text);
    if (!result.isValid) {
      _showError(result.error ?? 'Invalid NIC format.');
      return;
    }

    if (_selectedDate == null) {
      _showError('Please select your Date of Birth.');
      return;
    }

    // Compare Date of Birth
    if (result.dateOfBirth?.year != _selectedDate?.year ||
        result.dateOfBirth?.month != _selectedDate?.month ||
        result.dateOfBirth?.day != _selectedDate?.day) {
      _showError('Verification failed: The entered details do not match the official NIC records.');
      return;
    }

    // Compare Gender
    if (result.gender?.toLowerCase() != _selectedGender.toLowerCase()) {
      _showError('Verification failed: The entered details do not match the official NIC records.');
      return;
    }

    final nic = _nicController.text.trim();
    final user = AuthService().currentUser;
    if (user != null && user.email.isNotEmpty) {
      ApiService().verifyResident(user.email, nicNumber: nic);
      if (user.workerId != null && user.workerId! > 0) {
        ApiService().verifyWorker(user.workerId!, nicNumber: nic);
      }
    }
    AuthService().markUserVerified();

    setState(() {
      _isVerified = true;
    });
    
    widget.onVerifySuccess();
  }

  void _showError(String message) {
    setState(() {
      _errorText = message;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setState(() {
        _selectedDate = date;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isVerified) {
      return Container(
        padding: const EdgeInsets.all(24.0),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: Colors.green.shade200),
        ),
        child: const Column(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 48),
            SizedBox(height: 16),
            Text(
              'Account Verified',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green),
            ),
            SizedBox(height: 8),
            Text(
              'Your official identity has been successfully verified.',
              style: TextStyle(color: Colors.green),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Card(
      elevation: 0,
      color: Colors.grey.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Please enter your official NIC details to verify your account.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nicController,
              decoration: const InputDecoration(
                labelText: 'National Identity Card (NIC)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Date of Birth',
                  border: OutlineInputBorder(),
                ),
                child: Text(
                  _selectedDate == null
                      ? 'Select Date'
                      : '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}',
                ),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedGender,
              decoration: const InputDecoration(
                labelText: 'Gender',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'Male', child: Text('Male')),
                DropdownMenuItem(value: 'Female', child: Text('Female')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _selectedGender = val);
              },
            ),
            if (_errorText != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _errorText!,
                  style: TextStyle(color: Colors.red.shade900),
                ),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _submit,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Verify Now'),
            ),
          ],
        ),
      ),
    );
  }
}
// This widget is used to verify the user's official identity using their National Identity Card (NIC) details. It checks the NIC format, date of birth, and gender against the official records and marks the user as verified if successful.