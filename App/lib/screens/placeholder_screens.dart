import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../models/auth_user.dart';
import 'package:shared_preferences/shared_preferences.dart';

// -----------------------------------------------------------------------------
// EDIT PROFILE SCREEN
// -----------------------------------------------------------------------------
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService().currentUserNotifier.value;
    _nameController = TextEditingController(text: user?.name ?? '');
    _phoneController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final user = AuthService().currentUserNotifier.value;
    if (user != null) {
      final success = await ApiService().updateProfile(user.email, {
        "Name": _nameController.text.trim(),
        "PhoneNo": _phoneController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? "Profile updated successfully."
                  : "Failed to update profile.",
            ),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
        if (success) {
          // Ideally update AuthService here if needed
          Navigator.pop(context);
        }
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                ),
                validator: (val) => (val == null || val.isEmpty)
                    ? 'Please enter your name'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number (10 digits)',
                  hintText: '07XXXXXXXX',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ],
                validator: (val) {
                  if (val != null &&
                      val.trim().isNotEmpty &&
                      !RegExp(r'^0\d{9}$').hasMatch(val.trim())) {
                    return 'Phone number must be exactly 10 digits starting with 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _saveChanges,
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
                        'Save Changes',
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

// -----------------------------------------------------------------------------
// SAVED ADDRESSES SCREEN
// -----------------------------------------------------------------------------
class SavedAddressesScreen extends StatefulWidget {
  const SavedAddressesScreen({super.key});

  @override
  State<SavedAddressesScreen> createState() => _SavedAddressesScreenState();
}

class _SavedAddressesScreenState extends State<SavedAddressesScreen> {
  String? _currentAddress;
  bool _isLoading = true;
  LatLng _mapCenter = const LatLng(8.3114, 80.4037); // Default Anuradhapura / Sri Lanka
  late final MapController _mapController;

  static const Map<String, LatLng> _cityCoordinates = {
    'colombo': LatLng(6.9271, 79.8612),
    'homagama': LatLng(6.8436, 80.0032),
    'dehiwala': LatLng(6.8511, 79.8659),
    'mount lavinia': LatLng(6.8378, 79.8667),
    'moratuwa': LatLng(6.7730, 79.8816),
    'kotte': LatLng(6.8914, 79.9048),
    'kaduwela': LatLng(6.9333, 79.9833),
    'maharagama': LatLng(6.8480, 79.9265),
    'kesbewa': LatLng(6.7770, 79.9542),
    'battaramulla': LatLng(6.8983, 79.9192),
    'nugegoda': LatLng(6.8649, 79.8997),
    'malabe': LatLng(6.9037, 79.9555),
    'piliyandala': LatLng(6.8018, 79.9227),
    'gampaha': LatLng(7.0840, 79.9925),
    'negombo': LatLng(7.2008, 79.8736),
    'kelaniya': LatLng(6.9538, 79.9174),
    'wattala': LatLng(6.9895, 79.8920),
    'ja-ela': LatLng(7.0755, 79.8923),
    'kadawatha': LatLng(7.0016, 79.9542),
    'minuwangoda': LatLng(7.1652, 79.9525),
    'kalutara': LatLng(6.5854, 79.9607),
    'panadura': LatLng(6.7130, 79.9074),
    'horana': LatLng(6.7153, 80.0625),
    'beruwala': LatLng(6.4788, 79.9828),
    'matugama': LatLng(6.5222, 80.1147),
    'kandy': LatLng(7.2906, 80.6337),
    'peradeniya': LatLng(7.2605, 80.5960),
    'matale': LatLng(7.4675, 80.6234),
    'dambulla': LatLng(7.8742, 80.6511),
    'nuwara eliya': LatLng(6.9497, 80.7891),
    'hatton': LatLng(6.8916, 80.5964),
    'galle': LatLng(6.0535, 80.2210),
    'hikkaduwa': LatLng(6.1395, 80.1063),
    'matara': LatLng(5.9549, 80.5550),
    'weligama': LatLng(5.9729, 80.4287),
    'hambantota': LatLng(6.1429, 81.1212),
    'tangalle': LatLng(6.0242, 80.7941),
    'jaffna': LatLng(9.6615, 80.0255),
    'kilinochchi': LatLng(9.3803, 80.3770),
    'mannar': LatLng(8.9810, 79.9044),
    'vavuniya': LatLng(8.7542, 80.4982),
    'trincomalee': LatLng(8.5874, 81.2152),
    'batticaloa': LatLng(7.7310, 81.6747),
    'ampara': LatLng(7.2975, 81.6747),
    'kurunegala': LatLng(7.4863, 80.3623),
    'puttalam': LatLng(8.0362, 79.8283),
    'anuradhapura': LatLng(8.3114, 80.4037),
    'polonnaruwa': LatLng(7.9403, 81.0188),
    'badulla': LatLng(6.9934, 81.0550),
    'monaragala': LatLng(6.8728, 81.3507),
    'ratnapura': LatLng(6.6828, 80.4034),
    'kegalle': LatLng(7.2513, 80.3464),
  };

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    final user = AuthService().currentUserNotifier.value;
    if (user != null && user.locationLat != null && user.locationLng != null && user.locationLat != 0) {
      _mapCenter = LatLng(user.locationLat!, user.locationLng!);
    }
    _fetchAddress();
  }

  LatLng _deriveCoordinates(String address) {
    // Check if address is raw coordinates like "6.92710, 79.86120" or contains them
    final parts = address.split(',');
    if (parts.length >= 2) {
      final lat = double.tryParse(parts[0].trim());
      final lng = double.tryParse(parts[1].trim());
      if (lat != null && lng != null && lat >= 5.0 && lat <= 10.5 && lng >= 79.0 && lng <= 82.5) {
        return LatLng(lat, lng);
      }
    }
    final lower = address.toLowerCase();
    for (final entry in _cityCoordinates.entries) {
      if (lower.contains(entry.key)) {
        return entry.value;
      }
    }
    return const LatLng(6.9271, 79.8612); // Colombo default
  }

  Future<void> _fetchAddress() async {
    final user = AuthService().currentUserNotifier.value;
    if (user == null) {
      if (mounted) {
        setState(() {
          _currentAddress = null;
          _isLoading = false;
        });
      }
      return;
    }

    try {
      final profile = await ApiService().getResidentProfile(user.email);
      final prefs = await SharedPreferences.getInstance();

      String? addressStr = profile?['address']?.toString() ?? profile?['Address']?.toString();
      if (addressStr == null || addressStr.trim().isEmpty || addressStr == 'null') {
        addressStr = prefs.getString('address') ?? prefs.getString('userAddress');
      }

      double? lat = (profile?['locationLat'] as num?)?.toDouble() ??
                    (profile?['LocationLat'] as num?)?.toDouble() ??
                    (profile?['latitude'] as num?)?.toDouble() ??
                    (profile?['Latitude'] as num?)?.toDouble();

      double? lng = (profile?['locationLng'] as num?)?.toDouble() ??
                    (profile?['LocationLng'] as num?)?.toDouble() ??
                    (profile?['longitude'] as num?)?.toDouble() ??
                    (profile?['Longitude'] as num?)?.toDouble();

      if (lat == null || lng == null || (lat == 0 && lng == 0)) {
        lat = prefs.getDouble('locationLat') ??
              (prefs.getString('locationLat') != null ? double.tryParse(prefs.getString('locationLat')!) : null) ??
              user.locationLat;
        lng = prefs.getDouble('locationLng') ??
              (prefs.getString('locationLng') != null ? double.tryParse(prefs.getString('locationLng')!) : null) ??
              user.locationLng;
      }

      LatLng targetCoord;
      if (lat != null && lng != null && (lat != 0 || lng != 0)) {
        targetCoord = LatLng(lat, lng);
      } else if (addressStr != null && addressStr.trim().isNotEmpty) {
        targetCoord = _deriveCoordinates(addressStr);
      } else {
        targetCoord = const LatLng(6.9271, 79.8612);
      }

      // Sync to local preferences and auth user
      if (lat != null && lng != null) {
        await prefs.setDouble('locationLat', lat);
        await prefs.setDouble('locationLng', lng);
        if (AuthService().currentUserNotifier.value != null) {
          AuthService().currentUserNotifier.value =
              AuthService().currentUserNotifier.value!.copyWith(
                locationLat: lat,
                locationLng: lng,
              );
        }
      }
      if (addressStr != null && addressStr.isNotEmpty) {
        await prefs.setString('address', addressStr);
      }

      if (mounted) {
        setState(() {
          _currentAddress = (addressStr != null && addressStr.trim().isNotEmpty) ? addressStr.trim() : null;
          _mapCenter = targetCoord;
          _isLoading = false;
        });
        _mapController.move(targetCoord, 15.0);
      }
    } catch (e) {
      debugPrint('Error fetching address: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _recenterMap() {
    _mapController.move(_mapCenter, 15.0);
  }

  Future<void> _showAddAddressSheet() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (_) => _MapPickerScreen(
          initialPoint: _mapCenter,
          initialLabel: (_currentAddress != null && !_currentAddress!.contains(',')) ? _currentAddress : null,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result == null || !mounted) return;

    final LatLng picked = result['point'] as LatLng;
    final String label = result['label'] as String? ?? '';

    setState(() => _isLoading = true);
    final user = AuthService().currentUserNotifier.value;
    if (user == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    final String nearestDist = LocationService.findNearestDistrict(picked.latitude, picked.longitude);
    final String addressToSave = label.isNotEmpty ? label : nearestDist;

    final success = await ApiService().updateProfile(
      user.email,
      {
        'Address': addressToSave,
        'District': nearestDist,
        'district': nearestDist,
        'LocationLat': picked.latitude,
        'LocationLng': picked.longitude,
        'locationLat': picked.latitude,
        'locationLng': picked.longitude,
        'Latitude': picked.latitude,
        'Longitude': picked.longitude,
      },
    );

    if (mounted) {
      if (success) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('address', addressToSave);
        await prefs.setString('selected_city', nearestDist);
        await prefs.setString('selected_find_location', nearestDist);
        await prefs.setDouble('locationLat', picked.latitude);
        await prefs.setDouble('locationLng', picked.longitude);
        if (AuthService().currentUserNotifier.value != null) {
          AuthService().currentUserNotifier.value =
              AuthService().currentUserNotifier.value!.copyWith(
                locationLat: picked.latitude,
                locationLng: picked.longitude,
              );
        }

        setState(() {
          _currentAddress = addressToSave;
          _mapCenter = picked;
          _isLoading = false;
        });
        _mapController.move(picked, 15.5);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Address updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update address.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top;
    final mapHeight = mediaQuery.size.height * 0.42;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // -------------------------------------------------------------
          // TOP MAP SECTION
          // -------------------------------------------------------------
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: mapHeight + 35, // extra overlap behind rounded sheet
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: _mapCenter,
                initialZoom: 14.5,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.superbass.app',
                  fallbackUrl: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                ),
                // Radius halo
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: _mapCenter,
                      radius: 46,
                      color: Colors.black.withValues(alpha: 0.12),
                      borderStrokeWidth: 0,
                    ),
                    CircleMarker(
                      point: _mapCenter,
                      radius: 28,
                      color: Colors.black.withValues(alpha: 0.08),
                      borderStrokeWidth: 0,
                    ),
                  ],
                ),
                // Marker with black capsule label
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _mapCenter,
                      width: 140,
                      height: 80,
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Text(
                              'Primary address',
                              style: GoogleFonts.dmSans(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.25),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // -------------------------------------------------------------
          // BACK BUTTON (TOP-LEFT CIRCLE)
          // -------------------------------------------------------------
          Positioned(
            top: topPadding + 12,
            left: 16,
            child: Material(
              color: Colors.white,
              elevation: 4,
              shadowColor: Colors.black26,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => Navigator.of(context).pop(),
                child: const SizedBox(
                  width: 44,
                  height: 44,
                  child: Icon(
                    Icons.chevron_left_rounded,
                    size: 28,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ),



          // -------------------------------------------------------------
          // BOTTOM SHEET: SAVED ADDRESSES
          // -------------------------------------------------------------
          Positioned(
            top: mapHeight,
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 16,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Text(
                      'Saved addresses',
                      style: GoogleFonts.dmSans(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Address List item
                  Expanded(
                    child: _isLoading
                        ? const Center(
                            child: CircularProgressIndicator(color: Colors.black),
                          )
                        : ListView(
                            padding: const EdgeInsets.symmetric(horizontal: 20.0),
                            children: [
                              InkWell(
                                onTap: _showAddAddressSheet,
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      // Grey circle icon
                                      Container(
                                        width: 48,
                                        height: 48,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F3F5),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.location_on_outlined,
                                          color: Colors.black,
                                          size: 22,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      // Text
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Saved Address',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 17,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.black,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              _currentAddress ?? 'No saved address',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w400,
                                                color: Colors.grey.shade600,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Divider(
                                height: 1,
                                thickness: 0.8,
                                color: Colors.grey.shade200,
                              ),
                            ],
                          ),
                  ),

                  // Bottom Change Address Button
                  Padding(
                    padding: EdgeInsets.only(
                      left: 20.0,
                      right: 20.0,
                      bottom: mediaQuery.padding.bottom + 20,
                      top: 10,
                    ),
                    child: SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _showAddAddressSheet,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.add, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'Change Address',
                              style: GoogleFonts.dmSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// MAP PICKER SCREEN
// Returns {point: LatLng, label: String} when the user confirms.
// -----------------------------------------------------------------------------
class _MapPickerScreen extends StatefulWidget {
  final LatLng initialPoint;
  final String? initialLabel;
  const _MapPickerScreen({required this.initialPoint, this.initialLabel});

  @override
  State<_MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends State<_MapPickerScreen> {
  late final MapController _mc;
  late LatLng _picked;
  bool _locating = false;
  late final TextEditingController _labelCtrl;

  @override
  void initState() {
    super.initState();
    _mc = MapController();
    _picked = widget.initialPoint;
    _labelCtrl = TextEditingController(text: widget.initialLabel ?? '');
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    super.dispose();
  }

  Future<void> _useGPS() async {
    setState(() => _locating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location services are disabled.')),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission denied.')),
            );
          }
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission permanently denied. Enable it in settings.'),
            ),
          );
        }
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      final pt = LatLng(pos.latitude, pos.longitude);
      if (mounted) {
        setState(() => _picked = pt);
        _mc.move(pt, 16.0);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not get location: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final topPad = mq.padding.top;
    final bottomPad = mq.padding.bottom;

    return Scaffold(
      backgroundColor: Colors.white,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          // ── Full-screen tappable map ─────────────────────────────────────
          Positioned.fill(
            child: FlutterMap(
              mapController: _mc,
              options: MapOptions(
                initialCenter: _picked,
                initialZoom: 15.0,
                onTap: (tapPos, latlng) {
                  setState(() => _picked = latlng);
                },
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.superbass.app',
                  fallbackUrl:
                      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                ),
                // Halo circles
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: _picked,
                      radius: 52,
                      color: Colors.black.withValues(alpha: 0.10),
                      borderStrokeWidth: 0,
                    ),
                    CircleMarker(
                      point: _picked,
                      radius: 30,
                      color: Colors.black.withValues(alpha: 0.07),
                      borderStrokeWidth: 0,
                    ),
                  ],
                ),
                // Pin marker
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _picked,
                      width: 40,
                      height: 56,
                      alignment: Alignment.bottomCenter,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.30),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.location_on_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          CustomPaint(
                            size: const Size(12, 8),
                            painter: _PinTailPainter(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── Back button ──────────────────────────────────────────────────
          Positioned(
            top: topPad + 12,
            left: 16,
            child: Material(
              color: Colors.white,
              elevation: 4,
              shadowColor: Colors.black26,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => Navigator.of(context).pop(),
                child: const SizedBox(
                  width: 44,
                  height: 44,
                  child: Icon(Icons.chevron_left_rounded, size: 28),
                ),
              ),
            ),
          ),

          // ── Title badge ──────────────────────────────────────────────────
          Positioned(
            top: topPad + 14,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  'Tap to place pin',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),
            ),
          ),

          // ── GPS button (right) ───────────────────────────────────────────
          Positioned(
            bottom: bottomPad + 260,
            right: 16,
            child: Material(
              color: Colors.white,
              elevation: 4,
              shadowColor: Colors.black26,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _locating ? null : _useGPS,
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: _locating
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Icon(
                          Icons.my_location_rounded,
                          size: 22,
                          color: Colors.black,
                        ),
                ),
              ),
            ),
          ),

          // ── Bottom card ──────────────────────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 20,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              padding: EdgeInsets.fromLTRB(
                24,
                20,
                24,
                bottomPad + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Drag handle
                  Center(
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Selected Location',
                    style: GoogleFonts.dmSans(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Coordinates chip
                  Row(
                    children: [
                      const Icon(Icons.pin_drop_outlined, size: 15, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text(
                        '${LocationService.findNearestDistrict(_picked.latitude, _picked.longitude)} • ${_picked.latitude.toStringAsFixed(4)}, ${_picked.longitude.toStringAsFixed(4)}',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Optional label / street name
                  TextField(
                    controller: _labelCtrl,
                    style: GoogleFonts.dmSans(fontSize: 15),
                    decoration: InputDecoration(
                      labelText: 'Address label (optional)',
                      hintText: 'e.g. 42 Galle Rd, Colombo 3',
                      labelStyle: GoogleFonts.dmSans(color: Colors.grey.shade600),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Colors.black, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 54,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop({
                          'point': _picked,
                          'label': _labelCtrl.text.trim(),
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30),
                        ),
                      ),
                      child: Text(
                        'Confirm Location',
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
        ],
      ),
    );
  }
}

/// Tiny triangle tail beneath the circular pin.
class _PinTailPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black;
    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_PinTailPainter oldDelegate) => false;
}

// -----------------------------------------------------------------------------
// PRIVACY & SECURITY SCREEN
// -----------------------------------------------------------------------------
class PrivacySecurityScreen extends StatefulWidget {
  const PrivacySecurityScreen({super.key});

  @override
  State<PrivacySecurityScreen> createState() => _PrivacySecurityScreenState();
}

class _PrivacySecurityScreenState extends State<PrivacySecurityScreen> {
  bool _isLoading = false;

  Future<void> _deleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'Are you sure you want to delete your account? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final user = AuthService().currentUserNotifier.value;
      if (user != null) {
        final success = await ApiService().deleteProfile(user.email);
        if (mounted) {
          setState(() => _isLoading = false);
          if (success) {
            await AuthService().logout();
            if (mounted) {
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil('/join', (route) => false);
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to delete account.')),
            );
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Advanced Options')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Divider(height: 64),
            const Text(
              'Danger Zone',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _deleteAccount,
              style: ElevatedButton.styleFrom(
                elevation: 0,
                foregroundColor: Colors.red,
                backgroundColor: const Color(0xFFFEE2E2),
              ),
              child: const Text('Delete Account'),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// HELP & SUPPORT SCREEN
// -----------------------------------------------------------------------------
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: const Center(child: Text('Please contact support@workio.com')),
    );
  }
}

// -----------------------------------------------------------------------------
// WORKER ONBOARDING SCREEN
// -----------------------------------------------------------------------------
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
          await prefs.setString('activeRole', 'Worker');

          AuthService().currentUserNotifier.value = AuthUser(
            token: user.token,
            email: user.email,
            name: user.name,
            picture: user.picture,
            isNewUser: user.isNewUser,
            isWorker: true,
            activeRole: 'Worker',
            workerId: worker.id,
          );
          if (mounted) Navigator.pop(context);
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