import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
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
import 'screens/worker/become_worker_sheet.dart';
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
import 'widgets/notifications_sheet.dart';
import 'widgets/m3_bottom_nav_bar.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  runApp(const WorkioApp());
}

class WorkioApp extends StatelessWidget {
  final String? initialRoute;
  const WorkioApp({super.key, this.initialRoute});

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
      NotificationService().stopListening();
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
    _fetchWorkers();
  }

  Future<void> _fetchWorkers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final selectedSkill = _selectedCategoryIndex != null
          ? _categories[_selectedCategoryIndex!]['skill'] as String?
          : null;
      final list = await ApiService().fetchWorkers(skill: selectedSkill);
      if (mounted) {
        setState(() {
          _workers = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
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

  void _showAiMatchSheet() {
    final TextEditingController problemController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
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
                const SizedBox(height: 16),
                Row(
                  children: [
                    Image.asset(
                      'assets/icons/AI.png',
                      width: 40,
                      height: 40,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.auto_awesome, size: 30),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Service Matcher',
                          style: GoogleFonts.dmSans(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface,
                          ),
                        ),
                        Text(
                          'Describe what you need for instant pro match',
                          style: GoogleFonts.dmSans(
                            fontSize: 12.5,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: problemController,
                  maxLines: 3,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText:
                        'e.g. My kitchen sink pipe is leaking water under the cabinet...',
                    hintStyle: GoogleFonts.dmSans(
                      fontSize: 13.5,
                      color: AppColors.onSurfaceVariant,
                    ),
                    filled: true,
                    fillColor: AppColors.surfaceVariant,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children:
                      [
                            '🚿 Leaking Tap',
                            '⚡ Breaker Tripped',
                            '❄️ AC Not Cooling',
                            '🚪 Broken Door Lock',
                            '🎨 Wall Repainting',
                          ]
                          .map(
                            (tag) => InkWell(
                              onTap: () {
                                setModalState(() {
                                  problemController.text = tag
                                      .substring(2)
                                      .trim();
                                });
                              },
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  tag,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.onSurface,
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      final query = problemController.text.trim().toLowerCase();
                      Navigator.pop(ctx);
                      if (query.isNotEmpty) {
                        int foundIndex = -1;
                        if (query.contains('pipe') ||
                            query.contains('plumb') ||
                            query.contains('tap') ||
                            query.contains('sink') ||
                            query.contains('leak') ||
                            query.contains('water')) {
                          foundIndex = _categories.indexWhere(
                            (c) => c['name'] == 'Plumber',
                          );
                        } else if (query.contains('electric') ||
                            query.contains('wire') ||
                            query.contains('breaker') ||
                            query.contains('power') ||
                            query.contains('switch')) {
                          foundIndex = _categories.indexWhere(
                            (c) => c['name'] == 'Electrician',
                          );
                        } else if (query.contains('ac') ||
                            query.contains('cool') ||
                            query.contains('air')) {
                          foundIndex = _categories.indexWhere(
                            (c) => c['name'] == 'AC Repair',
                          );
                        } else if (query.contains('wood') ||
                            query.contains('carpent') ||
                            query.contains('door') ||
                            query.contains('table') ||
                            query.contains('furniture')) {
                          foundIndex = _categories.indexWhere(
                            (c) => c['name'] == 'Carpenter',
                          );
                        } else if (query.contains('paint') ||
                            query.contains('wall')) {
                          foundIndex = _categories.indexWhere(
                            (c) => c['name'] == 'Painter',
                          );
                        }
                        if (foundIndex != -1) {
                          _onCategorySelected(foundIndex);
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandBlack,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      'Find Matches with AI',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
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

    final titleController = TextEditingController(
      text:
          'Need help with ${worker.skills.isNotEmpty ? worker.skills.first : "home service"}',
    );
    final descController = TextEditingController();
    final phoneController = TextEditingController(text: initialPhone);
    final addressController = TextEditingController(text: initialAddress);

    DateTime? selectedDate = DateTime.now().add(const Duration(days: 1));
    TimeOfDay? selectedTime = TimeOfDay.now();
    bool isSubmitting = false;
    String selectedUrgency = 'Medium';

    // GPS location state
    bool hasSavedCoordinates = initialLat != null && initialLng != null;
    double locationLat = initialLat ?? 6.9271;
    double locationLng = initialLng ?? 79.8612;

    bool shareGps = hasSavedCoordinates;
    bool showMapPicker = false;

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Request Service from ${worker.name}',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w800,
                          fontSize: 22,
                          color: const Color(0xFF111827),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(sheetContext),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFFF1F5F9)),
                const SizedBox(height: 16),
                TextField(
                  controller: titleController,
                  decoration: InputDecoration(
                    labelText: 'Job Title',
                    hintText: 'e.g. Pipe leakage repair',
                    prefixIcon: const Icon(Icons.work_outline),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Description / Scope of Work',
                    hintText: 'Describe details or location within house',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedUrgency,
                        items: ['Low', 'Medium', 'High'].map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => selectedUrgency = val);
                          }
                        },
                        decoration: InputDecoration(
                          labelText: 'Urgency',
                          prefixIcon: const Icon(Icons.priority_high),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: phoneController,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        decoration: InputDecoration(
                          labelText: 'Contact Phone',
                          hintText: '07XXXXXXXX',
                          prefixIcon: const Icon(Icons.phone),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        readOnly: true,
                        controller: TextEditingController(
                          text: selectedDate == null
                              ? ''
                              : '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2, '0')}-${selectedDate!.day.toString().padLeft(2, '0')}',
                        ),
                        decoration: InputDecoration(
                          labelText: 'Preferred Date',
                          prefixIcon: const Icon(Icons.calendar_today),
                          suffixIcon: const Icon(Icons.edit_calendar),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                        ),
                        onTap: () async {
                          final d = await showDatePicker(
                            context: context,
                            initialDate: selectedDate ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(
                              const Duration(days: 365),
                            ),
                          );
                          if (d != null) setModalState(() => selectedDate = d);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        readOnly: true,
                        controller: TextEditingController(
                          text: selectedTime == null
                              ? ''
                              : selectedTime!.format(context),
                        ),
                        decoration: InputDecoration(
                          labelText: 'Preferred Time',
                          prefixIcon: const Icon(Icons.schedule),
                          suffixIcon: const Icon(Icons.access_time),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                        ),
                        onTap: () async {
                          final t = await showTimePicker(
                            context: context,
                            initialTime: selectedTime ?? TimeOfDay.now(),
                          );
                          if (t != null) setModalState(() => selectedTime = t);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: addressController,
                  decoration: InputDecoration(
                    labelText: 'Location Address',
                    hintText: 'e.g. 123 Galle Road, Colombo',
                    prefixIcon: const Icon(Icons.location_on),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // GPS Location Share & Map Picker (Faithfully replicating web booking form)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Checkbox(
                            value: shareGps,
                            activeColor: Colors.black,
                            checkColor: Colors.white,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            side: const BorderSide(
                              color: Color(0xFF94A3B8),
                              width: 1.5,
                            ),
                            onChanged: (val) {
                              setModalState(() {
                                shareGps = val ?? false;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setModalState(() {
                                  shareGps = !shareGps;
                                });
                              },
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.my_location,
                                        size: 18,
                                        color: Colors.black,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Share saved GPS location',
                                        style: GoogleFonts.dmSans(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  if (hasSavedCoordinates)
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.pin_drop,
                                          size: 14,
                                          color: Colors.black,
                                        ),
                                        const SizedBox(width: 4),
                                        RichText(
                                          text: TextSpan(
                                            style: GoogleFonts.dmSans(
                                              fontSize: 12,
                                              color: const Color(0xFF64748B),
                                            ),
                                            children: [
                                              const TextSpan(
                                                text: 'Saved Pin: ',
                                              ),
                                              TextSpan(
                                                text:
                                                    '${locationLat.toStringAsFixed(5)}, ${locationLng.toStringAsFixed(5)}',
                                                style: GoogleFonts.dmSans(
                                                  fontWeight: FontWeight.w700,
                                                  color: const Color(
                                                    0xFF0F172A,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    )
                                  else
                                    Text(
                                      'No GPS coordinates saved. Pick on map to attach.',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        color: const Color(0xFF64748B),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              setModalState(() {
                                showMapPicker = !showMapPicker;
                              });
                            },
                            icon: Icon(
                              showMapPicker
                                  ? Icons.expand_less
                                  : Icons.map_outlined,
                              size: 16,
                              color: Colors.black,
                            ),
                            label: Text(
                              showMapPicker
                                  ? 'Hide Map'
                                  : (hasSavedCoordinates
                                        ? 'View / Change Pin'
                                        : 'Pick on Map'),
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: Colors.black,
                              ),
                            ),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                        ],
                      ),

                      // Expandable Interactive Map & Geolocation
                      if (showMapPicker) ...[
                        const SizedBox(height: 12),
                        Container(height: 1, color: const Color(0xFFE2E8F0)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.touch_app,
                                    size: 15,
                                    color: Colors.black,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      'Tap anywhere on map to pin',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        color: const Color(0xFF64748B),
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                setModalState(() {
                                  locationLat = 6.9271;
                                  locationLng = 79.8612;
                                  hasSavedCoordinates = true;
                                  shareGps = true;
                                });
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  border: Border.all(
                                    color: const Color(0xFFCBD5E1),
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.gps_fixed,
                                      size: 13,
                                      color: Colors.black,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Use Device GPS',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.black,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          height: 180,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                            color: const Color(0xFFE5E7EB),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: GestureDetector(
                            onTapDown: (details) {
                              final normX =
                                  (details.localPosition.dx / 280.0) - 0.5;
                              final normY =
                                  (details.localPosition.dy / 180.0) - 0.5;
                              setModalState(() {
                                locationLat = locationLat + (normY * 0.02);
                                locationLng = locationLng + (normX * 0.02);
                                hasSavedCoordinates = true;
                                shareGps = true;
                              });
                            },
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  decoration: const BoxDecoration(
                                    image: DecorationImage(
                                      image: NetworkImage(
                                        'https://tile.openstreetmap.org/13/4688/3187.png',
                                      ),
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                Container(
                                  color: Colors.black.withValues(alpha: 0.03),
                                ),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: const BoxDecoration(
                                        color: Colors.black,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black26,
                                            blurRadius: 6,
                                            offset: Offset(0, 3),
                                          ),
                                        ],
                                      ),
                                      child: const Icon(
                                        Icons.location_on,
                                        color: Colors.white,
                                        size: 18,
                                      ),
                                    ),
                                    Container(
                                      width: 6,
                                      height: 3,
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
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.location_on,
                                size: 15,
                                color: Colors.black,
                              ),
                              const SizedBox(width: 4),
                              RichText(
                                text: TextSpan(
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    color: const Color(0xFF0F172A),
                                  ),
                                  children: [
                                    const TextSpan(text: 'Selected: '),
                                    TextSpan(
                                      text:
                                          '${locationLat.toStringAsFixed(6)}, ${locationLng.toStringAsFixed(6)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Pricing Info (Read-only)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.payments_outlined,
                            size: 18,
                            color: Colors.black,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Pricing Model',
                            style: GoogleFonts.dmSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '${worker.pricingModel} ${worker.hourlyRate > 0 ? "(Rs. ${worker.hourlyRate.round()}/hr)" : ""}',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: const Color(0xFF111827),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 56,
                        child: ElevatedButton.icon(
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

                                  DateTime? finalDate;
                                  if (selectedDate != null) {
                                    final time =
                                        selectedTime ?? TimeOfDay.now();
                                    finalDate = DateTime(
                                      selectedDate!.year,
                                      selectedDate!.month,
                                      selectedDate!.day,
                                      time.hour,
                                      time.minute,
                                    );
                                  }

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
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      scaffoldMessenger.showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Failed to create booking. Check backend connection.',
                                          ),
                                          backgroundColor: AppColors.error,
                                        ),
                                      );
                                    }
                                  }
                                },
                          icon: isSubmitting
                              ? const SizedBox.shrink()
                              : const Icon(Icons.send, size: 20),
                          label: isSubmitting
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: LoadingIndicatorM3E(),
                                )
                              : Text(
                                  'Submit Hire Request',
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                    color: Colors.white,
                                  ),
                                ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
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
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.verified,
                              size: 18,
                              color: AppColors.brandYellowHover,
                            ),
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
                                worker.primaryServiceArea ?? 'Colombo',
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
          NotificationBellButton(
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
              }
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 4.0),
            child: ValueListenableBuilder<AuthUser?>(
              valueListenable: AuthService().currentUserNotifier,
              builder: (context, user, _) {
                final displayName = user?.name.isNotEmpty == true
                    ? user!.name
                    : 'User';
                final initial = displayName.isNotEmpty
                    ? displayName[0].toUpperCase()
                    : 'U';
                return InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () {
                    if (user == null) {
                      Navigator.pushNamed(context, '/join');
                    }
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primaryContainer,
                    ),
                    child: ClipOval(
                      child:
                          (user?.picture != null && user!.picture!.isNotEmpty)
                          ? Image.network(
                              user.picture!,
                              width: 36,
                              height: 36,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Center(
                                child: Text(
                                  initial,
                                  style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: AppColors.onPrimaryContainer,
                                  ),
                                ),
                              ),
                            )
                          : Center(
                              child: Text(
                                initial,
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: AppColors.onPrimaryContainer,
                                ),
                              ),
                            ),
                    ),
                  ),
                );
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
                    const ServiceSearchBar(),
                  ],
                ),
              ),

              // Uber-style Feature & Promo Banners (Community & AI)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: UberPromoCarousel(
                  banners: [
                    UberPromoBanner(
                      title: 'Join Neighborhood\nCommunity Hub',
                      subtitle: 'Connect, discuss & get trusted local help',
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
                      subtitle: 'Instant diagnosis & smart matching',
                      buttonText: 'Try AI Match',
                      imageAsset: 'assets/icons/AI.png',
                      blobColor: const Color(0xFFE8F1FF),
                      onTap: () {
                        _showAiMatchSheet();
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
                        count: _workers.length,
                        isSelected: _selectedCategoryIndex == index,
                        onTap: () => _onCategorySelected(index),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 28),

              // Nearby Verified Pros
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Featured Workers Near You',
                      style: Theme.of(
                        context,
                      ).textTheme.titleLarge?.copyWith(fontSize: 18),
                    ),
                    Row(
                      children: [
                        const Icon(
                          Icons.verified,
                          size: 16,
                          color: AppColors.brandYellowHover,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Verified (${_workers.length})',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.brandYellowHover,
                          ),
                        ),
                      ],
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
                    : _workers.isEmpty
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
                            const Icon(
                              Icons.engineering_outlined,
                              size: 48,
                              color: AppColors.onSurfaceVariant,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No workers found in this category',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Try selecting "All Pros" or refreshing',
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ValueListenableBuilder<AuthUser?>(
                        valueListenable: AuthService().currentUserNotifier,
                        builder: (context, currentUser, _) {
                          final isLoggedIn = currentUser != null;
                          return Column(
                            children: _workers.map((worker) {
                              final trade = worker.skills.isNotEmpty
                                  ? worker.skills.first
                                  : 'General Pro';
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12.0),
                                child: WorkerCard(
                                  name: worker.name,
                                  trade: trade,
                                  rating: worker.overallRating,
                                  reviewCount: worker.completedJobs,
                                  location:
                                      worker.primaryServiceArea ?? 'Colombo',
                                  distance: worker.distance != null
                                      ? '${worker.distance!.toStringAsFixed(1)} km'
                                      : 'Unknown',
                                  profileImage: worker.profileImage,
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

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppColors.success;
      case 'completed':
        return Colors.blue;
      case 'cancelled':
      case 'rejected':
        return AppColors.error;
      case 'pending':
      default:
        return Colors.orange;
    }
  }

  void _showBookingDetails(BookingModel b) {
    final scheduledDateStr = b.scheduledDate != null
        ? '${b.scheduledDate!.month}/${b.scheduledDate!.day}/${b.scheduledDate!.year}, ${b.scheduledDate!.hour > 12 ? b.scheduledDate!.hour - 12 : (b.scheduledDate!.hour == 0 ? 12 : b.scheduledDate!.hour)}:${b.scheduledDate!.minute.toString().padLeft(2, '0')}:00 ${b.scheduledDate!.hour >= 12 ? "PM" : "AM"}'
        : 'Flexible / ASAP';

    int currentStep = 1;
    final status = b.status.toLowerCase();
    if (status == 'accepted') currentStep = 2;
    if (status == 'confirmed') currentStep = 3;
    if (status == 'in progress') currentStep = 4;
    if (status == 'completed') currentStep = 5;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.9,
        padding: const EdgeInsets.only(
          left: 20,
          right: 20,
          top: 16,
          bottom: 24,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.assignment,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Booking Details',
                          style: GoogleFonts.dmSans(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF111827),
                          ),
                        ),
                        Text(
                          'Reference ID: #${b.id}',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const Divider(height: 32, color: Color(0xFFF1F5F9)),

            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Job Title
                    Text(
                      'JOB TITLE',
                      style: GoogleFonts.dmSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      b.jobTitle,
                      style: GoogleFonts.dmSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Status & Priority
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'STATUS',
                                style: GoogleFonts.dmSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF94A3B8),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1F2937),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.thumb_up_alt_outlined,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      b.status,
                                      style: GoogleFonts.dmSans(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PRIORITY',
                                style: GoogleFonts.dmSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF94A3B8),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.black,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.flag_outlined,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      b.urgency.toUpperCase(),
                                      style: GoogleFonts.dmSans(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Date/Time & Location Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.calendar_today_outlined,
                                size: 18,
                                color: Color(0xFF111827),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'DATE & TIME',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF64748B),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      scheduledDateStr,
                                      style: GoogleFonts.dmSans(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF111827),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 18,
                                color: Color(0xFF111827),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'LOCATION',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF64748B),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      b.locationAddress,
                                      style: GoogleFonts.dmSans(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF111827),
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
                    const SizedBox(height: 16),

                    // Worker & Price Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'WORKER',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  b.workerName,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF111827),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ESTIMATED PRICE',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  b.estimatedPrice > 0
                                      ? 'Rs. ${b.estimatedPrice.toStringAsFixed(0)}'
                                      : 'Negotiable',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF111827),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Lifecycle Status
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SERVICE LIFECYCLE STATUS',
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF64748B),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 20),
                          _buildLifecycleStep(
                            '1',
                            'Booking Requested',
                            'Request submitted by resident',
                            currentStep >= 1,
                            isCompleted: currentStep > 1,
                          ),
                          const SizedBox(height: 16),
                          _buildLifecycleStep(
                            '2',
                            'Worker Accepts / Rejects',
                            'Worker accepted the booking',
                            currentStep >= 2,
                            isCompleted: currentStep > 2,
                          ),
                          const SizedBox(height: 16),
                          _buildLifecycleStep(
                            '3',
                            'Confirmed',
                            'Schedule locked in',
                            currentStep >= 3,
                            isCompleted: currentStep > 3,
                          ),
                          const SizedBox(height: 16),
                          _buildLifecycleStep(
                            '4',
                            'In Progress',
                            '',
                            currentStep >= 4,
                            isCompleted: currentStep > 4,
                          ),
                          const SizedBox(height: 16),
                          _buildLifecycleStep(
                            '5',
                            'Completed',
                            '',
                            currentStep >= 5,
                            isCompleted: currentStep > 5,
                          ),
                        ],
                      ),
                    ),

                    if (b.description.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text(
                        'NOTES / DESCRIPTION',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                        ),
                        child: Text(
                          b.description,
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            color: const Color(0xFF334155),
                          ),
                        ),
                      ),
                    ],

                    // Map Preview Card
                    const SizedBox(height: 24),
                    GestureDetector(
                      onTap: () async {
                        final url = Uri.parse(
                          'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(b.locationAddress)}',
                        );
                        if (await canLaunchUrl(url)) {
                          await launchUrl(url);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 38,
                                        height: 38,
                                        decoration: BoxDecoration(
                                          color: Colors.black,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.map_outlined,
                                          color: Colors.white,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Service Location & Map Preview',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w800,
                                                color: const Color(0xFF111827),
                                              ),
                                            ),
                                            Text(
                                              b.locationAddress,
                                              style: GoogleFonts.dmSans(
                                                fontSize: 12,
                                                color: const Color(0xFF71717A),
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.open_in_new,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'View on Google Maps',
                                        style: GoogleFonts.dmSans(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Container(
                              height: 200,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE4E4E7),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.location_on,
                                      color: Color(0xFFE11D48),
                                      size: 48,
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(4),
                                        boxShadow: const [
                                          BoxShadow(
                                            color: Colors.black12,
                                            blurRadius: 4,
                                          ),
                                        ],
                                      ),
                                      child: Text(
                                        'Service Location',
                                        style: GoogleFonts.dmSans(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFFE11D48),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Action Buttons (Cancel / Review)
                    const SizedBox(height: 32),
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
                            foregroundColor: AppColors.error,
                            side: const BorderSide(color: AppColors.error),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Text(
                            'Cancel Booking Request',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (b.status.toLowerCase() == 'completed') ...[
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: FilledButton.icon(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            _showReviewSheet(b);
                          },
                          icon: const Icon(
                            Icons.star_rounded,
                            color: Colors.black,
                          ),
                          label: Text(
                            'Leave a Review',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: Colors.black,
                            ),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.brandYellow,
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
          ],
        ),
      ),
    );
  }

  Widget _buildLifecycleStep(
    String number,
    String title,
    String subtitle,
    bool isActive, {
    bool isCompleted = false,
  }) {
    final color = isActive ? Colors.black : const Color(0xFFCBD5E1);
    final textColor = isActive ? Colors.black : const Color(0xFF94A3B8);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          margin: const EdgeInsets.only(top: 2),
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 14)
                : Text(
                    number,
                    style: GoogleFonts.dmSans(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
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
                title,
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              if (subtitle.isNotEmpty && isActive)
                Text(
                  subtitle,
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    color: const Color(0xFF64748B),
                  ),
                ),
            ],
          ),
        ),
      ],
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
              backgroundColor: AppColors.error,
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Cancelling booking...')));

      final success = await ApiService().cancelBooking(b.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Booking request cancelled successfully.'),
              backgroundColor: AppColors.onPrimary,
            ),
          );
          _fetchBookings();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to cancel booking. Please try again.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  void _showReviewSheet(BookingModel b) {
    int quality = 5;
    int punctuality = 5;
    int communication = 5;
    final TextEditingController commentController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 32,
          ),
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
                Text(
                  'Leave a Review',
                  style: GoogleFonts.dmSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Rate your experience with ${b.workerName}',
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  'Quality & Craftsmanship',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
                ),
                Slider(
                  value: quality.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: quality.toString(),
                  onChanged: (v) => setModalState(() => quality = v.toInt()),
                ),

                Text(
                  'Punctuality',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
                ),
                Slider(
                  value: punctuality.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: punctuality.toString(),
                  onChanged: (v) =>
                      setModalState(() => punctuality = v.toInt()),
                ),

                Text(
                  'Communication',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
                ),
                Slider(
                  value: communication.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: communication.toString(),
                  onChanged: (v) =>
                      setModalState(() => communication = v.toInt()),
                ),
                const SizedBox(height: 16),

                Text(
                  'Comment',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: commentController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText:
                        'Tell us about your experience with this worker...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            final updated = await ApiService().submitReview(
                              b.id,
                              qualityRating: quality,
                              punctualityRating: punctuality,
                              communicationRating: communication,
                              reviewComment: commentController.text.trim(),
                            );

                            if (context.mounted) {
                              Navigator.pop(context);
                              if (updated != null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Review submitted successfully!',
                                    ),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                                _fetchBookings();
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Failed to submit review.'),
                                    backgroundColor: AppColors.error,
                                  ),
                                );
                              }
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.brandYellow,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : Text(
                            'Submit Review',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).whenComplete(() => commentController.dispose());
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Bookings',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
        actions: [
          NotificationBellButton(
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
              }
            },
          ),
        ],
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
                      backgroundColor: AppColors.brandYellow,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Sign In'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchBookings,
              child: _isLoading
                  ? const Center(child: LoadingIndicatorM3E())
                  : _bookings.isEmpty
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
                                Icons.calendar_month_outlined,
                                size: 48,
                                color: AppColors.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No bookings yet',
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'When you book a professional from the Find tab, your booking history will appear here.',
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
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _bookings.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final b = _bookings[index];
                        final color = _getStatusColor(b.status);
                        final scheduled = b.scheduledDate != null
                            ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year}'
                            : 'Upcoming';

                        return Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 12,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      b.workerName,
                                      style: GoogleFonts.dmSans(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: color.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      b.status,
                                      style: GoogleFonts.dmSans(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12,
                                        color: color,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                b.jobTitle,
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface,
                                ),
                              ),
                              if (b.description.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  b.description,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 12,
                                    color: AppColors.onSurfaceVariant,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                              const Divider(
                                height: 24,
                                color: AppColors.outlineVariant,
                              ),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.schedule,
                                    size: 16,
                                    color: AppColors.onSurfaceVariant,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    scheduled,
                                    style: GoogleFonts.dmSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    'Rs. ${b.estimatedPrice.toStringAsFixed(0)}',
                                    style: GoogleFonts.dmSans(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppColors.onSurface,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              Row(
                                children: [
                                  Expanded(
                                    flex:
                                        (b.status.toLowerCase() ==
                                                'requested' ||
                                            b.status.toLowerCase() == 'pending')
                                        ? 3
                                        : 1,
                                    child: SizedBox(
                                      height: 42,
                                      child: ElevatedButton.icon(
                                        onPressed: () => _showBookingDetails(b),
                                        icon: const Icon(
                                          Icons.visibility_outlined,
                                          size: 16,
                                        ),
                                        label: Text(
                                          'View Booking',
                                          style: GoogleFonts.dmSans(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          elevation: 0,
                                          tapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                          foregroundColor: AppColors.onSurface,
                                          backgroundColor:
                                              AppColors.surfaceVariant,
                                          shape: const StadiumBorder(),
                                        ),
                                      ),
                                    ),
                                  ),
                                  if (b.status.toLowerCase() == 'requested' ||
                                      b.status.toLowerCase() == 'pending') ...[
                                    const SizedBox(width: 8),
                                    Expanded(
                                      flex: 2,
                                      child: SizedBox(
                                        height: 42,
                                        child: ElevatedButton.icon(
                                          onPressed: () =>
                                              _confirmCancelBooking(b),
                                          icon: const Icon(
                                            Icons.cancel_outlined,
                                            size: 16,
                                            color: AppColors.error,
                                          ),
                                          label: Text(
                                            'Cancel',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.error,
                                            ),
                                          ),
                                          style: ElevatedButton.styleFrom(
                                            elevation: 0,
                                            tapTargetSize: MaterialTapTargetSize
                                                .shrinkWrap,
                                            foregroundColor: AppColors.error,
                                            backgroundColor: const Color(
                                              0xFFFEE2E2,
                                            ),
                                            shape: const StadiumBorder(),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
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
    int totalUnread = 0;
    for (final c in convs) {
      if (c['unreadCount'] is int) {
        totalUnread += c['unreadCount'] as int;
      }
    }
    ChatSignalRService().setUnreadChatCount(totalUnread);

    if (mounted) {
      setState(() {
        _conversations = convs;
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
                        final user = AuthService().currentUser;
                        final isWorkerMode = user?.activeRole == 'Worker';

                        final name = isWorkerMode
                            ? (c['residentName']?.toString() ??
                                  c['otherPartyName']?.toString() ??
                                  'Resident')
                            : (c['workerName']?.toString() ??
                                  c['otherPartyName']?.toString() ??
                                  'Worker');

                        final profileImageKey = isWorkerMode
                            ? 'residentProfileImage'
                            : 'workerProfileImage';
                        final profileImage = c[profileImageKey]?.toString();

                        final lastMsg =
                            c['lastMessage']?.toString() ??
                            'Conversation started';
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
                            backgroundImage:
                                (profileImage != null &&
                                    profileImage.isNotEmpty &&
                                    profileImage != 'null')
                                ? NetworkImage(profileImage)
                                : null,
                            child:
                                (profileImage == null ||
                                    profileImage.isEmpty ||
                                    profileImage == 'null')
                                ? Text(
                                    name.isNotEmpty
                                        ? name[0].toUpperCase()
                                        : (isWorkerMode ? 'R' : 'W'),
                                    style: GoogleFonts.dmSans(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 18,
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                  )
                                : null,
                          ),
                          title: Text(
                            name,
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w500,
                              fontSize: 16,
                            ),
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
                                  profileImage: profileImage,
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
            const SizedBox(height: 32),

            // Worker Portal Card
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () async {
                  final user = AuthService().currentUser;
                  if (user == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Please sign in to access Worker Mode.',
                          style: GoogleFonts.dmSans(),
                        ),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    return;
                  }

                  // Show quick loading indicator while checking profile
                  showDialog(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.brandYellow,
                      ),
                    ),
                  );

                  WorkerModel? worker;
                  try {
                    worker = await ApiService().fetchMyWorkerProfile(
                      user.email,
                    );
                  } catch (_) {}

                  if (context.mounted) {
                    Navigator.of(context).pop(); // dismiss loading dialog

                    if (worker != null || user.isWorker) {
                      await AuthService().updateActiveRole('Worker');
                    } else {
                      // Open Become Worker bottom sheet
                      BecomeWorkerSheet.show(
                        context,
                        onWorkerCreated: () {
                          // Handled reactively: BecomeWorkerSheet calls AuthService.updateWorkerStatus, switching the shell to WorkerPortalScreen
                        },
                      );
                    }
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.onPrimary,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.handyman_rounded,
                        color: AppColors.brandYellow,
                        size: 28,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Switch to Worker Mode',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Offer your skills and get jobs in your area.',
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: Colors.white,
                        size: 16,
                      ),
                    ],
                  ),
                ),
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
              title: 'Privacy & Security',
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
                await AuthService().logout();
                if (context.mounted) {
                  Navigator.of(
                    context,
                  ).pushNamedAndRemoveUntil('/join', (route) => false);
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
