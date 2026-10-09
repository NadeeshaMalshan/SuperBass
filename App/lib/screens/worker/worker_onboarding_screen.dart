import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/auth_user.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class WorkerOnboardingScreen extends StatefulWidget {
  const WorkerOnboardingScreen({super.key});

  @override
  State<WorkerOnboardingScreen> createState() => _WorkerOnboardingScreenState();
}

class _WorkerOnboardingScreenState extends State<WorkerOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final _areaController = TextEditingController(text: "Colombo");
  final _radiusController = TextEditingController(text: "10");
  final _rateController = TextEditingController();

  String _pricingModel = "Hourly";
  bool _isLoading = false;

  @override
  void dispose() {
    _descController.dispose();
    _areaController.dispose();
    _radiusController.dispose();
    _rateController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final user = AuthService().currentUserNotifier.value;

    if (user != null) {
      final worker = await ApiService().becomeWorker(
        email: user.email,
        description: _descController.text.trim(),
        primaryServiceArea: _areaController.text.trim(),
        coverageRadiusKm:
            double.tryParse(_radiusController.text.trim()) ?? 10.0,
        pricingModel: _pricingModel,
        hourlyRate: double.tryParse(_rateController.text.trim()),
        skills: [
          {"SkillName": "General Handyman", "ExperienceYears": 1},
        ],
      );

      if (mounted) {
        if (worker != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Successfully upgraded to Worker!'),
              backgroundColor: Colors.green,
            ),
          );
          // Update local session correctly without breaking the token
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool('isWorker', true);
          await prefs.setBool('isNewWorker', false);
          await prefs.setString('activeRole', 'Worker');

          AuthService().currentUserNotifier.value = AuthUser(
            token: user.token,
            email: user.email,
            name: user.name,
            picture: user.picture,
            isNewUser: user.isNewUser,
            isWorker: true,
            isNewWorker: false,
            activeRole: 'Worker',
            workerId: worker.id,
          );
          if (mounted && Navigator.canPop(context)) {
            Navigator.pop(context);
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to register as worker.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Worker Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Complete your profile to start receiving jobs in your area.',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Bio / Description',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _areaController,
                decoration: const InputDecoration(
                  labelText: 'Primary Service Area',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _pricingModel,
                decoration: const InputDecoration(
                  labelText: 'Pricing Model',
                  border: OutlineInputBorder(),
                ),
                items: ["Hourly", "Fixed", "Daily"]
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (val) => setState(() => _pricingModel = val!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _rateController,
                decoration: const InputDecoration(
                  labelText: 'Base Rate (\$)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Complete Registration',
                        style: TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
