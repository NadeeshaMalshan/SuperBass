import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../main.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';

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

/// Custom M3 9-Lobe Cookie Shape Painter (faithfully replicating Frontend/src/Onboarding.jsx generateM3CookiePath9)
class M3Cookie9Painter extends CustomPainter {
  final Color strokeColor;
  final Color fillColor;
  final double strokeWidth;

  M3Cookie9Painter({
    required this.strokeColor,
    required this.fillColor,
    this.strokeWidth = 2.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final rOuter = (size.width / 2) * 0.94;
    final rInner = (size.width / 2) * 0.78;
    const numLobes = 9;

    final points = <Map<String, double>>[];
    for (int i = 0; i < numLobes; i++) {
      final angleOuter = ((i * 360.0 / numLobes) - 90.0) * (math.pi / 180.0);
      final angleInner = (((i + 0.5) * 360.0 / numLobes) - 90.0) * (math.pi / 180.0);
      points.add({
        'xo': cx + rOuter * math.cos(angleOuter),
        'yo': cy + rOuter * math.sin(angleOuter),
        'xi': cx + rInner * math.cos(angleInner),
        'yi': cy + rInner * math.sin(angleInner),
        'angleOuter': angleOuter,
        'angleInner': angleInner,
      });
    }

    final path = Path();
    for (int i = 0; i < numLobes; i++) {
      final curr = points[i];
      final next = points[(i + 1) % numLobes];
      if (i == 0) {
        path.moveTo(curr['xo']!, curr['yo']!);
      }
      final cp1x = cx + rOuter * math.cos(curr['angleOuter']! + 0.16);
      final cp1y = cy + rOuter * math.sin(curr['angleOuter']! + 0.16);
      final cp2x = cx + rInner * math.cos(curr['angleInner']! - 0.16);
      final cp2y = cy + rInner * math.sin(curr['angleInner']! - 0.16);
      path.cubicTo(cp1x, cp1y, cp2x, cp2y, curr['xi']!, curr['yi']!);

      final cp3x = cx + rInner * math.cos(curr['angleInner']! + 0.16);
      final cp3y = cy + rInner * math.sin(curr['angleInner']! + 0.16);
      final cp4x = cx + rOuter * math.cos(next['angleOuter']! - 0.16);
      final cp4y = cy + rOuter * math.sin(next['angleOuter']! - 0.16);
      path.cubicTo(cp3x, cp3y, cp4x, cp4y, next['xo']!, next['yo']!);
    }
    path.close();

    if (fillColor != Colors.transparent) {
      final fillPaint = Paint()
        ..color = fillColor
        ..style = PaintingStyle.fill;
      canvas.drawPath(path, fillPaint);
    }

    if (strokeWidth > 0 && strokeColor != Colors.transparent) {
      final strokePaint = Paint()
        ..color = strokeColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth;
      canvas.drawPath(path, strokePaint);
    }
  }

  @override
  bool shouldRepaint(covariant M3Cookie9Painter oldDelegate) {
    return oldDelegate.strokeColor != strokeColor ||
        oldDelegate.fillColor != fillColor ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

/// M3 4-Step Stepper with cookie shapes and animated progress lines
class OnboardingStepper extends StatelessWidget {
  final int currentStep;
  const OnboardingStepper({super.key, required this.currentStep});

  @override
  Widget build(BuildContext context) {
    const steps = [1, 2, 3, 4];
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: steps.map((stepNum) {
        final isCompleted = stepNum < currentStep;
        final isActive = stepNum == currentStep;
        final index = stepNum - 1;

        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: index > 0
                    ? Container(
                        height: 2,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        color: stepNum <= currentStep ? Colors.black : const Color(0xFFF1F5F9),
                      )
                    : const SizedBox.shrink(),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
                width: 38,
                height: 38,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CustomPaint(
                      size: const Size(38, 38),
                      painter: M3Cookie9Painter(
                        fillColor: isCompleted || isActive ? Colors.black : Colors.white,
                        strokeColor: isCompleted || isActive ? Colors.black : const Color(0xFFE2E8F0),
                        strokeWidth: 2.0,
                      ),
                    ),
                    Text(
                      isCompleted ? '✓' : '$stepNum',
                      style: GoogleFonts.dmSans(
                        color: isCompleted || isActive ? Colors.white : const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w700,
                        fontSize: isCompleted ? 16 : 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: index < steps.length - 1
                    ? Container(
                        height: 2,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        color: isCompleted ? Colors.black : const Color(0xFFF1F5F9),
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

/// Onboarding Screen faithfully replicating Frontend/src/Onboarding.jsx
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _titleYAnim;
  late Animation<double> _titleScaleAnim;
  late Animation<double> _formOpacityAnim;
  late Animation<Offset> _formSlideAnim;

  int _step = 0;
  bool _showForm = false;
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

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _titleYAnim = Tween<double>(begin: 0.35, end: 0.0).animate(
      CurvedAnimation(parent: _animController, curve: const Cubic(0.4, 0.0, 0.2, 1.0)),
    );

    _titleScaleAnim = Tween<double>(begin: 1.35, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: const Cubic(0.4, 0.0, 0.2, 1.0)),
    );

    _formOpacityAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: const Interval(0.2, 1.0, curve: Curves.easeOut)),
    );

    _formSlideAnim = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
      CurvedAnimation(parent: _animController, curve: const Cubic(0.4, 0.0, 0.2, 1.0)),
    );

    // Initial delay for smooth headline scale-down transition
    Future.delayed(const Duration(milliseconds: 450), () {
      if (mounted) {
        setState(() {
          _showForm = true;
          _step = 1;
        });
        _animController.forward();
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
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
    final screenSize = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _animController,
          builder: (context, child) {
            return Center(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Animated Heading: "We want to know about YOU!"
                      Transform.translate(
                        offset: Offset(0, _titleYAnim.value * screenSize.height * 0.35),
                        child: Transform.scale(
                          scale: _titleScaleAnim.value,
                          alignment: Alignment.topCenter,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 24.0),
                            child: Text(
                              'We want to know about YOU!',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.dmSans(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF1E293B),
                                letterSpacing: -0.5,
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Stepper and Step Forms
                      if (_showForm)
                        FadeTransition(
                          opacity: _formOpacityAnim,
                          child: SlideTransition(
                            position: _formSlideAnim,
                            child: Column(
                              children: [
                                if (_step > 0) ...[
                                  OnboardingStepper(currentStep: _step),
                                  const SizedBox(height: 32),
                                ],

                                // STEP 1: NAME
                                if (_step == 1) _buildStep1Name(),

                                // STEP 2: PHONE NUMBER
                                if (_step == 2) _buildStep2Phone(),

                                // STEP 3: ADDRESS
                                if (_step == 3) _buildStep3Address(),

                                // STEP 4: PIN LOCATION
                                if (_step == 4) _buildStep4Location(),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // --- Step 1: Name ---
  Widget _buildStep1Name() {
    final hasName = _nameController.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'What is your name?',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _nameController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Name',
            labelStyle: GoogleFonts.dmSans(color: const Color(0xFF64748B)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.black, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          height: 56,
          child: ElevatedButton(
            onPressed: hasName ? () => setState(() => _step = 2) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandYellow,
              foregroundColor: Colors.black,
              disabledBackgroundColor: AppColors.brandYellow.withValues(alpha: 0.5),
              disabledForegroundColor: Colors.black38,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
            ),
            child: Text(
              'Next',
              style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }

  // --- Step 2: Phone Number ---
  Widget _buildStep2Phone() {
    final phoneText = _phoneController.text.trim();
    final showError = phoneText.isNotEmpty && !_isPhoneValid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'What is your phone number?',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Phone Number (10 digits)',
            hintText: '07XXXXXXXX',
            counterText: '',
            errorText: showError ? 'Phone number must be 10 digits starting with 0' : null,
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.black, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 56,
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = 1),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black,
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: Text(
                    'Back',
                    style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _isPhoneValid ? () => setState(() => _step = 3) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandYellow,
                    foregroundColor: Colors.black,
                    disabledBackgroundColor: AppColors.brandYellow.withValues(alpha: 0.5),
                    disabledForegroundColor: Colors.black38,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: Text(
                    'Next',
                    style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- Step 3: Address ---
  Widget _buildStep3Address() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'What is your home address?',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _houseNoController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'House no/name',
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.black, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _streetController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Street',
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.black, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _areaController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Area',
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.black, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            // Province Dropdown
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _selectedProvince,
                decoration: InputDecoration(
                  labelText: 'Province',
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.black, width: 1.5),
                  ),
                ),
                items: sriLankaGeoData.keys.map((p) {
                  return DropdownMenuItem(value: p, child: Text(p, style: GoogleFonts.dmSans(fontSize: 14)));
                }).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedProvince = val;
                    _selectedDistrict = null;
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            // District Dropdown
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _selectedDistrict,
                decoration: InputDecoration(
                  labelText: 'District',
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.black, width: 1.5),
                  ),
                ),
                items: (_selectedProvince == null ? <String>[] : (sriLankaGeoData[_selectedProvince] ?? []))
                    .map((d) => DropdownMenuItem(value: d, child: Text(d, style: GoogleFonts.dmSans(fontSize: 14))))
                    .toList(),
                onChanged: _selectedProvince == null
                    ? null
                    : (val) {
                        setState(() {
                          _selectedDistrict = val;
                        });
                      },
              ),
            ),
          ],
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 56,
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = 2),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black,
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: Text(
                    'Back',
                    style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _isAddressComplete ? () => setState(() => _step = 4) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandYellow,
                    foregroundColor: Colors.black,
                    disabledBackgroundColor: AppColors.brandYellow.withValues(alpha: 0.5),
                    disabledForegroundColor: Colors.black38,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: Text(
                    'Next',
                    style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- Step 4: Pin Location ---
  Widget _buildStep4Location() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Pin your location',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 20),

        // Interactive Map Container matching Frontend OpenStreetMap visual look
        Container(
          height: 280,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            color: const Color(0xFFE5E7EB),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              // OpenStreetMap tile background representation
              Positioned.fill(
                child: GestureDetector(
                  onTapDown: (details) {
                    final box = context.findRenderObject() as RenderBox?;
                    if (box != null) {
                      // Small coordinate jitter based on tap position for natural pinning
                      final normX = (details.localPosition.dx / 280.0) - 0.5;
                      final normY = (details.localPosition.dy / 280.0) - 0.5;
                      setState(() {
                        _selectedLat = 6.9271 + (normY * 0.04);
                        _selectedLng = 79.8612 + (normX * 0.04);
                        _hasCustomPin = true;
                      });
                    }
                  },
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Styled map grid / visual representation
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          image: const DecorationImage(
                            image: NetworkImage(
                              'https://tile.openstreetmap.org/13/4688/3187.png',
                            ),
                            fit: BoxFit.cover,
                            onError: null,
                          ),
                        ),
                      ),
                      Container(
                        color: Colors.black.withValues(alpha: 0.03),
                      ),
                      // Active Pin Marker with shadow
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.brandYellow,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 8,
                                  offset: Offset(0, 4),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.location_on,
                              color: Colors.black,
                              size: 28,
                            ),
                          ),
                          Container(
                            width: 8,
                            height: 4,
                            decoration: const BoxDecoration(
                              color: Colors.black38,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Floating "My Location" Button (matching Onboarding.jsx)
              Positioned(
                bottom: 16,
                right: 16,
                child: ElevatedButton.icon(
                  onPressed: _handleGetLocation,
                  icon: const Icon(Icons.my_location, size: 18, color: Colors.black),
                  label: Text(
                    'My Location',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
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
              ? 'Selected: ${_selectedLat!.toStringAsFixed(4)}, ${_selectedLng!.toStringAsFixed(4)}'
              : 'Tap on the map to pin your location',
          textAlign: TextAlign.center,
          style: GoogleFonts.dmSans(fontSize: 13, color: const Color(0xFF64748B)),
        ),

        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 56,
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = 3),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black,
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: Text(
                    'Back',
                    style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandYellow,
                    foregroundColor: Colors.black,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: LoadingIndicatorM3E(),
                        )
                      : Text(
                          'Complete',
                          style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
