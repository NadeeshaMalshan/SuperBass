import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/auth_user.dart';
import '../../models/worker_services_data.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/workio_components.dart';
import '../../main.dart';
import '../onboarding_screen.dart' show sriLankaGeoData;

/// Multi-step onboarding wizard specifically for independent Worker registration
class WorkerOnboardingScreen extends StatefulWidget {
  const WorkerOnboardingScreen({super.key});

  @override
  State<WorkerOnboardingScreen> createState() => _WorkerOnboardingScreenState();
}

class _WorkerOnboardingScreenState extends State<WorkerOnboardingScreen> {
  int _step = 1;
  bool _isSubmitting = false;

  // Step 1: Identity & Contact
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  // Step 2: Location & Coverage
  String? _selectedProvince = 'Western';
  String? _selectedDistrict = 'Colombo';
  final TextEditingController _cityController = TextEditingController(text: 'Colombo');
  double _coverageRadius = 15.0; // km
  final double _selectedLat = 6.9271;
  final double _selectedLng = 79.8612;

  // Step 3: Trade & Skills
  ServiceCategoryDef _selectedCategory = WorkerServicesCatalog.categories.first;
  final Set<String> _selectedSubSkills = <String>{};
  int _experienceYears = 3;

  // Step 4: Pricing
  String _pricingModel = 'Hourly'; // 'Hourly', 'Daily', 'Fixed'
  final TextEditingController _rateController = TextEditingController(text: '1500');

  // Step 5: Bio & Summary
  final TextEditingController _bioController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final user = AuthService().currentUser;
    if (user != null && user.name.isNotEmpty && user.name != user.email) {
      _nameController.text = user.name;
    }
    // Initialize default sub-skills for the selected category
    _selectedSubSkills.addAll(_selectedCategory.defaultSkills.take(3));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _rateController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  bool get _isPhoneValid => RegExp(r'^0\d{9}$').hasMatch(_phoneController.text.trim());

  bool get _isStep1Valid =>
      _nameController.text.trim().isNotEmpty && _isPhoneValid;

  bool get _isStep2Valid =>
      _selectedProvince != null &&
      _selectedDistrict != null &&
      _cityController.text.trim().isNotEmpty;

  bool get _isStep3Valid =>
      _selectedSubSkills.isNotEmpty;

  bool get _isStep4Valid =>
      _rateController.text.trim().isNotEmpty &&
      (double.tryParse(_rateController.text.trim()) ?? 0) > 0;

  void _onCategoryChanged(ServiceCategoryDef cat) {
    setState(() {
      _selectedCategory = cat;
      _selectedSubSkills.clear();
      _selectedSubSkills.addAll(cat.defaultSkills.take(3));
    });
  }

  Future<void> _handleSubmit() async {
    final user = AuthService().currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Session expired. Please sign in again.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final rateVal = double.tryParse(_rateController.text.trim()) ?? 1500.0;
      final skillsPayload = [
        {
          'serviceName': _selectedCategory.name,
          'service': _selectedCategory.name,
          'skills': _selectedSubSkills.toList(),
          'experienceYears': _experienceYears,
          'skillName': _selectedCategory.name,
        }
      ];

      final res = await ApiService().workerOnboarding(
        email: user.email,
        name: _nameController.text.trim(),
        phoneNo: _phoneController.text.trim(),
        profileImage: user.picture,
        description: _bioController.text.trim().isNotEmpty
            ? _bioController.text.trim()
            : 'Professional ${_selectedCategory.name} specialist with $_experienceYears+ years of experience.',
        primaryServiceArea: _cityController.text.trim().isNotEmpty
            ? _cityController.text.trim()
            : _selectedDistrict ?? 'Colombo',
        province: _selectedProvince,
        district: _selectedDistrict,
        locationLat: _selectedLat,
        locationLng: _selectedLng,
        coverageRadiusKm: _coverageRadius,
        pricingModel: _pricingModel,
        hourlyRate: _pricingModel == 'Hourly' ? rateVal : null,
        dailyRate: _pricingModel == 'Daily' ? rateVal : null,
        skills: skillsPayload,
      );

      if (!mounted) return;

      if (res['success'] == true) {
        final workerData = res['data']?['worker'];
        final int? workerId = workerData != null ? workerData['id'] as int? : null;

        // Persist local worker role and credentials
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userName', _nameController.text.trim());
        await prefs.setString('phoneNo', _phoneController.text.trim());
        await prefs.setBool('isWorker', true);
        await prefs.setString('activeRole', 'Worker');
        if (workerId != null) {
          await prefs.setInt('workerId', workerId);
        }

        // Update active user state
        AuthService().currentUserNotifier.value = AuthUser(
          token: user.token,
          email: user.email,
          name: _nameController.text.trim(),
          picture: user.picture,
          isNewUser: false,
          isWorker: true,
          isNewWorker: false,
          activeRole: 'Worker',
          workerId: workerId,
          locationLat: _selectedLat,
          locationLng: _selectedLng,
        );

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Worker profile created! Welcome aboard.'),
            backgroundColor: AppColors.success,
          ),
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainNavigationShell()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Failed to complete registration.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _step > 1
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.ink),
                onPressed: () => setState(() => _step--),
              )
            : null,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      transitionBuilder: (child, animation) => FadeTransition(
                        opacity: animation,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0.04, 0),
                            end: Offset.zero,
                          ).animate(animation),
                          child: child,
                        ),
                      ),
                      child: Container(
                        key: ValueKey<int>(_step),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            StepProgress(current: _step, total: 5),
                            const SizedBox(height: 28),
                            if (_step == 1) _buildStep1Identity(),
                            if (_step == 2) _buildStep2Location(),
                            if (_step == 3) _buildStep3Skills(),
                            if (_step == 4) _buildStep4Pricing(),
                            if (_step == 5) _buildStep5Bio(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
                  child: _buildBottomAction(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeading(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.dmSans(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.8,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: GoogleFonts.dmSans(
            fontSize: 15,
            height: 1.45,
            color: AppColors.inkMuted,
          ),
        ),
      ],
    );
  }

  // STEP 1: Name and Phone Number
  Widget _buildStep1Identity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading(
          'What should clients call you?',
          'Provide your full name and a verified Sri Lankan mobile number where clients can contact you.',
        ),
        const SizedBox(height: 28),
        WorkioTextField(
          label: 'Full Name',
          controller: _nameController,
          keyboardType: TextInputType.name,
          textCapitalization: TextCapitalization.words,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 20),
        WorkioTextField(
          label: 'Mobile Number',
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          errorText: _phoneController.text.trim().isNotEmpty && !_isPhoneValid
              ? 'Enter a valid 10-digit number (e.g. 0771234567)'
              : null,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  // STEP 2: Location, District, Area, and Radius
  Widget _buildStep2Location() {
    final districts = _selectedProvince != null
        ? (sriLankaGeoData[_selectedProvince] ?? [])
        : <String>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading(
          'Where do you operate?',
          'Select your primary province and district, specify your base city, and set your coverage radius.',
        ),
        const SizedBox(height: 28),
        Text(
          'Province',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _selectedProvince,
              items: sriLankaGeoData.keys.map((p) {
                return DropdownMenuItem<String>(
                  value: p,
                  child: Text(p, style: GoogleFonts.dmSans(fontSize: 15)),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedProvince = val;
                    final list = sriLankaGeoData[val] ?? [];
                    _selectedDistrict = list.isNotEmpty ? list.first : null;
                  });
                }
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'District',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _selectedDistrict,
              items: districts.map((d) {
                return DropdownMenuItem<String>(
                  value: d,
                  child: Text(d, style: GoogleFonts.dmSans(fontSize: 15)),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedDistrict = val;
                  });
                }
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        WorkioTextField(
          label: 'Primary City / Town / Area',
          controller: _cityController,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Service Radius',
              style: GoogleFonts.dmSans(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.brandBlack,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${_coverageRadius.round()} km radius',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        Slider(
          value: _coverageRadius,
          min: 5,
          max: 50,
          divisions: 9,
          activeColor: AppColors.brandBlack,
          inactiveColor: AppColors.track,
          label: '${_coverageRadius.round()} km',
          onChanged: (val) => setState(() => _coverageRadius = val),
        ),
      ],
    );
  }

  // STEP 3: Trade Category & Sub-skills
  Widget _buildStep3Skills() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading(
          'What is your primary trade?',
          'Select your main category and choose the specific services and skills you offer to customers.',
        ),
        const SizedBox(height: 20),
        Text(
          'Select Trade Category',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 105,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: WorkerServicesCatalog.categories.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final cat = WorkerServicesCatalog.categories[index];
              final isSelected = cat.id == _selectedCategory.id;
              return GestureDetector(
                onTap: () => _onCategoryChanged(cat),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 100,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.brandBlack : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? AppColors.brandBlack : AppColors.line,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxBorderEffect.selectedGlow,
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(cat.icon, style: const TextStyle(fontSize: 26)),
                      const SizedBox(height: 8),
                      Text(
                        cat.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Services You Provide (${_selectedCategory.name})',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _selectedCategory.defaultSkills.map((skill) {
            final isChosen = _selectedSubSkills.contains(skill);
            return FilterChip(
              label: Text(skill),
              selected: isChosen,
              selectedColor: AppColors.brandBlack,
              backgroundColor: Colors.white,
              checkmarkColor: Colors.white,
              labelStyle: GoogleFonts.dmSans(
                fontSize: 13,
                fontWeight: isChosen ? FontWeight.w700 : FontWeight.w500,
                color: isChosen ? Colors.white : AppColors.ink,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isChosen ? AppColors.brandBlack : AppColors.line,
                ),
              ),
              onSelected: (bool selected) {
                setState(() {
                  if (selected) {
                    _selectedSubSkills.add(skill);
                  } else {
                    if (_selectedSubSkills.length > 1) {
                      _selectedSubSkills.remove(skill);
                    }
                  }
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Years of Experience',
              style: GoogleFonts.dmSans(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            Text(
              '$_experienceYears Years',
              style: GoogleFonts.dmSans(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.brandBlack,
              ),
            ),
          ],
        ),
        Slider(
          value: _experienceYears.toDouble(),
          min: 1,
          max: 30,
          divisions: 29,
          activeColor: AppColors.brandBlack,
          inactiveColor: AppColors.track,
          label: '$_experienceYears yrs',
          onChanged: (val) => setState(() => _experienceYears = val.round()),
        ),
      ],
    );
  }

  // STEP 4: Pricing Model & Rates
  Widget _buildStep4Pricing() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading(
          'How do you charge for your services?',
          'Pick your standard billing model and set an initial rate. You can customize quotes per job later.',
        ),
        const SizedBox(height: 28),
        Row(
          children: ['Hourly', 'Daily', 'Fixed'].map((model) {
            final isSelected = _pricingModel == model;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _pricingModel = model),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.brandBlack : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.brandBlack : AppColors.line,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      model,
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? Colors.white : AppColors.ink,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        WorkioTextField(
          label: _pricingModel == 'Hourly'
              ? 'Hourly Rate (LKR / hour)'
              : (_pricingModel == 'Daily'
                  ? 'Daily Rate (LKR / day)'
                  : 'Starting Rate (LKR)'),
          controller: _rateController,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, size: 20, color: AppColors.inkMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Clients appreciate clear, honest pricing. You can also send custom estimates after inspecting the job.',
                  style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.inkMuted),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // STEP 5: Bio, Summary & Review
  Widget _buildStep5Bio() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading(
          'Tell clients a bit about yourself',
          'Add a short professional bio highlighting your punctuality, skills, or specialized tools.',
        ),
        const SizedBox(height: 24),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'About You / Bio (Optional)',
              style: GoogleFonts.dmSans(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: TextField(
                controller: _bioController,
                maxLines: 4,
                style: GoogleFonts.dmSans(fontSize: 15, color: AppColors.ink),
                decoration: const InputDecoration(
                  hintText: 'Share a brief summary of your expertise...',
                  contentPadding: EdgeInsets.all(14),
                  border: InputBorder.none,
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'Registration Summary',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            children: [
              _buildSummaryRow('Name', _nameController.text.trim()),
              _buildSummaryRow('Contact', _phoneController.text.trim()),
              _buildSummaryRow('Area', '${_cityController.text.trim()}, $_selectedDistrict'),
              _buildSummaryRow('Trade', '${_selectedCategory.icon} ${_selectedCategory.name}'),
              _buildSummaryRow('Skills', '${_selectedSubSkills.length} selected'),
              _buildSummaryRow('Rate', 'LKR ${_rateController.text.trim()} / $_pricingModel'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.inkMuted)),
          Text(
            value,
            style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.ink),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction() {
    bool isNextEnabled = false;
    if (_step == 1) isNextEnabled = _isStep1Valid;
    if (_step == 2) isNextEnabled = _isStep2Valid;
    if (_step == 3) isNextEnabled = _isStep3Valid;
    if (_step == 4) isNextEnabled = _isStep4Valid;
    if (_step == 5) isNextEnabled = true;

    return WorkioPrimaryButton(
      label: _step == 5 ? 'Complete Registration' : 'Next Step',
      isLoading: _step == 5 && _isSubmitting,
      isLastStep: _step == 5,
      onPressed: isNextEnabled
          ? () {
              if (_step < 5) {
                setState(() => _step++);
              } else {
                _handleSubmit();
              }
            }
          : null,
    );
  }
}

class BoxBorderEffect {
  static const selectedGlow = BoxShadow(
    color: Color(0x14000000),
    blurRadius: 10,
    offset: Offset(0, 4),
  );
}
