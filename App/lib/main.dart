import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/app_notification_model.dart';
import 'models/auth_user.dart';
import 'models/booking_model.dart';
import 'models/worker_model.dart';
import 'screens/chat_screen.dart';
import 'screens/community_screen.dart';
import 'screens/join_screen.dart';
import 'screens/worker/worker_portal_screen.dart';
import 'screens/worker/become_worker_sheet.dart';
import 'screens/profile_screen.dart';
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
        OneSignal.Debug.setLogLevel(kDebugMode ? OSLogLevel.verbose : OSLogLevel.none);
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
      title: 'superබාස්',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: initialRoute ?? '/',
      routes: {
        '/': (context) => const MainNavigationShell(),
        '/join': (context) => const JoinScreen(),
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

  @override
  void initState() {
    super.initState();
    _initNotifications();
  }

  void _initNotifications() {
    final user = AuthService().currentUser;
    if (user != null) {
      NotificationService().startListening(
        user.email,
        isWorker: user.isWorker,
      );
      ChatSignalRService().connect(user.email);
    }

    AuthService().currentUserNotifier.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    final user = AuthService().currentUser;
    if (user != null) {
      NotificationService().startListening(
        user.email,
        isWorker: user.isWorker,
      );
      ChatSignalRService().connect(user.email);
    } else {
      NotificationService().stopListening();
      ChatSignalRService().disconnect();
    }
  }

  @override
  void dispose() {
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
            const M3BottomNavItem(
              icon: Icons.chat_bubble_outline_rounded,
              selectedIcon: Icons.chat_bubble_rounded,
              label: 'Chats',
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
          body: IndexedStack(
            index: effectiveIndex,
            children: pages,
          ),
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
  }
}

/// 1. FIND SERVICES TAB
class FindTabScreen extends StatefulWidget {
  const FindTabScreen({super.key});

  @override
  State<FindTabScreen> createState() => _FindTabScreenState();
}

class _FindTabScreenState extends State<FindTabScreen> {
  int _selectedCategoryIndex = 0;
  List<WorkerModel> _workers = [];
  bool _isLoading = true;

  final List<Map<String, dynamic>> _categories = [
    {'name': 'All Pros', 'skill': null, 'icon': Icons.apps_rounded},
    {'name': 'Plumber', 'skill': 'Plumbing', 'icon': Icons.plumbing_rounded},
    {'name': 'Electrician', 'skill': 'Electrical', 'icon': Icons.electrical_services_rounded},
    {'name': 'Carpenter', 'skill': 'Carpentry', 'icon': Icons.carpenter_rounded},
    {'name': 'Mason', 'skill': 'Masonry', 'icon': Icons.foundation_rounded},
    {'name': 'Painter', 'skill': 'Painting', 'icon': Icons.format_paint_rounded},
    {'name': 'AC Repair', 'skill': 'AC Repair', 'icon': Icons.ac_unit_rounded},
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
      final selectedSkill = _categories[_selectedCategoryIndex]['skill'] as String?;
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
    if (_selectedCategoryIndex == index) return;
    setState(() {
      _selectedCategoryIndex = index;
    });
    _fetchWorkers();
  }

  void _showBookingSheet(WorkerModel worker) {
    final titleController = TextEditingController(text: 'Need help with ${worker.skills.isNotEmpty ? worker.skills.first : "home service"}');
    final descController = TextEditingController();
    final phoneController = TextEditingController(text: '0771234567');
    DateTime? selectedDate = DateTime.now().add(const Duration(days: 1));
    TimeOfDay? selectedTime = TimeOfDay.now();
    bool isSubmitting = false;

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
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryContainer,
                      ),
                      child: ClipOval(
                        child: (worker.profileImage != null && worker.profileImage!.isNotEmpty && worker.profileImage != 'null')
                            ? Image.network(
                                worker.profileImage!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Center(
                                  child: Text(
                                    worker.name.isNotEmpty ? worker.name[0].toUpperCase() : 'W',
                                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 18),
                                  ),
                                ),
                              )
                            : Center(
                                child: Text(
                                  worker.name.isNotEmpty ? worker.name[0].toUpperCase() : 'W',
                                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 18),
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Book ${worker.name}',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 18),
                          ),
                          Text(
                            worker.skills.isNotEmpty ? worker.skills.join(', ') : 'Professional',
                            style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'Job Title',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(hintText: 'e.g. Pipe leakage repair'),
                ),
                const SizedBox(height: 14),
                Text(
                  'Job Description',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: descController,
                  maxLines: 2,
                  decoration: const InputDecoration(hintText: 'Describe details or location within house'),
                ),
                const SizedBox(height: 14),
                Text(
                  'Contact Phone',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: '07x xxx xxxx'),
                ),
                const SizedBox(height: 14),
                Text(
                  'Schedule Date & Time',
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.calendar_today, size: 18),
                        label: Text(
                          selectedDate == null 
                            ? 'Select Date' 
                            : '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2, '0')}-${selectedDate!.day.toString().padLeft(2, '0')}',
                          style: GoogleFonts.dmSans(),
                        ),
                        onPressed: () async {
                          final d = await showDatePicker(
                            context: context, 
                            initialDate: selectedDate ?? DateTime.now(), 
                            firstDate: DateTime.now(), 
                            lastDate: DateTime.now().add(const Duration(days: 365))
                          );
                          if (d != null) setModalState(() => selectedDate = d);
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          foregroundColor: AppColors.onSurface,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.access_time, size: 18),
                        label: Text(
                          selectedTime == null ? 'Select Time' : selectedTime!.format(context),
                          style: GoogleFonts.dmSans(),
                        ),
                        onPressed: () async {
                          final t = await showTimePicker(
                            context: context, 
                            initialTime: selectedTime ?? TimeOfDay.now()
                          );
                          if (t != null) setModalState(() => selectedTime = t);
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          foregroundColor: AppColors.onSurface,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            
                            DateTime? finalDate;
                            if (selectedDate != null) {
                              final time = selectedTime ?? TimeOfDay.now();
                              finalDate = DateTime(
                                selectedDate!.year, 
                                selectedDate!.month, 
                                selectedDate!.day, 
                                time.hour, 
                                time.minute
                              );
                            }

                            final scaffoldMessenger = ScaffoldMessenger.of(context);
                            final navigator = Navigator.of(sheetContext);

                            final booking = await ApiService().createBooking(
                              workerId: worker.id,
                              jobTitle: titleController.text.trim(),
                              description: descController.text.trim(),
                              urgency: 'Medium', // Default to medium backend requirement
                              scheduledDate: finalDate,
                              contactPhone: phoneController.text.trim(),
                              estimatedPrice: worker.hourlyRate > 0 ? worker.hourlyRate : 2500.0,
                            );

                            if (sheetContext.mounted) {
                              navigator.pop();
                            }
                            if (mounted) {
                              if (booking != null) {
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(
                                    content: Text('Booking #${booking.id} created with ${worker.name}!'),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                scaffoldMessenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('Failed to create booking. Check backend connection.'),
                                    backgroundColor: AppColors.error,
                                  ),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandYellow,
                      foregroundColor: Colors.black,
                      shape: const StadiumBorder(),
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 22, height: 22, child: LoadingIndicatorM3E())
                        : Text(
                            'Confirm & Send Request',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                  ),
                ),
              ],
            ),
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
                final displayName = user?.name.isNotEmpty == true ? user!.name : 'User';
                final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';
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
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primaryContainer,
                      border: Border.all(color: AppColors.brandYellow, width: 1.5),
                    ),
                    child: ClipOval(
                      child: (user?.picture != null && user!.picture!.isNotEmpty)
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
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
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

              // Category Trades Grid/List
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Browse Categories',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() => _selectedCategoryIndex = 0);
                        _fetchWorkers();
                      },
                      child: Text(
                        'View All',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              SizedBox(
                height: 105,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _categories.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return SizedBox(
                      width: 76,
                      child: CategoryCard(
                        title: cat['name'] as String,
                        icon: cat['icon'] as IconData,
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
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.verified, size: 16, color: AppColors.brandYellowHover),
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
                              color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              children: [
                                const Icon(Icons.engineering_outlined, size: 48, color: AppColors.onSurfaceVariant),
                                const SizedBox(height: 12),
                                Text(
                                  'No workers found in this category',
                                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Try selecting "All Pros" or refreshing',
                                  style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
                                ),
                              ],
                            ),
                          )
                        : Column(
                            children: _workers.map((worker) {
                              final trade = worker.skills.isNotEmpty ? worker.skills.first : 'General Pro';
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12.0),
                                child: WorkerCard(
                                  name: worker.name,
                                  trade: trade,
                                  rating: worker.overallRating,
                                  reviewCount: worker.completedJobs,
                                  location: worker.primaryServiceArea ?? 'Colombo',
                                  distance: worker.distance != null ? '${worker.distance!.toStringAsFixed(1)} km' : 'Unknown',
                                  profileImage: worker.profileImage,
                                  onBookTap: () => _showBookingSheet(worker),
                                ),
                              );
                            }).toList(),
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
    final color = _getStatusColor(b.status);
    final scheduledDateStr = b.scheduledDate != null
        ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year} at ${b.scheduledDate!.hour.toString().padLeft(2, '0')}:${b.scheduledDate!.minute.toString().padLeft(2, '0')}'
        : 'Flexible / ASAP';
    final requestedDateStr = '${b.createdAt.day}/${b.createdAt.month}/${b.createdAt.year}';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.only(left: 24, right: 24, top: 20, bottom: 32),
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Booking Details',
                        style: GoogleFonts.dmSans(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Booking #${b.id}',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      b.status,
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Worker Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.outlineVariant),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryContainer,
                      ),
                      child: Center(
                        child: Text(
                          b.workerName.isNotEmpty ? b.workerName[0].toUpperCase() : 'W',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w800,
                            color: AppColors.onPrimaryContainer,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            b.workerName,
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                          if (b.workerPhone != null && b.workerPhone!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              b.workerPhone!,
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Job Info
              Text(
                'Job Information',
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurfaceVariant,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                b.jobTitle,
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              if (b.description.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  b.description,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    color: AppColors.onSurfaceVariant,
                    height: 1.4,
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Info items
              _buildDetailItem(
                Icons.calendar_today_outlined,
                'Scheduled Date',
                scheduledDateStr,
              ),
              const SizedBox(height: 12),
              _buildDetailItem(
                Icons.location_on_outlined,
                'Location',
                b.locationAddress,
              ),
              const SizedBox(height: 12),
              _buildDetailItem(
                Icons.speed_outlined,
                'Urgency',
                b.urgency,
              ),
              const SizedBox(height: 12),
              _buildDetailItem(
                Icons.history_outlined,
                'Requested On',
                requestedDateStr,
              ),
              const Divider(height: 28, color: AppColors.outlineVariant),

              // Price Breakdown
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Estimated Price (${b.pricingModel})',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    'Rs. ${b.estimatedPrice.toStringAsFixed(0)}',
                    style: GoogleFonts.dmSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              if (b.status.toLowerCase() == 'requested' || b.status.toLowerCase() == 'pending') ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _confirmCancelBooking(b);
                    },
                    icon: const Icon(Icons.cancel_outlined, color: AppColors.error),
                    label: Text(
                      'Cancel Booking Request',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.error,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.error, width: 1.5),
                      foregroundColor: AppColors.error,
                      backgroundColor: AppColors.error.withValues(alpha: 0.05),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (b.status.toLowerCase() == 'completed') ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _showReviewSheet(b);
                    },
                    icon: const Icon(Icons.star_rounded, color: Colors.black),
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
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Close Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.onPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Close',
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
    );
  }

  Widget _buildDetailItem(IconData icon, String title, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.dmSans(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              value,
              style: GoogleFonts.dmSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
              ),
            ),
          ],
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cancelling booking...')),
      );

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
                
                Text('Quality & Craftsmanship', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                Slider(
                  value: quality.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: quality.toString(),
                  onChanged: (v) => setModalState(() => quality = v.toInt()),
                ),
                
                Text('Punctuality', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                Slider(
                  value: punctuality.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: punctuality.toString(),
                  onChanged: (v) => setModalState(() => punctuality = v.toInt()),
                ),
                
                Text('Communication', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                Slider(
                  value: communication.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: communication.toString(),
                  onChanged: (v) => setModalState(() => communication = v.toInt()),
                ),
                const SizedBox(height: 16),
                
                Text('Comment', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: commentController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Tell us about your experience with this worker...',
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
                    onPressed: isSubmitting ? null : () async {
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
                            const SnackBar(content: Text('Review submitted successfully!'), backgroundColor: AppColors.success),
                          );
                          _fetchBookings();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Failed to submit review.'), backgroundColor: AppColors.error),
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
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : Text('Submit Review', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15)),
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
                  const Icon(Icons.lock_outline_rounded, size: 48, color: AppColors.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'Sign in to view your bookings',
                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/join'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.brandYellow, foregroundColor: Colors.black),
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
                                color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.calendar_month_outlined, size: 48, color: AppColors.onSurfaceVariant),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No bookings yet',
                                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'When you book a professional from the Find tab, your booking history will appear here.',
                                    style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
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
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.outlineVariant),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                      style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.onSurfaceVariant),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                  const Divider(height: 24, color: AppColors.outlineVariant),
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
                                        flex: (b.status.toLowerCase() == 'requested' || b.status.toLowerCase() == 'pending') ? 3 : 1,
                                        child: SizedBox(
                                          height: 40,
                                          child: OutlinedButton.icon(
                                            onPressed: () => _showBookingDetails(b),
                                            icon: const Icon(Icons.visibility_outlined, size: 16),
                                            label: Text(
                                              'View Booking',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              minimumSize: const Size(0, 40),
                                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              side: const BorderSide(color: AppColors.outlineVariant, width: 1.5),
                                              foregroundColor: AppColors.onSurface,
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              backgroundColor: AppColors.surfaceVariant.withValues(alpha: 0.4),
                                            ),
                                          ),
                                        ),
                                      ),
                                      if (b.status.toLowerCase() == 'requested' || b.status.toLowerCase() == 'pending') ...[
                                        const SizedBox(width: 8),
                                        Expanded(
                                          flex: 2,
                                          child: SizedBox(
                                            height: 40,
                                            child: OutlinedButton.icon(
                                              onPressed: () => _confirmCancelBooking(b),
                                              icon: const Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                                              label: Text(
                                                'Cancel',
                                                style: GoogleFonts.dmSans(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.error,
                                                ),
                                              ),
                                              style: OutlinedButton.styleFrom(
                                                minimumSize: const Size(0, 40),
                                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                side: const BorderSide(color: AppColors.error, width: 1.2),
                                                foregroundColor: AppColors.error,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                backgroundColor: AppColors.error.withValues(alpha: 0.05),
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
        final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
        final minute = dt.minute.toString().padLeft(2, '0');
        final ampm = dt.hour >= 12 ? 'pm' : 'am';
        return '$hour:$minute $ampm';
      } else if (diff.inDays < 7 && diff.inDays >= 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days[dt.weekday - 1];
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
        actions: const [
          NotificationBellButton(),
        ],
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
                                color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.chat_bubble_outline_rounded, size: 48, color: AppColors.onSurfaceVariant),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No messages yet',
                                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Conversations with workers you hire will appear here.',
                                    style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
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
                            final name = c['workerName']?.toString() ?? c['otherPartyName']?.toString() ?? 'Worker';
                            final lastMsg = c['lastMessage']?.toString() ?? 'Conversation started';
                            final unread = c['unreadCount'] is int ? c['unreadCount'] as int : 0;
                            final timeStr = _formatMessageTime(c['updatedAt']?.toString() ?? c['lastMessageAt']?.toString());

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              leading: CircleAvatar(
                                radius: 26,
                                backgroundColor: AppColors.surfaceVariant,
                                backgroundImage: (c['workerProfileImage'] != null && c['workerProfileImage'].toString().isNotEmpty && c['workerProfileImage'].toString() != 'null')
                                    ? NetworkImage(c['workerProfileImage'].toString())
                                    : null,
                                child: (c['workerProfileImage'] == null || c['workerProfileImage'].toString().isEmpty || c['workerProfileImage'].toString() == 'null')
                                    ? Text(
                                        name.isNotEmpty ? name[0].toUpperCase() : 'W',
                                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 18, color: AppColors.onSurfaceVariant),
                                      )
                                    : null,
                              ),
                              title: Text(
                                name,
                                style: GoogleFonts.dmSans(fontWeight: FontWeight.w500, fontSize: 16),
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
                                    fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w400,
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
                                        color: unread > 0 ? AppColors.onSurface : AppColors.onSurfaceVariant,
                                        fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w400,
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
                                  ]
                                ],
                              ),
                              onTap: () async {
                                final convId = c['id'] is int ? c['id'] as int : int.tryParse(c['id']?.toString() ?? '0') ?? 0;
                                final userEmail = AuthService().currentUser?.email;

                                // Optimistically clear unread count badge in UI immediately
                                setState(() {
                                  c['unreadCount'] = 0;
                                });

                                if (userEmail != null && convId > 0) {
                                  ApiService().markConversationAsRead(convId, userEmail);
                                }

                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ChatScreen(
                                      conversationId: convId,
                                      name: name,
                                      profileImage: c['workerProfileImage']?.toString(),
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
                          border: Border.all(color: AppColors.brandYellow, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.brandYellow.withValues(alpha: 0.3),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: (user?.picture != null && user!.picture!.isNotEmpty)
                              ? Image.network(
                                  user.picture!,
                                  width: 96,
                                  height: 96,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => Center(
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
                        content: Text('Please sign in to access Worker Mode.', style: GoogleFonts.dmSans()),
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
                      child: CircularProgressIndicator(color: AppColors.brandYellow),
                    ),
                  );

                  WorkerModel? worker;
                  try {
                    worker = await ApiService().fetchMyWorkerProfile(user.email);
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
