import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';

/// Modal bottom sheet allowing a registered resident to upgrade to a Worker profile.
class BecomeWorkerSheet extends StatefulWidget {
  final VoidCallback onWorkerCreated;

  const BecomeWorkerSheet({super.key, required this.onWorkerCreated});

  static Future<void> show(BuildContext context, {required VoidCallback onWorkerCreated}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BecomeWorkerSheet(onWorkerCreated: onWorkerCreated),
    );
  }

  @override
  State<BecomeWorkerSheet> createState() => _BecomeWorkerSheetState();
}

class _BecomeWorkerSheetState extends State<BecomeWorkerSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final _serviceAreaController = TextEditingController(text: 'Colombo');
  final _hourlyRateController = TextEditingController(text: '1500');
  final _dailyRateController = TextEditingController(text: '8000');
  final _newSkillController = TextEditingController();

  double _radiusKm = 15.0;
  String _pricingModel = 'Hourly';
  final List<String> _skills = ['Plumbing', 'Pipe Repair'];
  bool _isSubmitting = false;
  String? _errorMessage;

  final List<String> _availableSkillSuggestions = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Masonry',
    'Painting',
    'AC Repair',
    'Roofing',
    'Gardening',
    'Appliance Repair',
    'Cleaning',
  ];

  @override
  void dispose() {
    _descController.dispose();
    _serviceAreaController.dispose();
    _hourlyRateController.dispose();
    _dailyRateController.dispose();
    _newSkillController.dispose();
    super.dispose();
  }

  void _addSkill(String skill) {
    final trimmed = skill.trim();
    if (trimmed.isNotEmpty && !_skills.contains(trimmed)) {
      setState(() {
        _skills.add(trimmed);
        _newSkillController.clear();
      });
    }
  }

  void _removeSkill(String skill) {
    setState(() {
      _skills.remove(skill);
    });
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_skills.isEmpty) {
      setState(() => _errorMessage = 'Please add at least one trade skill.');
      return;
    }

    final user = AuthService().currentUser;
    if (user == null) {
      setState(() => _errorMessage = 'You must be logged in to become a worker.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final skillsPayload = _skills
        .map((s) => {'skillName': s, 'experienceYears': 2})
        .toList();

    final worker = await ApiService().becomeWorker(
      email: user.email,
      description: _descController.text.trim().isNotEmpty
          ? _descController.text.trim()
          : 'Experienced ${_skills.first} professional serving ${_serviceAreaController.text.trim()}.',
      primaryServiceArea: _serviceAreaController.text.trim(),
      coverageRadiusKm: _radiusKm,
      pricingModel: _pricingModel,
      hourlyRate: double.tryParse(_hourlyRateController.text.trim()) ?? 1500.0,
      dailyRate: double.tryParse(_dailyRateController.text.trim()) ?? 8000.0,
      skills: skillsPayload,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (worker != null) {
        // Upgrade auth state
        await AuthService().updateWorkerStatus(
          isWorker: true,
          workerId: worker.id,
          activeRole: 'Worker',
        );
        if (!mounted) return;
        Navigator.of(context).pop();
        widget.onWorkerCreated();
      } else {
        setState(() {
          _errorMessage = 'Could not create worker profile. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: WorkerColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(24, 16, 24, bottomInset + 24),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: WorkerColors.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // Title and worker badge
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: WorkerColors.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.handyman_rounded,
                      color: WorkerColors.primary,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Join as a Worker',
                          style: GoogleFonts.dmSans(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: WorkerColors.onSurface,
                          ),
                        ),
                        Text(
                          'Offer your services & get hired nearby',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: WorkerColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: WorkerColors.errorLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: WorkerColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: WorkerColors.error, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: WorkerColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // 1. Skills section
              Text(
                'Select Your Skills / Services',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),

              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _availableSkillSuggestions.map((s) {
                  final isSelected = _skills.contains(s);
                  return FilterChip(
                    label: Text(s),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) {
                        _addSkill(s);
                      } else {
                        _removeSkill(s);
                      }
                    },
                    selectedColor: WorkerColors.primaryContainer,
                    checkmarkColor: WorkerColors.primary,
                    labelStyle: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? WorkerColors.primary : WorkerColors.onSurface,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected ? WorkerColors.primary : WorkerColors.outlineVariant,
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _newSkillController,
                      decoration: InputDecoration(
                        hintText: 'Add custom skill...',
                        fillColor: WorkerColors.surfaceVariant,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      onFieldSubmitted: _addSkill,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _addSkill(_newSkillController.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: WorkerColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    child: const Text('Add'),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // 2. Service Area & Radius
              Text(
                'Service Location & Coverage',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _serviceAreaController,
                decoration: const InputDecoration(
                  labelText: 'Primary City / Area',
                  prefixIcon: Icon(Icons.location_on_outlined, color: WorkerColors.primary),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'City is required' : null,
              ),

              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Coverage Radius',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      color: WorkerColors.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${_radiusKm.round()} km',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: WorkerColors.primary,
                    ),
                  ),
                ],
              ),
              Slider(
                value: _radiusKm,
                min: 2,
                max: 50,
                divisions: 24,
                activeColor: WorkerColors.primary,
                inactiveColor: WorkerColors.outlineVariant,
                label: '${_radiusKm.round()} km',
                onChanged: (val) => setState(() => _radiusKm = val),
              ),

              const SizedBox(height: 16),

              // 3. Pricing Model & Rates
              Text(
                'Pricing Details',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _pricingModel,
                decoration: const InputDecoration(
                  labelText: 'Pricing Structure',
                ),
                items: const [
                  DropdownMenuItem(value: 'Hourly', child: Text('Hourly Rate')),
                  DropdownMenuItem(value: 'Daily', child: Text('Daily Rate')),
                  DropdownMenuItem(value: 'Fixed', child: Text('Fixed / Per Job')),
                  DropdownMenuItem(value: 'Negotiable', child: Text('Negotiable')),
                ],
                onChanged: (val) => setState(() => _pricingModel = val ?? 'Hourly'),
              ),

              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _hourlyRateController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Hourly (LKR)',
                        prefixText: 'Rs. ',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _dailyRateController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Daily (LKR)',
                        prefixText: 'Rs. ',
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 4. Bio / Overview
              Text(
                'About Your Services (Optional)',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Tell residents about your skills, tools, and background...',
                ),
              ),

              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: WorkerColors.primary,
                    foregroundColor: Colors.white,
                    shape: const StadiumBorder(),
                    elevation: 2,
                    shadowColor: WorkerColors.primaryGlow,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          'Complete Worker Profile',
                          style: GoogleFonts.dmSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
