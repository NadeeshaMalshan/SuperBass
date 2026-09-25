import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/worker_services_data.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';

/// Selection data item for a service and its associated skills
class WorkerServiceSelection {
  final String serviceName;
  final String icon;
  final List<String> skills;
  int experienceYears;
  final TextEditingController customSkillController = TextEditingController();

  WorkerServiceSelection({
    required this.serviceName,
    required this.icon,
    required List<String> skills,
    this.experienceYears = 2,
  }) : skills = List.from(skills);

  Map<String, dynamic> toMap() => {
        'serviceName': serviceName,
        'service': serviceName,
        'skills': skills,
        'experienceYears': experienceYears,
        'skillName': serviceName,
      };

  void dispose() {
    customSkillController.dispose();
  }
}

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

  double _radiusKm = 15.0;
  String _pricingModel = 'Hourly';
  bool _isSubmitting = false;
  String? _errorMessage;

  // Selected services with their respective skill arrays
  final List<WorkerServiceSelection> _selectedServices = [];
  final _newSkillController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Default initial service selection: Plumbing
    final defaultCat = WorkerServicesCatalog.categories.first;
    _selectedServices.add(
      WorkerServiceSelection(
        serviceName: defaultCat.name,
        icon: defaultCat.icon,
        skills: defaultCat.defaultSkills.take(2).toList(),
        experienceYears: 2,
      ),
    );
  }

  @override
  void dispose() {
    _descController.dispose();
    _serviceAreaController.dispose();
    _hourlyRateController.dispose();
    _dailyRateController.dispose();
    for (final s in _selectedServices) {
      s.dispose();
    }
    super.dispose();
  }

  void _toggleService(ServiceCategoryDef cat) {
    setState(() {
      final existingIndex = _selectedServices.indexWhere((s) => s.serviceName.toLowerCase() == cat.name.toLowerCase());
      if (existingIndex >= 0) {
        if (_selectedServices.length > 1) {
          _selectedServices[existingIndex].dispose();
          _selectedServices.removeAt(existingIndex);
        } else {
          _errorMessage = 'You must keep at least one selected service.';
        }
      } else {
        _errorMessage = null;
        _selectedServices.add(
          WorkerServiceSelection(
            serviceName: cat.name,
            icon: cat.icon,
            skills: cat.defaultSkills.take(2).toList(),
            experienceYears: 2,
          ),
        );
      }
    });
  }

  void _toggleSkill(WorkerServiceSelection service, String skill) {
    setState(() {
      if (service.skills.contains(skill)) {
        if (service.skills.length > 1) {
          service.skills.remove(skill);
        } else {
          _errorMessage = 'Each service must have at least one skill.';
        }
      } else {
        _errorMessage = null;
        service.skills.add(skill);
      }
    });
  }

  void _addCustomSkill(WorkerServiceSelection service) {
    final text = service.customSkillController.text.trim();
    if (text.isNotEmpty && !service.skills.contains(text)) {
      setState(() {
        service.skills.add(text);
        service.customSkillController.clear();
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedServices.isEmpty) {
      setState(() => _errorMessage = 'Please select at least one service.');
      return;
    }

    for (final s in _selectedServices) {
      if (s.skills.isEmpty) {
        setState(() => _errorMessage = 'Please assign at least one skill to ${s.serviceName}.');
        return;
      }
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

    final skillsPayload = _selectedServices.map((s) => s.toMap()).toList();
    final primaryService = _selectedServices.first.serviceName;

    final worker = await ApiService().becomeWorker(
      email: user.email,
      description: _descController.text.trim().isNotEmpty
          ? _descController.text.trim()
          : 'Experienced $primaryService professional serving ${_serviceAreaController.text.trim()}.',
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

        if (mounted) {
          Navigator.of(context).pop();
          widget.onWorkerCreated();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Welcome aboard, ${worker.name}! You are now an active Pro Worker.',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
              ),
              backgroundColor: WorkerColors.primary,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        setState(() => _errorMessage = 'Failed to create worker profile. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: WorkerColors.outlineVariant,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),

              // Title Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: WorkerColors.primaryLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: WorkerColors.primaryBorder),
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
                        const SizedBox(height: 2),
                        Text(
                          'Offer your trade services to nearby residents',
                          style: GoogleFonts.dmSans(
                            fontSize: 12,
                            color: WorkerColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Error banner if any
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: WorkerColors.errorLight,
                    borderRadius: BorderRadius.circular(12),
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

              // 1. SERVICES SELECTION
              Text(
                '1. Select Services (Choose One or More)',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Tap to select the services you offer. You can choose multiple services.',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: WorkerColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),

              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: WorkerServicesCatalog.categories.map((cat) {
                  final isSelected = _selectedServices.any(
                    (s) => s.serviceName.toLowerCase() == cat.name.toLowerCase(),
                  );
                  return FilterChip(
                    label: Text('${cat.icon}  ${cat.name}'),
                    selected: isSelected,
                    onSelected: (_) => _toggleService(cat),
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

              const SizedBox(height: 20),

              // 2. SKILLS ARRAY PER SELECTED SERVICE
              Text(
                '2. Skills & Trade Specialization',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Select specific skills relevant to each service and set your experience level.',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: WorkerColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),

              // Service cards with skill arrays
              ..._selectedServices.map((service) {
                final suggestedSkills = WorkerServicesCatalog.getSkillsForService(service.serviceName);

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Service Header
                      Row(
                        children: [
                          Text(
                            service.icon,
                            style: const TextStyle(fontSize: 20),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              service.serviceName,
                              style: GoogleFonts.dmSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          // Experience Years Dropdown
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: DropdownButton<int>(
                              value: service.experienceYears,
                              underline: const SizedBox.shrink(),
                              isDense: true,
                              items: const [
                                DropdownMenuItem(value: 0, child: Text('< 1 Year Exp')),
                                DropdownMenuItem(value: 1, child: Text('1 Year Exp')),
                                DropdownMenuItem(value: 2, child: Text('2 Years Exp')),
                                DropdownMenuItem(value: 3, child: Text('3 Years Exp')),
                                DropdownMenuItem(value: 5, child: Text('5+ Years Exp')),
                                DropdownMenuItem(value: 10, child: Text('10+ Years Exp')),
                              ],
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => service.experienceYears = val);
                                }
                              },
                            ),
                          ),
                          if (_selectedServices.length > 1) ...[
                            const SizedBox(width: 6),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF94A3B8)),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                setState(() {
                                  service.dispose();
                                  _selectedServices.remove(service);
                                });
                              },
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Skills array heading
                      Text(
                        'Skills in ${service.serviceName}:',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Suggested skills chips
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: suggestedSkills.map((sk) {
                          final isSelected = service.skills.contains(sk);
                          return FilterChip(
                            label: Text(sk),
                            selected: isSelected,
                            onSelected: (_) => _toggleSkill(service, sk),
                            selectedColor: WorkerColors.primaryLight,
                            checkmarkColor: WorkerColors.primary,
                            labelStyle: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? WorkerColors.primary : const Color(0xFF334155),
                            ),
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(
                                color: isSelected ? WorkerColors.primary : const Color(0xFFE2E8F0),
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 10),

                      // Add custom skill input
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: service.customSkillController,
                              style: GoogleFonts.dmSans(fontSize: 12),
                              decoration: InputDecoration(
                                hintText: 'Add specialized skill to ${service.serviceName}...',
                                hintStyle: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF94A3B8)),
                                filled: true,
                                fillColor: Colors.white,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                              ),
                              onSubmitted: (_) => _addCustomSkill(service),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () => _addCustomSkill(service),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: WorkerColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            child: const Text('Add', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 10),

              // 3. Service Area & Radius
              Text(
                '3. Service Location & Coverage',
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

              // 4. Pricing Model & Rates
              Text(
                '4. Pricing Details',
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

              // 5. Bio / Overview
              Text(
                '5. About Your Services (Optional)',
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
