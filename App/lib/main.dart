import 'package:flutter/material.dart';
<<<<<<< Updated upstream
=======
import 'package:google_fonts/google_fonts.dart';
import 'models/auth_user.dart';
import 'models/booking_model.dart';
import 'models/worker_model.dart';
import 'screens/chat_screen.dart';
import 'screens/community_screen.dart';
import 'screens/join_screen.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/app_components.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';
>>>>>>> Stashed changes

void main() {
  runApp(const SuperBassApp());
}

class SuperBassApp extends StatelessWidget {
  const SuperBassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Super බාස්',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFDC101),
          primary: const Color(0xFFFDC101),
          onPrimary: Colors.black,
          secondary: Colors.black,
          onSecondary: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: false,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFDC101),
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(50),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(50),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.grey.shade100,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
      ),
      home: const FindServicesScreen(),
    );
  }
}

class FindServicesScreen extends StatelessWidget {
  const FindServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            // Placeholder for logo
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFDC101),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Super බාස්',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: FilledButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.person, size: 20),
              label: const Text('Account'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
        ],
      ),
<<<<<<< Updated upstream
=======
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
                height: 120,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _categories.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return SizedBox(
                      width: 105,
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
                                  reviewCount: worker.completedJobs > 0 ? worker.completedJobs : 12,
                                  location: worker.primaryServiceArea ?? 'Colombo',
                                  distance: '1.5 km',
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

/// 2. COMMUNITY TAB
class CommunityTabScreen extends StatelessWidget {
  const CommunityTabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const CommunityScreen();
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
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchBookings,
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
                          separatorBuilder: (_, __) => const SizedBox(height: 14),
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

  @override
  void initState() {
    super.initState();
    _fetchChats();
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
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchChats,
          ),
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
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ChatScreen(
                                      conversationId: c['id'] is int ? c['id'] as int : int.tryParse(c['id']?.toString() ?? '0') ?? 0,
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
>>>>>>> Stashed changes
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Search Bar
            TextField(
              decoration: InputDecoration(
                hintText: 'Search for services or pros...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.filter_list),
                  onPressed: () {},
                ),
              ),
            ),
            const SizedBox(height: 32),
            
            // Welcome Section
            const Text(
              'Find Services',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            const Text(
              'This is the find page, styled to match your React web app.',
              style: TextStyle(fontSize: 16, color: Colors.black54),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),

            // Action Buttons
            ElevatedButton(
              onPressed: () {},
              child: const Text('Create community post'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {},
              child: const Text('Join as Worker'),
            ),
          ],
        ),
      ),
    );
  }
}
