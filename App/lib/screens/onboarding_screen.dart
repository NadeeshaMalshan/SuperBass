import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../widgets/workio_components.dart';
import '../widgets/superbass_map.dart';
import '../main.dart';

const Map<String, List<String>> sriLankaGeoData = {
  "Western": ["Colombo", "Gampaha", "Kalutara"],
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "Eastern": ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Uva": ["Badulla", "Monaragala"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"]
};



/// Onboarding Screen faithfully replicating Frontend/src/Onboarding.jsx
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {  int _step = 1;
  
  bool _isSubmitting = false;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _houseNoController = TextEditingController();
  final TextEditingController _streetController = TextEditingController();
  final TextEditingController _areaController = TextEditingController();

  String? _selectedProvince;
  String? _selectedDistrict;

  double? _selectedLat = 6.9271; // Default Colombo, Sri Lanka
  double? _selectedLng = 79.8612;
  bool _hasCustomPin = false;

  @override
  void initState() {
    super.initState();
    final currentUser = AuthService().currentUser;
    _nameController.text = currentUser?.name ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _houseNoController.dispose();
    _streetController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  bool get _isPhoneValid => RegExp(r'^0\d{9}$').hasMatch(_phoneController.text.trim());

  bool get _isAddressComplete =>
      _houseNoController.text.trim().isNotEmpty &&
      _streetController.text.trim().isNotEmpty &&
      _areaController.text.trim().isNotEmpty &&
      (_selectedProvince != null && _selectedProvince!.isNotEmpty) &&
      (_selectedDistrict != null && _selectedDistrict!.isNotEmpty);

  void _handleGetLocation() {
    // Set to Colombo central coordinates or simulate high-accuracy geolocation
    setState(() {
      _selectedLat = 6.9271;
      _selectedLng = 79.8612;
      _hasCustomPin = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Location pinned at your current area (Colombo, LK)'),
        backgroundColor: AppColors.brandBlack,
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    final fullAddress = [
      _houseNoController.text.trim(),
      _streetController.text.trim(),
      _areaController.text.trim(),
      _selectedDistrict,
      _selectedProvince,
    ].where((part) => part != null && part.isNotEmpty).join(', ');

    setState(() {
      _isSubmitting = true;
    });

    try {
      final res = await ApiService().completeOnboarding(
        phoneNo: _phoneController.text.trim(),
        address: fullAddress,
        locationLat: _selectedLat,
        locationLng: _selectedLng,
      );

      if (!mounted) return;

      if (res['success'] == true) {
        // Also update local SharedPreferences and AuthService user model
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userName', _nameController.text.trim());
        await prefs.setString('phoneNo', _phoneController.text.trim());
        await prefs.setString('address', fullAddress);

        final current = AuthService().currentUser;
        if (current != null) {
          AuthService().currentUserNotifier.value = AuthUser(
            token: current.token,
            email: current.email,
            name: _nameController.text.trim().isNotEmpty ? _nameController.text.trim() : current.name,
            picture: current.picture,
            isNewUser: false,
            isWorker: current.isWorker,
            activeRole: current.activeRole,
            workerId: current.workerId,
            locationLat: _selectedLat,
            locationLng: _selectedLng,
          );
        }

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Onboarding complete! Welcome to Workio.'),
            backgroundColor: AppColors.success,
          ),
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainNavigationShell()),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Failed to save onboarding details.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error saving details: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
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
            ? Semantics(
                label: 'Back',
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.ink),
                  iconSize: 24,
                  padding: const EdgeInsets.all(10),
                  onPressed: () => setState(() => _step--),
                ),
              )
            : null,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 24),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      transitionBuilder: (Widget child, Animation<double> animation) {
                        return FadeTransition(
                          opacity: animation,
                          child: SlideTransition(
                            position: Tween<Offset>(
                              begin: const Offset(0.05, 0),
                              end: Offset.zero,
                            ).animate(animation),
                            child: child,
                          ),
                        );
                      },
                      child: Container(
                        key: ValueKey<int>(_step),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            StepProgress(current: _step, total: 4),
                            const SizedBox(height: 28),
                            if (_step == 1) _buildStep1Name(),
                            if (_step == 2) _buildStep2Phone(),
                            if (_step == 3) _buildStep3Address(),
                            if (_step == 4) _buildStep4Location(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: _buildBottomAction(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeading(String h1, String subline) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          h1,
          style: GoogleFonts.dmSans(
            fontSize: 32,
            height: 1.08,
            fontWeight: FontWeight.w700,
            letterSpacing: -1.0,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subline,
          style: GoogleFonts.dmSans(
            fontSize: 16,
            height: 1.5,
            color: AppColors.inkMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildStep1Name() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading('What should we call you?', 'This is the name neighbours and workers will see on your posts and bookings.'),
        const SizedBox(height: 28),
        WorkioTextField(
          label: 'Name',
          controller: _nameController,
          textInputAction: TextInputAction.done,
          keyboardType: TextInputType.name,
          autofillHints: const [AutofillHints.name],
          textCapitalization: TextCapitalization.words,
          autocorrect: false,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) {
            if (_nameController.text.trim().isNotEmpty) setState(() => _step = 2);
          },
        ),
      ],
    );
  }

  Widget _buildStep2Phone() {
    final phoneText = _phoneController.text.trim();
    final showError = phoneText.isNotEmpty && !_isPhoneValid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading('What is your phone number?', 'We need this to contact you for updates.'),
        const SizedBox(height: 28),
        WorkioTextField(
          label: 'Phone Number (10 digits)',
          controller: _phoneController,
          hintText: '07XXXXXXXX',
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          maxLength: 10,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          errorText: showError ? 'Phone number must be 10 digits starting with 0' : null,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) {
            if (_isPhoneValid) setState(() => _step = 3);
          },
        ),
      ],
    );
  }

  Widget _buildStep3Address() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading('What is your home address?', 'Where should workers come to provide services?'),
        const SizedBox(height: 28),
        WorkioTextField(
          label: 'House no/name',
          controller: _houseNoController,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        WorkioTextField(
          label: 'Street',
          controller: _streetController,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        WorkioTextField(
          label: 'Area',
          controller: _areaController,
          textInputAction: TextInputAction.done,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Province',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedProvince,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.ink, width: 2),
                      ),
                    ),
                    items: sriLankaGeoData.keys.map((p) {
                      return DropdownMenuItem(value: p, child: Text(p, style: GoogleFonts.dmSans(fontSize: 17, color: AppColors.ink)));
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedProvince = val;
                        _selectedDistrict = null;
                      });
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'District',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedDistrict,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.ink, width: 2),
                      ),
                    ),
                    items: (_selectedProvince == null ? <String>[] : (sriLankaGeoData[_selectedProvince] ?? []))
                        .map((d) => DropdownMenuItem(value: d, child: Text(d, style: GoogleFonts.dmSans(fontSize: 17, color: AppColors.ink))))
                        .toList(),
                    onChanged: _selectedProvince == null
                        ? null
                        : (val) {
                            setState(() {
                              _selectedDistrict = val;
                            });
                          },
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep4Location() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeading('Pin your location', 'Help workers find you exactly.'),
        const SizedBox(height: 28),
        Container(
          height: 280,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line, width: 1.5),
            color: AppColors.track,
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              SuperBassMap(
                latitude: _selectedLat ?? 6.9271,
                longitude: _selectedLng ?? 79.8612,
                zoom: 14.0,
                height: 280,
                borderRadius: 16,
                isInteractive: true,
                markerTitle: 'My Location',
                onLocationPicked: (point) {
                  setState(() {
                    _selectedLat = point.latitude;
                    _selectedLng = point.longitude;
                    _hasCustomPin = true;
                  });
                },
              ),
              Positioned(
                bottom: 16,
                left: 16,
                child: ElevatedButton.icon(
                  onPressed: _handleGetLocation,
                  icon: const Icon(Icons.my_location, size: 18, color: AppColors.ink),
                  label: Text(
                    'My Location',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    elevation: 3,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _hasCustomPin && _selectedLat != null && _selectedLng != null
              ? 'Selected: , '
              : 'Tap on the map to pin your location',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.inkMuted),
        ),
      ],
    );
  }

  Widget _buildBottomAction() {
    bool canProceed = false;
    VoidCallback? action;
    String label = 'Continue';

    if (_step == 1) {
      canProceed = _nameController.text.trim().isNotEmpty;
      action = () => setState(() => _step = 2);
    } else if (_step == 2) {
      canProceed = _isPhoneValid;
      action = () => setState(() => _step = 3);
    } else if (_step == 3) {
      canProceed = _isAddressComplete;
      action = () => setState(() => _step = 4);
    } else if (_step == 4) {
      canProceed = true;
      label = 'Finish';
      action = _handleSubmit;
    }

    return WorkioPrimaryButton(
      label: label,
      isLoading: _step == 4 && _isSubmitting,
      isLastStep: _step == 4,
      onPressed: canProceed ? action : null,
    );
  }
}
