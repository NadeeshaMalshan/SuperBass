import 'dart:async';
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/app_notification_model.dart';
import 'models/auth_user.dart';
import 'models/booking_model.dart';
import 'models/worker_model.dart';
import 'screens/chat_screen.dart';
import 'screens/community_screen.dart';
import 'screens/join_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/worker/worker_portal_screen.dart';
import 'screens/worker/worker_onboarding_screen.dart';
import 'screens/workio_ai_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'services/api_config.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/chat_signalr_service.dart';
import 'services/notification_service.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/app_components.dart';
import 'widgets/review_sheet.dart';
import 'widgets/review_summary.dart';
import 'widgets/verified_badge.dart';
import 'widgets/notifications_sheet.dart';
import 'widgets/m3_bottom_nav_bar.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'data/sri_lanka_locations.dart';
import 'services/location_service.dart';
import 'widgets/superbass_map.dart';
import 'utils/url_launcher_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Note: .env file loading: $e');
  }

  // Initialize OneSignal Push Notifications (Android/iOS)
  if (!kIsWeb) {
    try {
      final appId = ApiConfig.onesignalAppId;
      if (appId.isNotEmpty) {
        OneSignal.Debug.setLogLevel(
          kDebugMode ? OSLogLevel.verbose : OSLogLevel.none,
        );
        OneSignal.initialize(appId);
        OneSignal.Notifications.requestPermission(true);
      }
    } catch (e) {
      debugPrint('OneSignal initialization error: $e');
    }
  }

  await AuthService().init();
  await NotificationService().initialize();
  runApp(const SuperBassApp());
}

class SuperBassApp extends StatelessWidget {
  final String? initialRoute;
  const SuperBassApp({super.key, this.initialRoute});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Workio',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: initialRoute ?? '/',
      routes: {
        '/': (context) => const MainNavigationShell(),
        '/join': (context) => const JoinScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
      },
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  StreamSubscription? _chatMsgSub;

  @override
  void initState() {
    super.initState();
    _initNotifications();
  }

  void _initNotifications() {
    final user = AuthService().currentUser;
    if (user != null) {
      NotificationService().startListening(user.email, isWorker: user.isWorker);
      ChatSignalRService().connect(user.email);
      _checkUnreadChats(user.email);
    }

    _chatMsgSub = ChatSignalRService().onMessageReceived.listen((_) {
      final u = AuthService().currentUser;
      if (u != null) _checkUnreadChats(u.email);
    });

    AuthService().currentUserNotifier.addListener(_onAuthChanged);
  }

  Future<void> _checkUnreadChats(String email) async {
    try {
      final convs = await ApiService().fetchConversations(email);
      int total = 0;
      for (final c in convs) {
        if (c['unreadCount'] is int) {
          total += c['unreadCount'] as int;
        }
      }
      ChatSignalRService().setUnreadChatCount(total);
    } catch (_) {}
  }

  void _onAuthChanged() {
    final user = AuthService().currentUser;
    if (user != null) {
      NotificationService().startListening(user.email, isWorker: user.isWorker);
      ChatSignalRService().connect(user.email);
      _checkUnreadChats(user.email);
    } else {
      NotificationService().onUserLogout();
      ChatSignalRService().disconnect();
      ChatSignalRService().setUnreadChatCount(0);
    }
  }

  @override
  void dispose() {
    _chatMsgSub?.cancel();
    AuthService().currentUserNotifier.removeListener(_onAuthChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AuthUser?>(
      valueListenable: AuthService().currentUserNotifier,
      builder: (context, user, _) {
        final bool isLoggedIn = user != null;

        // Role Guard: When an authenticated user is a Worker, lock the interface to the Worker Portal.
        // They cannot be a resident unless they explicitly revert via Worker Profile & Settings ("Revert to Resident Mode").
        if (isLoggedIn && (user.isWorker || user.activeRole == 'Worker')) {
          if (user.isNewWorker) {
            return const WorkerOnboardingScreen();
          }
          return const WorkerPortalScreen();
        }

        final List<Widget> pages = [
          const FindTabScreen(),
          const CommunityScreen(),
          if (isLoggedIn) const BookingsTabScreen(),
          if (isLoggedIn) const ChatsTabScreen(),
          const ProfileScreen(),
        ];

        return ValueListenableBuilder<int>(
          valueListenable: ChatSignalRService().unreadChatCountNotifier,
          builder: (context, unreadChatCount, _) {
            final List<M3BottomNavItem> navItems = [
              const M3BottomNavItem(
                icon: Icons.search_outlined,
                selectedIcon: Icons.search_rounded,
                label: 'Find',
              ),
              const M3BottomNavItem(
                icon: Icons.groups_outlined,
                selectedIcon: Icons.groups_rounded,
                label: 'Community',
              ),
              if (isLoggedIn) ...[
                const M3BottomNavItem(
                  icon: Icons.calendar_today_outlined,
                  selectedIcon: Icons.calendar_month_rounded,
                  label: 'Bookings',
                ),
                M3BottomNavItem(
                  icon: Icons.chat_bubble_outline_rounded,
                  selectedIcon: Icons.chat_bubble_rounded,
                  label: 'Chats',
                  hasBadge: unreadChatCount > 0,
                ),
              ],
              const M3BottomNavItem(
                icon: Icons.person_outline_rounded,
                selectedIcon: Icons.person_rounded,
                label: 'Account',
              ),
            ];

            // Ensure current index is within bounds if tabs change dynamically
            final effectiveIndex = _currentIndex >= navItems.length
                ? navItems.length - 1
                : _currentIndex;

            return Scaffold(
              body: IndexedStack(index: effectiveIndex, children: pages),
              floatingActionButton: (isLoggedIn && effectiveIndex == 0)
                  ? _buildAiFloatingButton(context)
                  : null,
              floatingActionButtonLocation:
                  FloatingActionButtonLocation.endFloat,
              bottomNavigationBar: M3BottomNavigationBar(
                selectedIndex: effectiveIndex,
                items: navItems,
                onItemSelected: (index) {
                  setState(() {
                    _currentIndex = index;
                  });
                },
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAiFloatingButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0, right: 2.0),
      child: Material(
        color: Colors.transparent,
        elevation: 6,
        shadowColor: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(28),
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WorkioAiScreen(
                  onNavigateToTab: (index) {
                    setState(() {
                      _currentIndex = index;
                    });
                  },
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(28),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.2),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(4),
                  child: Image.asset(
                    'assets/images/Workio_Logo_Black_WithOut_Text.png',
                    fit: BoxFit.contain,
                    errorBuilder: (_, error, stackTrace) => const Center(
                      child: Text(
                        'W',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Workio AI',
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: Colors.white,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 1. FIND SERVICES TAB
class FindTabScreen extends StatefulWidget {
  const FindTabScreen({super.key});

  @override
  State<FindTabScreen> createState() => _FindTabScreenState();
}

class _FindTabScreenState extends State<FindTabScreen> {
  int? _selectedCategoryIndex;
  List<WorkerModel> _workers = [];
  bool _isLoading = true;
  String _selectedCity = 'Colombo';
  String? _primaryAddressCity;
  double? _residentLat;
  double? _residentLng;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  Timer? _debounce;
  int _requestId = 0;
  String _workerFilter = 'all'; // 'all' or 'verified'

  final List<Map<String, dynamic>> _categories = [
    {
      'name': 'Plumber',
      'skill': 'Plumbing',
      'image': 'assets/icons/plumbing.png',
    },
    {
      'name': 'Electrician',
      'skill': 'Electrical',
      'image': 'assets/icons/electrical.png',
    },
    {
      'name': 'Carpenter',
      'skill': 'Carpentry',
      'image': 'assets/icons/carpentry.png',
    },
    {
      'name': 'Painter',
      'skill': 'Painting',
      'image': 'assets/icons/painting.png',
    },
    {
      'name': 'Mason',
      'skill': 'Masonry & Construction',
      'image': 'assets/icons/masonry.png',
    },
    {
      'name': 'AC Repair',
      'skill': 'AC & Air Conditioning',
      'image': 'assets/icons/ac_repair.png',
    },
    {
      'name': 'Welding',
      'skill': 'Welding',
      'image': 'assets/icons/welding.png',
    },
    {
      'name': 'Cleaning',
      'skill': 'Cleaning',
      'image': 'assets/icons/cleaning.png',
    },
    {
      'name': 'Gardening',
      'skill': 'Gardening & Landscaping',
      'image': 'assets/icons/gardening.png',
    },
    {
      'name': 'Handyman',
      'skill': 'Handyman Services',
      'image': 'assets/icons/handyman.png',
    },
    {
      'name': 'Mechanic',
      'skill': 'Vehicle Repair & Mechanic',
      'image': 'assets/icons/mechanic.png',
    },
    {
      'name': 'Roofing',
      'skill': 'Roofing',
      'image': 'assets/icons/roofing.png',
    },
    {
      'name': 'Glass & Windows',
      'skill': 'Glass & Window Services',
      'image': 'assets/icons/glass_window.png',
    },
    {
      'name': 'Locksmith',
      'skill': 'Locksmith',
      'image': 'assets/icons/locksmith.png',
    },
    {
      'name': 'Appliance',
      'skill': 'Appliance Repair',
      'image': 'assets/icons/appliance_repair.png',
    },
    {
      'name': 'Computer/IT',
      'skill': 'Computer & IT Services',
      'image': 'assets/icons/computer_it.png',
    },
    {
      'name': 'Phone Repair',
      'skill': 'Phone Repair',
      'image': 'assets/icons/phone_repair.png',
    },
    {
      'name': 'Moving',
      'skill': 'Moving & Transport',
      'image': 'assets/icons/moving.png',
    },
    {
      'name': 'Furniture',
      'skill': 'Furniture Repair & Assembly',
      'image': 'assets/icons/furniture_repair.png',
    },
    {
      'name': 'Pest Control',
      'skill': 'Pest Control',
      'image': 'assets/icons/pest_control.png',
    },
    {
      'name': 'CCTV',
      'skill': 'CCTV Installation & Repair',
      'image': 'assets/icons/cctv.png',
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialLocation();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialLocation() async {
    try {
      final coords = await LocationService.getCurrentCoordinates();
      if (coords != null && coords['lat'] != null && coords['lng'] != null) {
        _residentLat = coords['lat'];
        _residentLng = coords['lng'];
      }
    } catch (_) {}

    try {
      final prefs = await SharedPreferences.getInstance();
      final isManual = prefs.getBool('is_manual_location') ?? false;
      final saved = prefs.getString('selected_find_location');
      final bool isSavedNumeric =
          saved != null &&
          (double.tryParse(saved) != null ||
              RegExp(r'^\s*[-+]?[0-9]').hasMatch(saved));

      if (isManual && saved != null && saved.isNotEmpty && !isSavedNumeric) {
        if (mounted) {
          setState(() {
            _selectedCity = saved;
          });
        }
        _fetchWorkers();
      } else {
        // Resolve district from user's primary address or GPS
        final user = AuthService().currentUser;
        final primaryDistrict = await LocationService.getPrimaryAddressCity(
          user?.email,
        );
        final gpsCity = await LocationService.detectGpsCity();
        final cityToUse =
            (primaryDistrict != null &&
                primaryDistrict.isNotEmpty &&
                !RegExp(r'^\s*[-+]?[0-9]').hasMatch(primaryDistrict))
            ? primaryDistrict
            : ((gpsCity != null && gpsCity.isNotEmpty)
                  ? gpsCity
                  : ((saved != null && !isSavedNumeric) ? saved : 'Colombo'));
        if (mounted) {
          setState(() {
            _selectedCity = cityToUse;
          });
        }
        await LocationService.setSelectedCity(cityToUse);
        await prefs.setString('selected_find_location', cityToUse);
        _fetchWorkers();
      }
    } catch (_) {
      _fetchWorkers();
    }
    _loadPrimaryAddress();
  }

  Future<void> _loadPrimaryAddress() async {
    try {
      final user = AuthService().currentUser;
      final city = await LocationService.getPrimaryAddressCity(user?.email);
      if (mounted &&
          city != null &&
          city.isNotEmpty &&
          !RegExp(r'^\s*[-+]?[0-9]').hasMatch(city)) {
        final prefs = await SharedPreferences.getInstance();
        final isNumericCity = RegExp(r'^\s*[-+]?[0-9]').hasMatch(_selectedCity);
        setState(() {
          _primaryAddressCity = city;
          if (_selectedCity.isEmpty || isNumericCity) {
            _selectedCity = city;
          }
        });
        if (isNumericCity) {
          await LocationService.setSelectedCity(city);
          await prefs.setString('selected_find_location', city);
          _fetchWorkers();
        }
      }
    } catch (_) {}
  }

  String _getWorkerDistanceText(WorkerModel worker) {
    if (worker.distance != null && worker.distance! >= 0) {
      if (worker.distance! < 0.5) {
        return '< 1 km';
      }
      return '${worker.distance!.toStringAsFixed(1)} km';
    }

    double? resLat = _residentLat;
    double? resLng = _residentLng;

    if (resLat == null || resLng == null) {
      if (_selectedCity != 'All Locations' && _selectedCity.trim().isNotEmpty) {
        final c = LocationService.getCoordinatesForPlace(_selectedCity);
        if (c != null) {
          resLat = c['lat'];
          resLng = c['lng'];
        }
      }
      if (resLat == null || resLng == null) {
        final c = LocationService.getCoordinatesForPlace(_primaryAddressCity);
        if (c != null) {
          resLat = c['lat'];
          resLng = c['lng'];
        }
      }
      if (resLat == null || resLng == null) {
        final user = AuthService().currentUserNotifier.value;
        resLat = user?.locationLat;
        resLng = user?.locationLng;
      }
      if (resLat == null || resLng == null) {
        resLat = 6.9271;
        resLng = 79.8612;
      }
    }

    double? wLat = worker.locationLat;
    double? wLng = worker.locationLng;

    if (wLat == null || wLng == null) {
      final wCoords = LocationService.getCoordinatesForPlace(
        worker.primaryServiceArea,
      );
      if (wCoords != null) {
        wLat = wCoords['lat'];
        wLng = wCoords['lng'];
      }
    }

    if (wLat != null && wLng != null) {
      final dist = LocationService.calculateDistanceKm(
        resLat,
        resLng,
        wLat,
        wLng,
      );
      if (dist < 0.5) {
        return '< 1 km';
      }
      return '${dist.toStringAsFixed(1)} km';
    }

    if (worker.primaryServiceArea != null &&
        _selectedCity != 'All Locations' &&
        LocationService.workerMatchesLocation(
          worker.primaryServiceArea,
          _selectedCity,
        )) {
      return '< 3 km';
    }

    return 'Nearby';
  }

  Future<void> _fetchWorkers() async {
    _requestId++;
    final currentRequestId = _requestId;

    setState(() {
      _isLoading = true;
    });

    try {
      final selectedSkill = _selectedCategoryIndex != null
          ? _categories[_selectedCategoryIndex!]['skill'] as String?
          : null;
      final isAllLocations =
          _selectedCity == 'All Locations' || _selectedCity.trim().isEmpty;
      final locationQuery = isAllLocations ? null : _selectedCity.trim();

      // Resolve resident coordinates to send to backend search
      double? resLat = _residentLat;
      double? resLng = _residentLng;

      if (resLat == null || resLng == null) {
        if (!isAllLocations) {
          final placeCoords = LocationService.getCoordinatesForPlace(
            _selectedCity,
          );
          if (placeCoords != null) {
            resLat = placeCoords['lat'];
            resLng = placeCoords['lng'];
          }
        }
        if (resLat == null || resLng == null) {
          final placeCoords = LocationService.getCoordinatesForPlace(
            _primaryAddressCity,
          );
          if (placeCoords != null) {
            resLat = placeCoords['lat'];
            resLng = placeCoords['lng'];
          }
        }
        if (resLat == null || resLng == null) {
          final user = AuthService().currentUserNotifier.value;
          resLat = user?.locationLat;
          resLng = user?.locationLng;
        }
        if (resLat == null || resLng == null) {
          resLat = 6.9271;
          resLng = 79.8612;
        }
        _residentLat = resLat;
        _residentLng = resLng;
      }

      debugPrint(
        'SEARCHDBG: starting _fetchWorkers. q: "$_searchQuery", skill: "$selectedSkill", location: "$locationQuery"',
      );

      final list = await ApiService().fetchWorkers(
        q: _searchQuery,
        skill: selectedSkill,
        location: locationQuery,
        residentLat: resLat,
        residentLng: resLng,
        onlyVerified: false,
      );

      debugPrint('SEARCHDBG: fetched ${list.length} workers from ApiService');

      if (!mounted || currentRequestId != _requestId) return;

      final filtered = isAllLocations
          ? list
          : list.where((w) {
              return LocationService.workerMatchesLocation(
                w.primaryServiceArea,
                _selectedCity,
              );
            }).toList();

      debugPrint(
        'SEARCHDBG: after filtering (isAllLocations=$isAllLocations), remaining: ${filtered.length}',
      );

      if (mounted) {
        setState(() {
          _workers = filtered;
          _isLoading = false;
        });
        debugPrint(
          'SEARCHDBG: assigned _workers, new count: ${_workers.length}',
        );
      }
    } catch (e, st) {
      debugPrint('SEARCHDBG: error in _fetchWorkers - $e\n$st');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _updateCity(String newCity, {bool isManual = true}) {
    setState(() {
      _selectedCity = newCity;
      if (newCity != 'All Locations' && newCity.trim().isNotEmpty) {
        final coords = LocationService.getCoordinatesForPlace(newCity);
        if (coords != null) {
          _residentLat = coords['lat'];
          _residentLng = coords['lng'];
        }
      }
    });
    LocationService.setSelectedCity(newCity);
    SharedPreferences.getInstance().then(
      (prefs) => prefs.setBool('is_manual_location', isManual),
    );
    _fetchWorkers();
  }

  void _showLocationPickerSheet() {
    final TextEditingController searchController = TextEditingController();
    bool isDetecting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final query = searchController.text.trim().toLowerCase();

          const sriLankaDistricts = [
            'All Locations',
            'Ampara',
            'Anuradhapura',
            'Badulla',
            'Batticaloa',
            'Colombo',
            'Galle',
            'Gampaha',
            'Hambantota',
            'Jaffna',
            'Kalutara',
            'Kandy',
            'Kegalle',
            'Kilinochchi',
            'Kurunegala',
            'Mannar',
            'Matale',
            'Matara',
            'Monaragala',
            'Mullaitivu',
            'Nuwara Eliya',
            'Polonnaruwa',
            'Puttalam',
            'Ratnapura',
            'Trincomalee',
            'Vavuniya',
          ];

          final List<Map<String, String>> matchingPlaces = [];
          if (query.isNotEmpty) {
            for (final entry in SriLankaLocations.districtDsMap.entries) {
              final district = entry.key;
              if (district.toLowerCase().contains(query)) {
                matchingPlaces.add({'name': district, 'type': 'District'});
              }
              for (final ds in entry.value) {
                final dsName = ds.split('/').first.split('-').first.trim();
                if (dsName.toLowerCase().contains(query)) {
                  matchingPlaces.add({
                    'name': dsName,
                    'type': '$district District',
                  });
                }
              }
            }
          }

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.85,
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 12),
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 16, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select Location',
                            style: GoogleFonts.dmSans(
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                              color: Colors.black,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Find verified pros available in your city',
                            style: GoogleFonts.dmSans(
                              fontSize: 12.5,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close, color: Colors.black),
                        tooltip: 'Close',
                      ),
                    ],
                  ),
                ),
                const Divider(
                  height: 1,
                  thickness: 1,
                  color: Color(0xFFEEEEEE),
                ),

                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    children: [
                      // Option 1: Use Current Location (GPS)
                      InkWell(
                        onTap: isDetecting
                            ? null
                            : () async {
                                setModalState(() => isDetecting = true);
                                try {
                                  final city =
                                      await LocationService.detectGpsCity();
                                  if (mounted &&
                                      city != null &&
                                      city.isNotEmpty) {
                                    _updateCity(city, isManual: false);
                                    if (ctx.mounted) Navigator.pop(ctx);
                                  } else {
                                    setModalState(() => isDetecting = false);
                                    if (mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Could not detect GPS location. Please check location permissions in settings.',
                                          ),
                                        ),
                                      );
                                    }
                                  }
                                } catch (_) {
                                  setModalState(() => isDetecting = false);
                                }
                              },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            borderRadius: BorderRadius.circular(12),
                            color: const Color(0xFFFAFAFA),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: const BoxDecoration(
                                  color: Colors.black,
                                  shape: BoxShape.circle,
                                ),
                                child: isDetecting
                                    ? const Padding(
                                        padding: EdgeInsets.all(10.0),
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(
                                        Icons.my_location,
                                        size: 19,
                                        color: Colors.white,
                                      ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Use Current Location',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isDetecting
                                          ? 'Detecting your district via GPS...'
                                          : 'Detect your district using device GPS',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                size: 20,
                                color: Colors.grey,
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Option 2: Use Primary Address City
                      InkWell(
                        onTap: () async {
                          if (_primaryAddressCity != null &&
                              _primaryAddressCity!.isNotEmpty) {
                            _updateCity(_primaryAddressCity!);
                            Navigator.pop(ctx);
                          } else {
                            final user = AuthService().currentUser;
                            final city =
                                await LocationService.getPrimaryAddressCity(
                                  user?.email,
                                );
                            if (city != null && city.isNotEmpty) {
                              _primaryAddressCity = city;
                              _updateCity(city);
                              if (ctx.mounted) Navigator.pop(ctx);
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'No primary address found. Please enter or select a city below.',
                                    ),
                                  ),
                                );
                              }
                            }
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            borderRadius: BorderRadius.circular(12),
                            color: const Color(0xFFFAFAFA),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: const BoxDecoration(
                                  color: Colors.black,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.home_outlined,
                                  size: 20,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Use Primary Address',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      (_primaryAddressCity != null &&
                                              _primaryAddressCity!.isNotEmpty)
                                          ? 'Saved: $_primaryAddressCity'
                                          : 'From your resident account profile',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                size: 20,
                                color: Colors.grey,
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Search text input
                      TextField(
                        controller: searchController,
                        onChanged: (_) => setModalState(() {}),
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          color: Colors.black,
                        ),
                        decoration: InputDecoration(
                          hintText:
                              'Search city or district (e.g. Ratnapura, Erathna)...',
                          hintStyle: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: Colors.grey[500],
                          ),
                          prefixIcon: const Icon(
                            Icons.search,
                            size: 20,
                            color: Colors.black87,
                          ),
                          suffixIcon: searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    searchController.clear();
                                    setModalState(() {});
                                  },
                                )
                              : null,
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),

                      // If manual query has text, show "Use '<query>'" tile so user can type any custom name
                      if (searchController.text.trim().isNotEmpty) ...[
                        const SizedBox(height: 10),
                        InkWell(
                          onTap: () {
                            final custom = LocationService.cleanLocationName(
                              searchController.text.trim(),
                            );
                            if (custom.isNotEmpty) {
                              _updateCity(custom);
                              Navigator.pop(ctx);
                            }
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  size: 18,
                                  color: Colors.white,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Use "${searchController.text.trim()}"',
                                    style: GoogleFonts.dmSans(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13.5,
                                      color: Colors.white,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const Icon(
                                  Icons.arrow_forward,
                                  size: 16,
                                  color: Colors.white,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],

                      // If search query is empty, show Popular Cities chips
                      if (searchController.text.trim().isEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Districts (Sri Lanka)',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: sriLankaDistricts.map((city) {
                            final isSelected =
                                _selectedCity.toLowerCase() ==
                                city.toLowerCase();
                            return ChoiceChip(
                              label: Text(city),
                              selected: isSelected,
                              onSelected: (_) {
                                _updateCity(city);
                                Navigator.pop(ctx);
                              },
                              selectedColor: Colors.black,
                              backgroundColor: const Color(0xFFF1F5F9),
                              labelStyle: GoogleFonts.dmSans(
                                fontSize: 12.5,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : Colors.black87,
                              ),
                              side: BorderSide(
                                color: isSelected
                                    ? Colors.black
                                    : const Color(0xFFE2E8F0),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                              showCheckmark: false,
                            );
                          }).toList(),
                        ),
                      ],

                      // If search query is not empty, show matching results from SriLankaLocations
                      if (query.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        Text(
                          'Matching Locations (${matchingPlaces.length})',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (matchingPlaces.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16.0),
                            child: Center(
                              child: Text(
                                'No official district/division found.\nYou can tap "Use \\"${searchController.text}\\"" above.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ),
                          )
                        else
                          ...matchingPlaces.map((place) {
                            final name = place['name']!;
                            final type = place['type']!;
                            final isSelected =
                                _selectedCity.toLowerCase() ==
                                name.toLowerCase();
                            return ListTile(
                              dense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 0,
                              ),
                              leading: Icon(
                                Icons.location_on_outlined,
                                size: 20,
                                color: isSelected
                                    ? Colors.black
                                    : Colors.grey[600],
                              ),
                              title: Text(
                                name,
                                style: GoogleFonts.dmSans(
                                  fontSize: 14,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: Colors.black,
                                ),
                              ),
                              subtitle: Text(
                                type,
                                style: GoogleFonts.dmSans(
                                  fontSize: 11.5,
                                  color: Colors.grey[600],
                                ),
                              ),
                              trailing: isSelected
                                  ? const Icon(
                                      Icons.check,
                                      size: 18,
                                      color: Colors.black,
                                    )
                                  : null,
                              onTap: () {
                                _updateCity(name);
                                Navigator.pop(ctx);
                              },
                            );
                          }),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _onCategorySelected(int index) {
    setState(() {
      if (_selectedCategoryIndex == index) {
        _selectedCategoryIndex = null;
      } else {
        _selectedCategoryIndex = index;
      }
    });
    _fetchWorkers();
  }

  void _showBookingSheet(WorkerModel worker) async {
    final prefs = await SharedPreferences.getInstance();
    final user = AuthService().currentUser;
    final userEmail = user?.email ?? prefs.getString('email') ?? '';

    String initialPhone =
        prefs.getString('phoneNo') ?? prefs.getString('userPhone') ?? '';
    String initialAddress =
        prefs.getString('address') ?? prefs.getString('userAddress') ?? '';
    double? initialLat =
        user?.locationLat ??
        prefs.getDouble('locationLat') ??
        (prefs.getString('locationLat') != null
            ? double.tryParse(prefs.getString('locationLat')!)
            : null);
    double? initialLng =
        user?.locationLng ??
        prefs.getDouble('locationLng') ??
        (prefs.getString('locationLng') != null
            ? double.tryParse(prefs.getString('locationLng')!)
            : null);

    if (userEmail.isNotEmpty) {
      try {
        final profile = await ApiService().getResidentProfile(userEmail);
        if (profile != null) {
          final pPhone = profile['phoneNo'] as String?;
          if (pPhone != null && pPhone.isNotEmpty) {
            initialPhone = pPhone;
            await prefs.setString('phoneNo', initialPhone);
          }
          final pAddr = profile['address'] as String?;
          if (pAddr != null && pAddr.isNotEmpty) {
            initialAddress = pAddr;
            await prefs.setString('address', initialAddress);
          }
          if (profile['locationLat'] != null) {
            initialLat = (profile['locationLat'] as num).toDouble();
            await prefs.setDouble('locationLat', initialLat);
          }
          if (profile['locationLng'] != null) {
            initialLng = (profile['locationLng'] as num).toDouble();
            await prefs.setDouble('locationLng', initialLng);
          }
        }
      } catch (e) {
        debugPrint('Error loading user profile for booking sheet: $e');
      }
    }

    final titleController = TextEditingController();
    final descController = TextEditingController();
    final phoneController = TextEditingController(text: initialPhone);
    final addressController = TextEditingController(text: initialAddress);

    DateTime? selectedDate = DateTime.now().add(const Duration(days: 1));
    bool isSubmitting = false;
    String selectedUrgency = 'Medium';

    // GPS location state
    bool hasSavedCoordinates = initialLat != null && initialLng != null;
    double locationLat = initialLat ?? 6.9271;
    double locationLng = initialLng ?? 79.8612;
    bool isLocatingGps = false;

    bool shareGps = hasSavedCoordinates;

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Circular Close Button (x)
                GestureDetector(
                  onTap: () => Navigator.pop(sheetContext),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: const BoxDecoration(
                      color: Color(0xFFF1F3F5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      color: Colors.black,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Title: Request service
                Text(
                  'Request service',
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w800,
                    fontSize: 26,
                    color: Colors.black,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 16),

                // Worker Card Header
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F3F5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      // Avatar Circle with initial or picture
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          color: Colors.black,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            worker.name.isNotEmpty
                                ? worker.name[0].toUpperCase()
                                : 'W',
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              worker.name,
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: Colors.black,
                              ),
                            ),
                            Text(
                              worker.skills.isNotEmpty
                                  ? worker.skills.first
                                  : 'General Service',
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                color: const Color(0xFF8E8E93),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        worker.hourlyRate > 0
                            ? 'Rs. ${worker.hourlyRate.round().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}/hr'
                            : worker.pricingModel,
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Job title
                Text(
                  'Job title',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: titleController,
                  style: GoogleFonts.dmSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                  decoration: InputDecoration(
                    hintText:
                        'Need help with ${worker.skills.isNotEmpty ? worker.skills.first : "home service"}',
                    hintStyle: GoogleFonts.dmSans(
                      color: const Color(0xFF8E8E93),
                      fontSize: 15,
                      fontWeight: FontWeight.normal,
                    ),
                    prefixIcon: const Icon(
                      Icons.work_outline_rounded,
                      size: 20,
                      color: Colors.black87,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF1F3F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Description / scope of work
                Text(
                  'Description / scope of work',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  style: GoogleFonts.dmSans(fontSize: 14, color: Colors.black),
                  decoration: InputDecoration(
                    hintText: 'Describe what needs to be done',
                    hintStyle: GoogleFonts.dmSans(
                      color: const Color(0xFF8E8E93),
                      fontSize: 14,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF1F3F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Urgency Pill Selector
                Text(
                  'Urgency',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: ['Low', 'Medium', 'High'].map((urg) {
                    final isSelected = selectedUrgency == urg;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setModalState(() => selectedUrgency = urg),
                        child: Container(
                          margin: EdgeInsets.only(
                            right: urg == 'High' ? 0 : 10,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.black
                                : const Color(0xFFF1F3F5),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Center(
                            child: Text(
                              urg,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : Colors.black,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 18),

                // Contact phone
                Text(
                  'Contact phone',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  style: GoogleFonts.dmSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(
                      Icons.phone_outlined,
                      size: 20,
                      color: Colors.black87,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF1F3F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Preferred date
                Text(
                  'Preferred date',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  readOnly: true,
                  controller: TextEditingController(
                    text: selectedDate == null
                        ? ''
                        : '${selectedDate!.day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedDate!.month - 1]} ${selectedDate!.year}',
                  ),
                  style: GoogleFonts.dmSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(
                      Icons.calendar_today_outlined,
                      size: 19,
                      color: Colors.black87,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF1F3F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                  onTap: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: selectedDate ?? DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (d != null) setModalState(() => selectedDate = d);
                  },
                ),
                const SizedBox(height: 18),

                // Location address
                Text(
                  'Location address',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6E6E73),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: addressController,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(
                      Icons.location_on_outlined,
                      size: 20,
                      color: Colors.black87,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF1F3F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Share saved GPS location section card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F3F5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Share saved GPS location',
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: Colors.black,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Saved pin: ${locationLat.toStringAsFixed(5)}, ${locationLng.toStringAsFixed(5)}',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 12,
                                    color: const Color(0xFF8E8E93),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: shareGps,
                            activeColor: Colors.white,
                            activeTrackColor: Colors.black,
                            inactiveThumbColor: Colors.white,
                            inactiveTrackColor: const Color(0xFFE5E5EA),
                            onChanged: (val) {
                              setModalState(() {
                                shareGps = val;
                              });
                            },
                          ),
                        ],
                      ),
                      if (shareGps) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Stack(
                            children: [
                              SuperBassMap(
                                latitude: locationLat,
                                longitude: locationLng,
                                height: 160,
                                borderRadius: 16,
                                isInteractive: true,
                                markerTitle: '',
                                onLocationPicked: (point) {
                                  setModalState(() {
                                    locationLat = point.latitude;
                                    locationLng = point.longitude;
                                    hasSavedCoordinates = true;
                                  });
                                },
                              ),
                              Positioned(
                                top: 10,
                                left: 10,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: isLocatingGps
                                      ? null
                                      : () async {
                                          setModalState(() {
                                            isLocatingGps = true;
                                          });
                                          try {
                                            final coords =
                                                await LocationService.getCurrentCoordinates();
                                            if (coords != null &&
                                                coords['lat'] != null &&
                                                coords['lng'] != null) {
                                              final lat = coords['lat']!;
                                              final lng = coords['lng']!;
                                              setModalState(() {
                                                locationLat = lat;
                                                locationLng = lng;
                                                hasSavedCoordinates = true;
                                                isLocatingGps = false;
                                              });
                                              try {
                                                final district =
                                                    await LocationService.reverseGeocodeToDistrict(
                                                      lat,
                                                      lng,
                                                    );
                                                if (district != null &&
                                                    addressController.text
                                                        .trim()
                                                        .isEmpty) {
                                                  setModalState(() {
                                                    addressController.text =
                                                        district;
                                                  });
                                                }
                                              } catch (_) {}
                                            } else {
                                              setModalState(() {
                                                isLocatingGps = false;
                                              });
                                              if (sheetContext.mounted) {
                                                ScaffoldMessenger.of(
                                                  sheetContext,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Could not access device GPS. Please enable location permissions.',
                                                    ),
                                                  ),
                                                );
                                              }
                                            }
                                          } catch (e) {
                                            setModalState(() {
                                              isLocatingGps = false;
                                            });
                                            if (sheetContext.mounted) {
                                              ScaffoldMessenger.of(
                                                sheetContext,
                                              ).showSnackBar(
                                                SnackBar(
                                                  content: Text(
                                                    'GPS error: $e',
                                                  ),
                                                ),
                                              );
                                            }
                                          }
                                        },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: const [
                                        BoxShadow(
                                          color: Colors.black12,
                                          blurRadius: 4,
                                          offset: Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (isLocatingGps) ...[
                                          const SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor:
                                                  AlwaysStoppedAnimation<Color>(
                                                    Colors.black,
                                                  ),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Locating...',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.black,
                                            ),
                                          ),
                                        ] else ...[
                                          const Icon(
                                            Icons.my_location,
                                            size: 14,
                                            color: Colors.black,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Use my location',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.black,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tap the map to move the pin. Selected: ${locationLat.toStringAsFixed(6)}, ${locationLng.toStringAsFixed(6)}',
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            color: const Color(0xFF8E8E93),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Bottom Buttons (Cancel & Submit Request)
                Row(
                  children: [
                    Expanded(
                      flex: 1,
                      child: SizedBox(
                        height: 52,
                        child: TextButton(
                          onPressed: () => Navigator.pop(sheetContext),
                          style: TextButton.styleFrom(
                            backgroundColor: const Color(0xFFF1F3F5),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Text(
                            'Cancel',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 52,
                        child: ElevatedButton(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  final phone = phoneController.text.trim();
                                  if (!RegExp(r'^0\d{9}$').hasMatch(phone)) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Phone number must be exactly 10 digits starting with 0 (e.g. 0771234567).',
                                        ),
                                        backgroundColor: AppColors.error,
                                      ),
                                    );
                                    return;
                                  }

                                  setModalState(() => isSubmitting = true);

                                  DateTime? finalDate = selectedDate != null
                                      ? DateTime.utc(
                                          selectedDate!.year,
                                          selectedDate!.month,
                                          selectedDate!.day,
                                        )
                                      : null;

                                  final scaffoldMessenger =
                                      ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(sheetContext);

                                  final booking = await ApiService()
                                      .createBooking(
                                        workerId: worker.id,
                                        jobTitle: titleController.text.trim(),
                                        description: descController.text.trim(),
                                        urgency: selectedUrgency,
                                        scheduledDate: finalDate,
                                        locationAddress:
                                            addressController.text
                                                .trim()
                                                .isNotEmpty
                                            ? addressController.text.trim()
                                            : 'Colombo',
                                        contactPhone: phoneController.text
                                            .trim(),
                                        estimatedPrice: worker.hourlyRate > 0
                                            ? worker.hourlyRate
                                            : 2500.0,
                                        pricingModel: worker.pricingModel,
                                        locationLat: shareGps
                                            ? locationLat
                                            : null,
                                        locationLng: shareGps
                                            ? locationLng
                                            : null,
                                      );

                                  if (sheetContext.mounted) {
                                    navigator.pop();
                                  }
                                  if (mounted) {
                                    if (booking != null) {
                                      scaffoldMessenger.showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Booking #${booking.id} created with ${worker.name}!',
                                          ),
                                          backgroundColor: Colors.black,
                                        ),
                                      );
                                    } else {
                                      scaffoldMessenger.showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Failed to create booking. Check backend connection.',
                                          ),
                                          backgroundColor: Colors.black,
                                        ),
                                      );
                                    }
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(
                                  'Submit request',
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showWorkerDetailSheet(WorkerModel worker) {
    final isLoggedIn = AuthService().currentUser != null;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surfaceVariant,
                    ),
                    child: ClipOval(
                      child:
                          (worker.profileImage != null &&
                              worker.profileImage!.isNotEmpty &&
                              worker.profileImage != 'null')
                          ? Image.network(
                              worker.profileImage!,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  Center(
                                    child: Text(
                                      worker.name.isNotEmpty
                                          ? worker.name[0].toUpperCase()
                                          : 'W',
                                      style: GoogleFonts.dmSans(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 24,
                                      ),
                                    ),
                                  ),
                            )
                          : Center(
                              child: Text(
                                worker.name.isNotEmpty
                                    ? worker.name[0].toUpperCase()
                                    : 'W',
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 24,
                                ),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                worker.name,
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 20,
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ),
                            if (worker.isVerified) ...[
                              const SizedBox(width: 4),
                              const VerifiedBadge(size: 18),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          worker.skills.isNotEmpty
                              ? worker.skills.join(', ')
                              : 'General Pro',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w500,
                            fontSize: 14,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(
                              Icons.star_rounded,
                              size: 18,
                              color: AppColors.starRating,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              (worker.overallRating != null &&
                                      worker.overallRating! > 0)
                                  ? worker.overallRating!.toStringAsFixed(1)
                                  : '0',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                            if (worker.completedJobs > 0) ...[
                              const SizedBox(width: 4),
                              Text(
                                '(${worker.completedJobs} jobs)',
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  color: AppColors.onSurfaceVariant,
                                ),
                              ),
                            ],
                            const SizedBox(width: 12),
                            const Icon(
                              Icons.location_on_outlined,
                              size: 15,
                              color: AppColors.onSurfaceVariant,
                            ),
                            const SizedBox(width: 2),
                            Flexible(
                              child: Text(
                                '${worker.primaryServiceArea ?? 'Colombo'} • ${_getWorkerDistanceText(worker)}',
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  color: AppColors.onSurfaceVariant,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Divider(color: AppColors.outlineVariant, height: 1),
              const SizedBox(height: 16),
              if (worker.description != null &&
                  worker.description!.isNotEmpty) ...[
                Text(
                  'About',
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  worker.description!,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    color: const Color(0xFF4B5563),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              Text(
                'Skills & Services',
                style: GoogleFonts.dmSans(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: worker.skills
                    .map(
                      (skill) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(9999),
                        ),
                        child: Text(
                          skill,
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 24),
              if (isLoggedIn)
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(sheetContext);
                      _showBookingSheet(worker);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandYellow,
                      foregroundColor: AppColors.onPrimary,
                      elevation: 0,
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      'Book Now',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.onPrimary,
                      ),
                    ),
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'Please sign in to book this pro or request a service.',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      color: AppColors.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: NotificationBellButton(
              onNotificationTap: (n) {
                if (n.type == NotificationType.chat && n.referenceId != null) {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        conversationId: n.referenceId!,
                        name: n.metadata?['name']?.toString() ?? 'Conversation',
                        profileImage: n.metadata?['profileImage']?.toString(),
                      ),
                    ),
                  );
                } else if (n.type == NotificationType.communityLike ||
                    n.type == NotificationType.communityComment) {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const Scaffold(
                        body: SafeArea(child: CommunityScreen()),
                      ),
                    ),
                  );
                }
              },
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchWorkers,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: _showLocationPickerSheet,
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.location_on_outlined,
                              size: 19,
                              color: AppColors.brandBlack,
                            ),
                            const SizedBox(width: 5),
                            Flexible(
                              child: Text(
                                _selectedCity,
                                style: GoogleFonts.dmSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.brandBlack,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 20,
                              color: AppColors.brandBlack,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Find Trusted Community Pros',
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(fontSize: 24, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'AI-powered recommendations for neighborhood home services.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    ServiceSearchBar(
                      controller: _searchController,
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val.trim();
                        });
                        if (_debounce?.isActive ?? false) _debounce!.cancel();
                        _debounce = Timer(
                          const Duration(milliseconds: 400),
                          () {
                            _fetchWorkers();
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),

              // Uber-style Feature & Promo Banners (Community & AI)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: UberPromoCarousel(
                  banners: [
                    UberPromoBanner(
                      title: 'Find workers from\nCommunity Hub',
                      subtitle: 'Connect, discuss &\nget trusted local help',
                      buttonText: 'Explore now',
                      imageAsset: 'assets/icons/community.png',
                      blobColor: const Color(0xFFFFECE5),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => Scaffold(
                              appBar: AppBar(
                                title: Text(
                                  'Community',
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 20,
                                  ),
                                ),
                              ),
                              body: const SafeArea(child: CommunityScreen()),
                            ),
                          ),
                        );
                      },
                    ),
                    UberPromoBanner(
                      title: 'AI Smart Assistant\nFind best pros fast!',
                      subtitle: 'Instant diagnosis &\nsmart matching',
                      buttonText: 'Try AI Match',
                      imageAsset: 'assets/icons/AI.png',
                      blobColor: const Color(0xFFE8F1FF),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const WorkioAiScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Category Trades Grid/List
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Browse Categories',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontSize: 18),
                ),
              ),

              const SizedBox(height: 12),

              SizedBox(
                height: 105,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _categories.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return SizedBox(
                      width: 76,
                      child: CategoryCard(
                        title: cat['name'] as String,
                        icon: cat['icon'] as IconData?,
                        imageAsset: cat['image'] as String?,
                        count: _workerFilter == 'verified'
                            ? _workers.where((w) => w.isVerified).length
                            : _workers.length,
                        isSelected: _selectedCategoryIndex == index,
                        onTap: () => _onCategorySelected(index),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 28),

              // Nearby Pros with Sorting / Filter List (All, Verified)
              Builder(
                builder: (context) {
                  final verifiedWorkers = _workers
                      .where((worker) => worker.isVerified)
                      .toList();
                  final displayWorkers = _workerFilter == 'verified'
                      ? verifiedWorkers
                      : _workers;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'Featured Workers Near You',
                                style: Theme.of(
                                  context,
                                ).textTheme.titleLarge?.copyWith(fontSize: 18),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            PopupMenuButton<String>(
                              initialValue: _workerFilter,
                              tooltip: 'Sort / Filter workers',
                              onSelected: (String value) {
                                setState(() {
                                  _workerFilter = value;
                                });
                              },
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 4,
                              shadowColor: Colors.black.withValues(alpha: 0.12),
                              color: Colors.white,
                              position: PopupMenuPosition.under,
                              itemBuilder: (BuildContext context) =>
                                  <PopupMenuEntry<String>>[
                                    PopupMenuItem<String>(
                                      value: 'all',
                                      height: 42,
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.people_outline_rounded,
                                            size: 18,
                                            color: _workerFilter == 'all'
                                                ? Colors.black
                                                : Colors.grey[600],
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              'All (${_workers.length})',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 13.5,
                                                fontWeight:
                                                    _workerFilter == 'all'
                                                    ? FontWeight.w700
                                                    : FontWeight.w500,
                                                color: _workerFilter == 'all'
                                                    ? Colors.black
                                                    : Colors.grey[800],
                                              ),
                                            ),
                                          ),
                                          if (_workerFilter == 'all')
                                            const Icon(
                                              Icons.check_rounded,
                                              size: 17,
                                              color: Colors.black,
                                            ),
                                        ],
                                      ),
                                    ),
                                    const PopupMenuDivider(height: 1),
                                    PopupMenuItem<String>(
                                      value: 'verified',
                                      height: 42,
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.verified,
                                            size: 18,
                                            color: AppColors.brandYellowHover,
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              'Verified (${verifiedWorkers.length})',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 13.5,
                                                fontWeight:
                                                    _workerFilter == 'verified'
                                                    ? FontWeight.w700
                                                    : FontWeight.w500,
                                                color:
                                                    _workerFilter == 'verified'
                                                    ? Colors.black
                                                    : Colors.grey[800],
                                              ),
                                            ),
                                          ),
                                          if (_workerFilter == 'verified')
                                            const Icon(
                                              Icons.check_rounded,
                                              size: 17,
                                              color: AppColors.brandYellowHover,
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _workerFilter == 'verified'
                                        ? AppColors.brandYellowHover.withValues(
                                            alpha: 0.5,
                                          )
                                        : const Color(0xFFE2E8F0),
                                    width: 1.2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(
                                        alpha: 0.04,
                                      ),
                                      blurRadius: 4,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (_workerFilter == 'verified') ...[
                                      const Icon(
                                        Icons.verified,
                                        size: 15,
                                        color: AppColors.brandYellowHover,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Verified (${verifiedWorkers.length})',
                                        style: GoogleFonts.dmSans(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.brandYellowHover,
                                        ),
                                      ),
                                    ] else ...[
                                      Icon(
                                        Icons.people_outline_rounded,
                                        size: 15,
                                        color: Colors.grey[700],
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'All (${_workers.length})',
                                        style: GoogleFonts.dmSans(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.black87,
                                        ),
                                      ),
                                    ],
                                    const SizedBox(width: 3),
                                    const Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      size: 16,
                                      color: Colors.black54,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Live Workers list from backend
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: _isLoading
                            ? const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(40.0),
                                  child: LoadingIndicatorM3E(),
                                ),
                              )
                            : displayWorkers.isEmpty
                            ? Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(32),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceVariant.withValues(
                                    alpha: 0.5,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      _workerFilter == 'verified'
                                          ? Icons.verified_user_outlined
                                          : Icons.person_search_outlined,
                                      size: 48,
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      _searchQuery.isNotEmpty
                                          ? 'No workers matching "$_searchQuery"'
                                          : (_workerFilter == 'verified' &&
                                                _workers.isNotEmpty)
                                          ? 'No verified workers found in $_selectedCity'
                                          : (_selectedCity == 'All Locations'
                                                ? 'No workers found in this category'
                                                : 'No workers found in $_selectedCity'),
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.dmSans(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      (_workerFilter == 'verified' &&
                                              _workers.isNotEmpty)
                                          ? 'Switch filter to "All" to view all available workers'
                                          : (_selectedCity == 'All Locations'
                                                ? 'Try selecting "All Pros" or refreshing'
                                                : 'Try selecting "All Locations" or another city'),
                                      style: GoogleFonts.dmSans(
                                        fontSize: 13,
                                        color: AppColors.onSurfaceVariant,
                                      ),
                                    ),
                                    if (_workerFilter == 'verified' &&
                                        _workers.isNotEmpty) ...[
                                      const SizedBox(height: 14),
                                      ElevatedButton(
                                        onPressed: () {
                                          setState(() {
                                            _workerFilter = 'all';
                                          });
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.brandBlack,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: const StadiumBorder(),
                                        ),
                                        child: Text(
                                          'Show All Workers (${_workers.length})',
                                          style: GoogleFonts.dmSans(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13.5,
                                          ),
                                        ),
                                      ),
                                    ] else if (_selectedCity !=
                                        'All Locations') ...[
                                      const SizedBox(height: 14),
                                      ElevatedButton(
                                        onPressed: () =>
                                            _updateCity('All Locations'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.brandBlack,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: const StadiumBorder(),
                                        ),
                                        child: Text(
                                          'View All Locations',
                                          style: GoogleFonts.dmSans(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13.5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              )
                            : ValueListenableBuilder<AuthUser?>(
                                valueListenable:
                                    AuthService().currentUserNotifier,
                                builder: (context, currentUser, _) {
                                  final isLoggedIn = currentUser != null;
                                  return Column(
                                    children: displayWorkers.map((worker) {
                                      final trade = worker.skills.isNotEmpty
                                          ? worker.skills.first
                                          : 'General Pro';
                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 12.0,
                                        ),
                                        child: WorkerCard(
                                          name: worker.name,
                                          trade: trade,
                                          rating: worker.overallRating,
                                          reviewCount: worker.completedJobs,
                                          location:
                                              worker.primaryServiceArea ??
                                              'Colombo',
                                          distance: _getWorkerDistanceText(
                                            worker,
                                          ),
                                          profileImage: worker.profileImage,
                                          isVerified: worker.isVerified,
                                          showBookNow: isLoggedIn,
                                          onBookTap: isLoggedIn
                                              ? () => _showBookingSheet(worker)
                                              : null,
                                          onProfileTap: () =>
                                              _showWorkerDetailSheet(worker),
                                        ),
                                      );
                                    }).toList(),
                                  );
                                },
                              ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

/// 3. BOOKINGS TAB
class BookingsTabScreen extends StatefulWidget {
  const BookingsTabScreen({super.key});

  @override
  State<BookingsTabScreen> createState() => _BookingsTabScreenState();
}

class _BookingsTabScreenState extends State<BookingsTabScreen> {
  List<BookingModel> _bookings = [];
  bool _isLoading = true;
  int _selectedTabIndex = 0; // 0: Requests, 1: Active, 2: History, 3: All
  String _sortBy = 'Date'; // 'Date' or 'Priority'

  @override
  void initState() {
    super.initState();
    _fetchBookings();
  }

  Future<void> _fetchBookings() async {
    final email = AuthService().currentUser?.email;
    if (email == null || email.isEmpty) {
      setState(() {
        _bookings = [];
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);
    final bookings = await ApiService().fetchResidentBookings(email);
    if (mounted) {
      setState(() {
        _bookings = bookings;
        _isLoading = false;
      });
    }
  }

  int _getUrgencyWeight(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  List<BookingModel> _sortBookings(List<BookingModel> list) {
    final sorted = List<BookingModel>.from(list);
    if (_sortBy == 'Priority') {
      sorted.sort((a, b) {
        final weightA = _getUrgencyWeight(a.urgency);
        final weightB = _getUrgencyWeight(b.urgency);
        if (weightA != weightB) {
          return weightB.compareTo(weightA); // High priority first
        }
        final dateA = a.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        final dateB = b.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        return dateB.compareTo(dateA);
      });
    } else {
      sorted.sort((a, b) {
        final dateA = a.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        final dateB = b.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        return dateB.compareTo(dateA); // Newest date first
      });
    }
    return sorted;
  }

  void _showSortOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Sort Bookings By',
              style: GoogleFonts.dmSans(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(
                Icons.calendar_today_rounded,
                color: Colors.black,
              ),
              title: Text(
                'Date (Newest First)',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
              ),
              trailing: _sortBy == 'Date'
                  ? const Icon(Icons.check_circle_rounded, color: Colors.black)
                  : null,
              onTap: () {
                setState(() => _sortBy = 'Date');
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.priority_high_rounded,
                color: Colors.black,
              ),
              title: Text(
                'Priority (High Urgency First)',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
              ),
              trailing: _sortBy == 'Priority'
                  ? const Icon(Icons.check_circle_rounded, color: Colors.black)
                  : null,
              onTap: () {
                setState(() => _sortBy = 'Priority');
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  Map<String, double> _extractBookingCoordinates(BookingModel b) {
    if (b.locationAddress.isNotEmpty) {
      final gpsRegex = RegExp(
        r'\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]',
        caseSensitive: false,
      );
      final match = gpsRegex.firstMatch(b.locationAddress);
      if (match != null) {
        final lat = double.tryParse(match.group(1) ?? '');
        final lng = double.tryParse(match.group(2) ?? '');
        if (lat != null && lng != null && lat != 0 && lng != 0) {
          return {'lat': lat, 'lng': lng};
        }
      }
      final rawRegex = RegExp(r'([-\d.]+)\s*,\s*([-\d.]+)');
      final rawMatch = rawRegex.firstMatch(b.locationAddress);
      if (rawMatch != null) {
        final lat = double.tryParse(rawMatch.group(1) ?? '');
        final lng = double.tryParse(rawMatch.group(2) ?? '');
        if (lat != null &&
            lng != null &&
            lat.abs() <= 90 &&
            lng.abs() <= 180 &&
            lat != 0 &&
            lng != 0) {
          return {'lat': lat, 'lng': lng};
        }
      }
    }
    if (b.description.isNotEmpty) {
      final gmapRegex = RegExp(
        r'maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)',
        caseSensitive: false,
      );
      final gmapMatch = gmapRegex.firstMatch(b.description);
      if (gmapMatch != null) {
        final lat = double.tryParse(gmapMatch.group(1) ?? '');
        final lng = double.tryParse(gmapMatch.group(2) ?? '');
        if (lat != null && lng != null) return {'lat': lat, 'lng': lng};
      }
      final gpsDescRegex = RegExp(
        r'\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]',
        caseSensitive: false,
      );
      final gpsDescMatch = gpsDescRegex.firstMatch(b.description);
      if (gpsDescMatch != null) {
        final lat = double.tryParse(gpsDescMatch.group(1) ?? '');
        final lng = double.tryParse(gpsDescMatch.group(2) ?? '');
        if (lat != null && lng != null) return {'lat': lat, 'lng': lng};
      }
    }
    return {'lat': 6.9271, 'lng': 79.8612};
  }

  void _showBookingDetails(BookingModel b) {
    // ── Date formatting ───────────────────────────────────────────
    String scheduledDateStr = 'Flexible / ASAP';
    if (b.scheduledDate != null) {
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      final d = b.scheduledDate!;
      scheduledDateStr = '${d.day} ${months[d.month - 1]} ${d.year}';
    }

    // ── Progress step (1-based) ───────────────────────────────────
    final status = b.status.toLowerCase();
    int currentStep = 1;
    if (status == 'accepted') currentStep = 2;
    if (status == 'confirmed') currentStep = 3;
    if (status == 'in progress' || status == 'inprogress') currentStep = 4;
    if (status == 'completed' ||
        status == 'reviewed' ||
        status == 'cancelled') {
      currentStep = 5;
    }

    // ── Status pill colours ───────────────────────────────────────
    Color statusBg;
    Color statusFg;
    IconData statusIcon;
    switch (status) {
      case 'requested':
      case 'pending':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.hourglass_empty_rounded;
        break;
      case 'accepted':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.check_circle_outline_rounded;
        break;
      case 'confirmed':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.verified_outlined;
        break;
      case 'in progress':
      case 'inprogress':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.construction_rounded;
        break;
      case 'completed':
      case 'reviewed':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.task_alt_rounded;
        break;
      case 'cancelled':
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.cancel_outlined;
        break;
      default:
        statusBg = const Color(0xFF1C1C1E);
        statusFg = Colors.white;
        statusIcon = Icons.info_outline_rounded;
    }

    // ── Priority pill ─────────────────────────────────────────────
    Color priorityBg;
    switch (b.urgency.toLowerCase()) {
      case 'high':
        priorityBg = const Color(0xFFE8E8E8);
        break;
      case 'medium':
        priorityBg = const Color(0xFFE8E8E8);
        break;
      default:
        priorityBg = const Color(0xFFE8E8E8);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.92,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // ── Drag handle ──────────────────────────────────────
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFDDE1E7),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),

              // ── Scrollable content ───────────────────────────────
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Title row + close ──────────────────────
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.jobTitle,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black,
                                    letterSpacing: -0.5,
                                    height: 1.15,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Booking #${b.id}',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 13,
                                    color: const Color(0xFF8A8A8E),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          GestureDetector(
                            onTap: () => Navigator.of(ctx).pop(),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0F0F3),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: Color(0xFF3C3C43),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // ── Status + Priority pills ─────────────────
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon, color: statusFg, size: 14),
                                const SizedBox(width: 6),
                                Text(
                                  _formatStatus(b.status),
                                  style: GoogleFonts.dmSans(
                                    color: statusFg,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: priorityBg,
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: Text(
                              '${b.urgency.toUpperCase()} PRIORITY',
                              style: GoogleFonts.dmSans(
                                color: Colors.black,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // ── Date + Location rows ────────────────────
                      _detailInfoRow(
                        icon: Icons.calendar_today_rounded,
                        label: 'Date',
                        value: scheduledDateStr,
                      ),
                      const SizedBox(height: 12),
                      _detailInfoRow(
                        icon: Icons.location_on_rounded,
                        label: 'Location',
                        value: b.locationAddress.isNotEmpty
                            ? b.locationAddress
                            : 'Location not provided',
                      ),
                      const SizedBox(height: 20),

                      // ── Worker card ─────────────────────────────
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF7F7F7),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.black,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  b.workerName.isNotEmpty
                                      ? b.workerName[0].toUpperCase()
                                      : 'W',
                                  style: GoogleFonts.dmSans(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          b.workerName,
                                          style: GoogleFonts.dmSans(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.black,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (b.isWorkerVerified) ...[
                                        const SizedBox(width: 6),
                                        const VerifiedBadge(size: 16),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    'Worker',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 12,
                                      color: const Color(0xFF8A8A8E),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'Estimated price',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    color: const Color(0xFF8A8A8E),
                                  ),
                                ),
                                Text(
                                  b.estimatedPrice > 0
                                      ? 'Rs. ${b.estimatedPrice.toStringAsFixed(0)}'
                                      : 'Negotiable',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      // ── Progress section ────────────────────────
                      Text(
                        'Progress',
                        style: GoogleFonts.dmSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.black,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildDetailedStepper(currentStep, b),
                      const SizedBox(height: 28),

                      // ── Notes section ───────────────────────────
                      Text(
                        'Notes',
                        style: GoogleFonts.dmSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.black,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF7F7F7),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE4E4E4)),
                        ),
                        child: Text(
                          b.description.isNotEmpty
                              ? b.description
                              : 'Standard booking',
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            color: const Color(0xFF3C3C43),
                            height: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // ── Service location map ────────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Service location',
                            style: GoogleFonts.dmSans(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Colors.black,
                              letterSpacing: -0.3,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              final coords = _extractBookingCoordinates(b);
                              final lat = coords['lat'];
                              final lng = coords['lng'];
                              final url =
                                  'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
                              if (kIsWeb) openUrl(url);
                            },
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.open_in_new_rounded,
                                  size: 14,
                                  color: Color(0xFF007AFF),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Google Maps',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF007AFF),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Builder(
                          builder: (context) {
                            final coords = _extractBookingCoordinates(b);
                            return SuperBassMap(
                              latitude: coords['lat']!,
                              longitude: coords['lng']!,
                              zoom: 15.0,
                              height: 210,
                              borderRadius: 18,
                              isInteractive: true,
                              markerTitle: b.locationAddress.isNotEmpty
                                  ? b.locationAddress
                                  : 'Service Location',
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 28),

                      // ── Review summary (if reviewed) ────────────
                      if (b.status.toLowerCase() == 'reviewed') ...[
                        Text(
                          'Your review',
                          style: GoogleFonts.dmSans(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.black,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ReviewSummary(booking: b),
                        const SizedBox(height: 28),
                      ],

                      // ── Cancel button (if cancellable) ──────────
                      if (b.status.toLowerCase() == 'requested' ||
                          b.status.toLowerCase() == 'pending') ...[
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _confirmCancelBooking(b);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.black,
                              side: const BorderSide(color: Colors.black),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: Text(
                              'Cancel Booking Request',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Colors.black,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // ── Leave review button (if completed) ──────
                      if (b.status.toLowerCase() == 'completed') ...[
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: FilledButton.icon(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              showReviewSheet(context, b, _fetchBookings);
                            },
                            icon: const Icon(
                              Icons.star_rounded,
                              color: Colors.white,
                            ),
                            label: Text(
                              'Leave a Review',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Colors.white,
                              ),
                            ),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ],
                  ),
                ),
              ),

              // ── Sticky bottom "Message Worker" button ────────────
              Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    top: BorderSide(color: Color(0xFFF0F0F3), width: 1),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: FilledButton.icon(
                    onPressed: () {},
                    icon: const Icon(
                      Icons.chat_bubble_outline_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    label: Text(
                      'Message worker',
                      style: GoogleFonts.dmSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Compact icon+label+value row used in the detail sheet
  Widget _detailInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFF0F0F3),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF3C3C43)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: const Color(0xFF8A8A8E),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Vertical stepper used in the booking detail sheet
  Widget _buildDetailedStepper(int currentStep, BookingModel b) {
    final steps = [
      {
        'title': 'Booking requested',
        'subtitle': 'Request submitted by resident',
      },
      {
        'title': 'Worker accepts or rejects',
        'subtitle': 'Worker accepted the booking',
      },
      {'title': 'Confirmed', 'subtitle': 'Schedule locked in'},
      {'title': 'In progress', 'subtitle': 'Work started on site'},
      {'title': 'Completed', 'subtitle': 'Job finished'},
    ];

    return Column(
      children: List.generate(steps.length, (i) {
        final stepNum = i + 1;
        final isDone = currentStep > stepNum;
        final isActive = currentStep == stepNum;
        final isPending = currentStep < stepNum;
        final isLast = i == steps.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Left: circle + connector line ──────────────
            Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isDone || isActive
                        ? Colors.black
                        : const Color(0xFFE4E4E4),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: isDone
                        ? const Icon(
                            Icons.check_rounded,
                            color: Colors.white,
                            size: 16,
                          )
                        : Icon(
                            isActive
                                ? Icons.radio_button_checked_rounded
                                : Icons.circle_outlined,
                            color: isActive
                                ? Colors.white
                                : const Color(0xFFB0B0B8),
                            size: isActive ? 14 : 12,
                          ),
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 36,
                    color: isDone ? Colors.black : const Color(0xFFE4E4E4),
                  ),
              ],
            ),
            const SizedBox(width: 14),

            // ── Right: text ────────────────────────────────
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      steps[i]['title']!,
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isPending
                            ? const Color(0xFFB0B0B8)
                            : Colors.black,
                      ),
                    ),
                    if (isDone || isActive) ...[
                      const SizedBox(height: 2),
                      Text(
                        steps[i]['subtitle']!,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: const Color(0xFF8A8A8E),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _confirmCancelBooking(BookingModel b) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          'Cancel Booking Request?',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Are you sure you want to cancel your request for "${b.jobTitle}" with ${b.workerName}?',
          style: GoogleFonts.dmSans(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(
              'Keep Booking',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
            ),
            child: Text(
              'Yes, Cancel',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cancelling booking...'),
          backgroundColor: Colors.black,
        ),
      );

      final success = await ApiService().cancelBooking(b.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Booking request cancelled successfully.'),
              backgroundColor: Colors.black,
            ),
          );
          _fetchBookings();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to cancel booking. Please try again.'),
              backgroundColor: Colors.black,
            ),
          );
        }
      }
    }
  }

  Color _getStatusDotColor(String status) {
    switch (status.toLowerCase()) {
      case 'requested':
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'accepted':
      case 'confirmed':
        return const Color(0xFF3B82F6);
      case 'in progress':
      case 'inprogress':
        return const Color(0xFF8B5CF6);
      case 'completed':
      case 'reviewed':
        return const Color(0xFF10B981);
      case 'cancelled':
      case 'rejected':
      default:
        return const Color(0xFFEF4444);
    }
  }

  String _formatStatus(String status) {
    if (status.isEmpty) return 'Requested';
    final lower = status.toLowerCase();
    if (lower == 'requested') return 'Requested';
    if (lower == 'pending') return 'Pending';
    if (lower == 'accepted') return 'Accepted';
    if (lower == 'confirmed') return 'Confirmed';
    if (lower == 'in progress' || lower == 'inprogress') return 'In Progress';
    if (lower == 'completed') return 'Completed';
    if (lower == 'reviewed') return 'Reviewed';
    if (lower == 'cancelled') return 'Cancelled';
    return status[0].toUpperCase() + status.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 16,
        title: Text(
          'My Bookings',
          style: GoogleFonts.dmSans(
            fontWeight: FontWeight.w800,
            fontSize: 20,
            color: Colors.black,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: NotificationBellButton(
                  onNotificationTap: (n) {
                    if (n.type == NotificationType.chat &&
                        n.referenceId != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(
                            conversationId: n.referenceId!,
                            name:
                                n.metadata?['name']?.toString() ??
                                'Conversation',
                            profileImage: n.metadata?['profileImage']
                                ?.toString(),
                          ),
                        ),
                      );
                    } else if (n.type == NotificationType.communityLike ||
                        n.type == NotificationType.communityComment) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const Scaffold(
                            body: SafeArea(child: CommunityScreen()),
                          ),
                        ),
                      );
                    }
                  },
                ),
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: user == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.lock_outline_rounded,
                    size: 48,
                    color: AppColors.onSurfaceVariant,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sign in to view your bookings',
                    style: GoogleFonts.dmSans(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/join'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Sign In'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // Filter Pills & Sort By Bar
                Builder(
                  builder: (context) {
                    final requests = _bookings
                        .where(
                          (b) =>
                              b.status.toLowerCase() == 'requested' ||
                              b.status.toLowerCase() == 'pending',
                        )
                        .toList();
                    final active = _bookings.where((b) {
                      final s = b.status.toLowerCase();
                      return s == 'accepted' ||
                          s == 'confirmed' ||
                          s == 'in progress' ||
                          s == 'inprogress';
                    }).toList();
                    final history = _bookings.where((b) {
                      final s = b.status.toLowerCase();
                      return s == 'completed' ||
                          s == 'reviewed' ||
                          s == 'cancelled' ||
                          s == 'rejected';
                    }).toList();

                    final tabs = [
                      {'label': 'Requests', 'count': requests.length},
                      {'label': 'Active', 'count': active.length},
                      {'label': 'History', 'count': history.length},
                      {'label': 'All', 'count': _bookings.length},
                    ];

                    return Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              child: Row(
                                children: List.generate(tabs.length, (idx) {
                                  final isSelected = _selectedTabIndex == idx;
                                  final tab = tabs[idx];
                                  final count = tab['count'] as int;

                                  return Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: InkWell(
                                      onTap: () => setState(
                                        () => _selectedTabIndex = idx,
                                      ),
                                      borderRadius: BorderRadius.circular(24),
                                      child: AnimatedContainer(
                                        duration: const Duration(
                                          milliseconds: 200,
                                        ),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 8,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? Colors.black
                                              : const Color(0xFFF1F3F5),
                                          borderRadius: BorderRadius.circular(
                                            24,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              tab['label'] as String,
                                              style: GoogleFonts.dmSans(
                                                fontSize: 13,
                                                fontWeight: isSelected
                                                    ? FontWeight.w700
                                                    : FontWeight.w600,
                                                color: isSelected
                                                    ? Colors.white
                                                    : Colors.black,
                                              ),
                                            ),
                                            if (count > 0 && idx == 0) ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                width: 18,
                                                height: 18,
                                                decoration: BoxDecoration(
                                                  color: isSelected
                                                      ? Colors.white
                                                      : Colors.black,
                                                  shape: BoxShape.circle,
                                                ),
                                                child: Center(
                                                  child: Text(
                                                    '$count',
                                                    style: GoogleFonts.dmSans(
                                                      fontSize: 10,
                                                      fontWeight:
                                                          FontWeight.w900,
                                                      color: isSelected
                                                          ? Colors.black
                                                          : Colors.white,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Sort By Pill Button
                          InkWell(
                            onTap: _showSortOptions,
                            borderRadius: BorderRadius.circular(24),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F3F5),
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Sort by',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.black,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.arrow_drop_down,
                                    size: 18,
                                    color: Colors.black,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _fetchBookings,
                    color: Colors.black,
                    backgroundColor: Colors.white,
                    child: _isLoading
                        ? const Center(
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : Builder(
                            builder: (context) {
                              final requests = _bookings
                                  .where(
                                    (b) =>
                                        b.status.toLowerCase() == 'requested' ||
                                        b.status.toLowerCase() == 'pending',
                                  )
                                  .toList();
                              final active = _bookings.where((b) {
                                final s = b.status.toLowerCase();
                                return s == 'accepted' ||
                                    s == 'confirmed' ||
                                    s == 'in progress' ||
                                    s == 'inprogress';
                              }).toList();
                              final history = _bookings.where((b) {
                                final s = b.status.toLowerCase();
                                return s == 'completed' ||
                                    s == 'reviewed' ||
                                    s == 'cancelled' ||
                                    s == 'rejected';
                              }).toList();

                              List<BookingModel> filtered = _bookings;
                              if (_selectedTabIndex == 0) filtered = requests;
                              if (_selectedTabIndex == 1) filtered = active;
                              if (_selectedTabIndex == 2) filtered = history;

                              final displayed = _sortBookings(filtered);

                              if (displayed.isEmpty) {
                                return ListView(
                                  children: [
                                    Container(
                                      margin: const EdgeInsets.all(24),
                                      padding: const EdgeInsets.all(32),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Column(
                                        children: [
                                          const Icon(
                                            Icons.calendar_month_outlined,
                                            size: 48,
                                            color: Color(0xFF94A3B8),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            'No bookings found',
                                            style: GoogleFonts.dmSans(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 18,
                                              color: Colors.black,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'There are no bookings matching the selected tab or filters.',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 13,
                                              color: const Color(0xFF64748B),
                                            ),
                                            textAlign: TextAlign.center,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                );
                              }

                              return ListView.separated(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  12,
                                  16,
                                  100,
                                ),
                                itemCount: displayed.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(height: 16),
                                itemBuilder: (context, index) {
                                  final b = displayed[index];
                                  final scheduled = b.scheduledDate != null
                                      ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year}'
                                      : 'Flexible / ASAP';
                                  final isCancellable =
                                      b.status.toLowerCase() == 'requested' ||
                                      b.status.toLowerCase() == 'pending';
                                  final isCompleted =
                                      b.status.toLowerCase() == 'completed';

                                  return Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: () => _showBookingDetails(b),
                                      borderRadius: BorderRadius.circular(24),
                                      child: Container(
                                        padding: const EdgeInsets.all(20),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF4F6F8),
                                          borderRadius: BorderRadius.circular(
                                            24,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            // Top Row: Worker Name + Status Pill
                                            Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.center,
                                              children: [
                                                Expanded(
                                                  child: Row(
                                                    children: [
                                                      Flexible(
                                                        child: Text(
                                                          b.workerName,
                                                          style:
                                                              GoogleFonts.dmSans(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w800,
                                                                fontSize: 20,
                                                                color: Colors
                                                                    .black,
                                                                letterSpacing:
                                                                    -0.4,
                                                              ),
                                                          overflow: TextOverflow
                                                              .ellipsis,
                                                        ),
                                                      ),
                                                      if (b.isWorkerVerified)
                                                        const VerifiedBadge(
                                                          size: 18,
                                                        ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                if (b.status.toLowerCase() ==
                                                    'reviewed')
                                                  Container(
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 10,
                                                          vertical: 6,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black,
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            20,
                                                          ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize:
                                                          MainAxisSize.min,
                                                      children: [
                                                        const Icon(
                                                          Icons.star_rounded,
                                                          color: Colors.white,
                                                          size: 14,
                                                        ),
                                                        const SizedBox(
                                                          width: 4,
                                                        ),
                                                        Text(
                                                          'Reviewed',
                                                          style:
                                                              GoogleFonts.dmSans(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w700,
                                                                fontSize: 12,
                                                                color: Colors
                                                                    .white,
                                                              ),
                                                        ),
                                                      ],
                                                    ),
                                                  )
                                                else
                                                  Container(
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 12,
                                                          vertical: 6,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.white,
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            20,
                                                          ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize:
                                                          MainAxisSize.min,
                                                      children: [
                                                        Container(
                                                          width: 7,
                                                          height: 7,
                                                          decoration: BoxDecoration(
                                                            color:
                                                                _getStatusDotColor(
                                                                  b.status,
                                                                ),
                                                            shape:
                                                                BoxShape.circle,
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                          width: 6,
                                                        ),
                                                        Text(
                                                          _formatStatus(
                                                            b.status,
                                                          ),
                                                          style:
                                                              GoogleFonts.dmSans(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w700,
                                                                fontSize: 12,
                                                                color: Colors
                                                                    .black,
                                                              ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),

                                            // Job Title
                                            Text(
                                              b.jobTitle,
                                              style: GoogleFonts.dmSans(
                                                fontSize: 15,
                                                fontWeight: FontWeight.w600,
                                                color: Colors.black,
                                              ),
                                            ),

                                            // Description / notes
                                            if (b.description.isNotEmpty) ...[
                                              const SizedBox(height: 3),
                                              Text(
                                                b.description,
                                                style: GoogleFonts.dmSans(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w400,
                                                  color: const Color(
                                                    0xFF64748B,
                                                  ),
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],

                                            const SizedBox(height: 16),
                                            const Divider(
                                              color: Color(0xFFE2E8F0),
                                              thickness: 1,
                                              height: 1,
                                            ),
                                            const SizedBox(height: 16),

                                            // Date & Price Row
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Row(
                                                  children: [
                                                    const Icon(
                                                      Icons.access_time_rounded,
                                                      size: 18,
                                                      color: Color(0xFF475569),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Text(
                                                      scheduled,
                                                      style: GoogleFonts.dmSans(
                                                        fontSize: 14,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                        color: const Color(
                                                          0xFF475569,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                Text(
                                                  'Rs. ${b.estimatedPrice.toStringAsFixed(0)}',
                                                  style: GoogleFonts.dmSans(
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 22,
                                                    color: Colors.black,
                                                    letterSpacing: -0.5,
                                                  ),
                                                ),
                                              ],
                                            ),

                                            const SizedBox(height: 18),

                                            // Action Buttons Row: View & Cancel/Review
                                            if (b.status.toLowerCase() ==
                                                'reviewed')
                                              ReviewSummary(booking: b),
                                            const SizedBox(height: 18),
                                            Wrap(
                                              spacing: 12,
                                              runSpacing: 12,
                                              children: [
                                                OutlinedButton.icon(
                                                  onPressed: () =>
                                                      _showBookingDetails(b),
                                                  icon: const Icon(
                                                    Icons.visibility_outlined,
                                                    size: 17,
                                                  ),
                                                  label: Text(
                                                    'View Details',
                                                    style: GoogleFonts.dmSans(
                                                      fontWeight:
                                                          FontWeight.w700,
                                                    ),
                                                  ),
                                                  style: OutlinedButton.styleFrom(
                                                    foregroundColor:
                                                        Colors.black,
                                                    side: const BorderSide(
                                                      color: Colors.black,
                                                    ),
                                                    shape: RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            26,
                                                          ),
                                                    ),
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 20,
                                                          vertical: 12,
                                                        ),
                                                  ),
                                                ),
                                                if (b.conversationId != null)
                                                  OutlinedButton.icon(
                                                    onPressed:
                                                        () {}, // Handled elsewhere or just UI mock
                                                    icon: const Icon(
                                                      Icons.message_outlined,
                                                      size: 17,
                                                    ),
                                                    label: Text(
                                                      'Message',
                                                      style: GoogleFonts.dmSans(
                                                        fontWeight:
                                                            FontWeight.w700,
                                                      ),
                                                    ),
                                                    style: OutlinedButton.styleFrom(
                                                      foregroundColor:
                                                          Colors.black,
                                                      side: const BorderSide(
                                                        color: Colors.black,
                                                      ),
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              26,
                                                            ),
                                                      ),
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 20,
                                                            vertical: 12,
                                                          ),
                                                    ),
                                                  ),
                                                if (isCancellable)
                                                  OutlinedButton.icon(
                                                    onPressed: () =>
                                                        _confirmCancelBooking(
                                                          b,
                                                        ),
                                                    icon: const Icon(
                                                      Icons.cancel_outlined,
                                                      size: 17,
                                                    ),
                                                    label: Text(
                                                      'Cancel',
                                                      style: GoogleFonts.dmSans(
                                                        fontWeight:
                                                            FontWeight.w700,
                                                      ),
                                                    ),
                                                    style: OutlinedButton.styleFrom(
                                                      foregroundColor:
                                                          Colors.black,
                                                      side: const BorderSide(
                                                        color: Colors.black,
                                                      ),
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              26,
                                                            ),
                                                      ),
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 20,
                                                            vertical: 12,
                                                          ),
                                                    ),
                                                  ),
                                                if (isCompleted)
                                                  FilledButton.icon(
                                                    onPressed: () =>
                                                        showReviewSheet(
                                                          context,
                                                          b,
                                                          _fetchBookings,
                                                        ),
                                                    icon: const Icon(
                                                      Icons.star_rounded,
                                                      size: 17,
                                                    ),
                                                    label: Text(
                                                      'Leave a Review',
                                                      style: GoogleFonts.dmSans(
                                                        fontWeight:
                                                            FontWeight.w700,
                                                      ),
                                                    ),
                                                    style: FilledButton.styleFrom(
                                                      backgroundColor:
                                                          Colors.black,
                                                      foregroundColor:
                                                          Colors.white,
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              26,
                                                            ),
                                                      ),
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 20,
                                                            vertical: 12,
                                                          ),
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
    );
  }
}

/// 4. CHATS TAB
class ChatsTabScreen extends StatefulWidget {
  const ChatsTabScreen({super.key});

  @override
  State<ChatsTabScreen> createState() => _ChatsTabScreenState();
}

class _ChatsTabScreenState extends State<ChatsTabScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _isLoading = true;
  StreamSubscription? _msgSub;
  StreamSubscription? _readSub;

  @override
  void initState() {
    super.initState();
    _fetchChats();
    _msgSub = ChatSignalRService().onMessageReceived.listen((_) {
      if (mounted) _fetchChats();
    });
    _readSub = ChatSignalRService().onMessagesRead.listen((_) {
      if (mounted) _fetchChats();
    });
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _readSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchChats() async {
    final email = AuthService().currentUser?.email;
    if (email == null || email.isEmpty) {
      setState(() {
        _conversations = [];
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);
    final convs = await ApiService().fetchConversations(email);
    final prefs = await SharedPreferences.getInstance();

    final filteredConvs = <Map<String, dynamic>>[];
    int totalUnread = 0;
    for (final c in convs) {
      final convId = c['id']?.toString() ?? '';
      final clearedBeforeStr = prefs.getString(
        'cleared_chat_before_${email}_$convId',
      );
      if (clearedBeforeStr != null) {
        final clearedBefore = DateTime.tryParse(clearedBeforeStr);
        final lastMsgAtStr =
            c['lastMessageAt']?.toString() ?? c['updatedAt']?.toString();
        final lastMsgAt = lastMsgAtStr != null
            ? DateTime.tryParse(lastMsgAtStr)
            : null;
        if (clearedBefore != null && lastMsgAt != null) {
          if (lastMsgAt.toUtc().isBefore(clearedBefore) ||
              lastMsgAt.toUtc().isAtSameMomentAs(clearedBefore)) {
            continue; // Chat was cleared: hide from conversation list
          }
        } else if (clearedBefore != null && lastMsgAt == null) {
          continue; // Empty/cleared
        }
      }

      if (c['unreadCount'] is int) {
        totalUnread += c['unreadCount'] as int;
      }
      filteredConvs.add(c);
    }
    ChatSignalRService().setUnreadChatCount(totalUnread);

    if (mounted) {
      setState(() {
        _conversations = filteredConvs;
        _isLoading = false;
      });
    }
  }

  String _formatMessageTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inDays == 0 && now.day == dt.day) {
        final hour = dt.hour == 0
            ? 12
            : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
        final minute = dt.minute.toString().padLeft(2, '0');
        final ampm = dt.hour >= 12 ? 'pm' : 'am';
        return '$hour:$minute $ampm';
      } else if (diff.inDays < 7 && diff.inDays >= 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days[dt.weekday - 1];
      } else {
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return '${dt.day} ${months[dt.month - 1]}';
      }
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Messages',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
        actions: const [NotificationBellButton()],
      ),
      body: user == null
          ? Center(
              child: Text(
                'Please sign in to view messages',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchChats,
              child: _isLoading
                  ? const Center(child: LoadingIndicatorM3E())
                  : _conversations.isEmpty
                  ? ListView(
                      children: [
                        Container(
                          margin: const EdgeInsets.all(24),
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant.withValues(
                              alpha: 0.5,
                            ),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              const Icon(
                                Icons.chat_bubble_outline_rounded,
                                size: 48,
                                color: AppColors.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No messages yet',
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Conversations with workers you hire will appear here.',
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  color: AppColors.onSurfaceVariant,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      itemCount: _conversations.length,
                      itemBuilder: (context, index) {
                        final c = _conversations[index];
                        final name =
                            c['workerName']?.toString() ??
                            c['otherPartyName']?.toString() ??
                            'Worker';
                        final profileImg =
                            (c['workerProfileImage'] ??
                                    c['WorkerProfileImage'] ??
                                    c['workerAvatar'] ??
                                    c['otherPartyProfileImage'])
                                ?.toString();
                        String lastMsg =
                            c['lastMessage']?.toString() ??
                            'Conversation started';
                        // Sanitize JSON contact card content
                        if (lastMsg.trimLeft().startsWith('{')) {
                          try {
                            final decoded = jsonDecode(lastMsg);
                            if (decoded is Map &&
                                (decoded.containsKey('phoneNo') ||
                                    decoded.containsKey('PhoneNo') ||
                                    decoded['type'] == 'WorkerContactCard')) {
                              lastMsg = 'Shared contact card';
                            }
                          } catch (_) {}
                        }
                        final unread = c['unreadCount'] is int
                            ? c['unreadCount'] as int
                            : 0;
                        final timeStr = _formatMessageTime(
                          c['updatedAt']?.toString() ??
                              c['lastMessageAt']?.toString(),
                        );

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 8,
                          ),
                          leading: CircleAvatar(
                            radius: 26,
                            backgroundColor: AppColors.surfaceVariant,
                            child: ClipOval(
                              child:
                                  (profileImg != null &&
                                      profileImg.isNotEmpty &&
                                      profileImg != 'null' &&
                                      profileImg.startsWith('http'))
                                  ? Image.network(
                                      profileImg,
                                      width: 52,
                                      height: 52,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        width: 52,
                                        height: 52,
                                        color: AppColors.surfaceVariant,
                                        alignment: Alignment.center,
                                        child: Text(
                                          name.isNotEmpty
                                              ? name[0].toUpperCase()
                                              : 'W',
                                          style: GoogleFonts.dmSans(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 18,
                                            color: AppColors.onSurfaceVariant,
                                          ),
                                        ),
                                      ),
                                    )
                                  : Container(
                                      width: 52,
                                      height: 52,
                                      color: AppColors.surfaceVariant,
                                      alignment: Alignment.center,
                                      child: Text(
                                        name.isNotEmpty
                                            ? name[0].toUpperCase()
                                            : 'W',
                                        style: GoogleFonts.dmSans(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 18,
                                          color: AppColors.onSurfaceVariant,
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                          title: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  name,
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (c['isVerified'] == true ||
                                  c['IsVerified'] == true ||
                                  c['isWorkerVerified'] == true ||
                                  c['isResidentVerified'] == true ||
                                  c['isOtherPartyVerified'] == true)
                                const VerifiedBadge(size: 14),
                            ],
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Text(
                              lastMsg,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                color: AppColors.onSurfaceVariant,
                                fontWeight: unread > 0
                                    ? FontWeight.w700
                                    : FontWeight.w400,
                              ),
                            ),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (timeStr.isNotEmpty)
                                Text(
                                  timeStr,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 12,
                                    color: unread > 0
                                        ? AppColors.onSurface
                                        : AppColors.onSurfaceVariant,
                                    fontWeight: unread > 0
                                        ? FontWeight.w700
                                        : FontWeight.w400,
                                  ),
                                ),
                              if (unread > 0) ...[
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    color: AppColors.brandYellow,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    '$unread',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.onPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          onTap: () async {
                            final convId = c['id'] is int
                                ? c['id'] as int
                                : int.tryParse(c['id']?.toString() ?? '0') ?? 0;
                            final userEmail = AuthService().currentUser?.email;

                            // Optimistically clear unread count badge in UI immediately
                            setState(() {
                              c['unreadCount'] = 0;
                            });

                            if (userEmail != null && convId > 0) {
                              ApiService().markConversationAsRead(
                                convId,
                                userEmail,
                              );
                            }

                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ChatScreen(
                                  conversationId: convId,
                                  name: name,
                                  profileImage: profileImg,
                                  isVerified:
                                      c['isVerified'] == true ||
                                      c['IsVerified'] == true ||
                                      c['isWorkerVerified'] == true ||
                                      c['isResidentVerified'] == true ||
                                      c['isOtherPartyVerified'] == true,
                                ),
                              ),
                            );
                            _fetchChats();
                          },
                        );
                      },
                    ),
            ),
    );
  }
}

/// 5. ACCOUNT TAB
class AccountTabScreen extends StatelessWidget {
  const AccountTabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Profile',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Center(
              child: ValueListenableBuilder<AuthUser?>(
                valueListenable: AuthService().currentUserNotifier,
                builder: (context, user, _) {
                  final displayName = user?.name.isNotEmpty == true
                      ? user!.name
                      : 'Guest User';
                  final initial = displayName.isNotEmpty
                      ? displayName[0].toUpperCase()
                      : 'G';
                  final role = user?.activeRole ?? 'Guest';
                  final email = user?.email ?? 'Not signed in';

                  return Column(
                    children: [
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primaryContainer,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child:
                              (user?.picture != null &&
                                  user!.picture!.isNotEmpty)
                              ? Image.network(
                                  user.picture!,
                                  width: 96,
                                  height: 96,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      Center(
                                        child: Text(
                                          initial,
                                          style: GoogleFonts.dmSans(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 36,
                                            color: AppColors.onPrimaryContainer,
                                          ),
                                        ),
                                      ),
                                )
                              : Center(
                                  child: Text(
                                    initial,
                                    style: GoogleFonts.dmSans(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 36,
                                      color: AppColors.onPrimaryContainer,
                                    ),
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        displayName,
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w800,
                          fontSize: 20,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$role • $email',
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      if (user == null) ...[
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: () =>
                              Navigator.pushNamed(context, '/join'),
                          icon: const Icon(Icons.login_rounded, size: 18),
                          label: const Text('Sign In / Join'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.brandYellow,
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            _buildSettingsTile(
              icon: Icons.edit_outlined,
              title: 'Edit Profile',
            ),
            _buildSettingsTile(
              icon: Icons.location_on_outlined,
              title: 'Saved Addresses',
            ),

            _buildSettingsTile(
              icon: Icons.security_outlined,
              title: 'Advanced Options',
            ),
            _buildSettingsTile(
              icon: Icons.help_outline_rounded,
              title: 'Help & Support',
            ),
            _buildSettingsTile(
              icon: Icons.logout_rounded,
              title: 'Sign Out',
              isDestructive: true,
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    title: Text(
                      'Log Out',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    content: Text(
                      'Are you sure you want to log out of SuperBass?',
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(false),
                        child: Text(
                          'Cancel',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.of(ctx).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          'Log Out',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                );

                if (confirm == true) {
                  await AuthService().logout();
                  if (context.mounted) {
                    Navigator.of(
                      context,
                    ).pushNamedAndRemoveUntil('/join', (route) => false);
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    bool isDestructive = false,
    VoidCallback? onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      leading: Icon(
        icon,
        color: isDestructive ? AppColors.error : AppColors.onSurface,
      ),
      title: Text(
        title,
        style: GoogleFonts.dmSans(
          fontWeight: FontWeight.w600,
          color: isDestructive ? AppColors.error : AppColors.onSurface,
        ),
      ),
      trailing: const Icon(
        Icons.arrow_forward_ios_rounded,
        size: 14,
        color: AppColors.outline,
      ),
      onTap: onTap ?? () {},
    );
  }
}
