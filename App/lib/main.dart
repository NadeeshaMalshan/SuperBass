import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/auth_user.dart';
import 'screens/join_screen.dart';
import 'services/auth_service.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/app_components.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService().init();
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

  final List<Widget> _pages = const [
    FindTabScreen(),
    CommunityTabScreen(),
    BookingsTabScreen(),
    ChatsTabScreen(),
    AccountTabScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search_rounded),
            label: 'Find',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups_rounded),
            label: 'Community',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month_rounded),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Chats',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Account',
          ),
        ],
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
  int _selectedCategoryIndex = 0;

  final List<Map<String, dynamic>> _categories = [
    {'name': 'All Pros', 'icon': Icons.apps_rounded, 'count': 48},
    {'name': 'Plumber', 'icon': Icons.plumbing_rounded, 'count': 14},
    {'name': 'Electrician', 'icon': Icons.electrical_services_rounded, 'count': 12},
    {'name': 'Carpenter', 'icon': Icons.carpenter_rounded, 'count': 9},
    {'name': 'Mason', 'icon': Icons.foundation_rounded, 'count': 8},
    {'name': 'Painter', 'icon': Icons.format_paint_rounded, 'count': 11},
    {'name': 'AC Repair', 'icon': Icons.ac_unit_rounded, 'count': 7},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const BrandBadge(),
        actions: [
          IconButton.filledTonal(
            onPressed: () {},
            icon: const Icon(Icons.notifications_none_rounded, size: 22),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surfaceVariant,
              foregroundColor: AppColors.onSurface,
            ),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
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
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.primaryContainer,
                    backgroundImage: (user?.picture != null && user!.picture!.isNotEmpty)
                        ? NetworkImage(user.picture!)
                        : null,
                    child: (user?.picture == null || user!.picture!.isEmpty)
                        ? Text(
                            initial,
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.onPrimaryContainer,
                            ),
                          )
                        : null,
                  ),
                );
              },
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
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

            // Quick CTA Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  PrimaryCtaButton(
                    label: 'Create Community Post',
                    icon: Icons.campaign_rounded,
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Opening Post Creation modal...')),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  SecondaryOutlinedButton(
                    label: 'Join as a Worker / Pro',
                    icon: Icons.handyman_outlined,
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Navigating to Worker Registration...')),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

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
                    onPressed: () {},
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
                      count: cat['count'] as int,
                      isSelected: _selectedCategoryIndex == index,
                      onTap: () {
                        setState(() {
                          _selectedCategoryIndex = index;
                        });
                      },
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
                        'Verified',
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

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  WorkerCard(
                    name: 'Kamal Perera',
                    trade: 'Electrician',
                    rating: 4.9,
                    reviewCount: 38,
                    location: 'Colombo 05',
                    distance: '1.2 km',
                    onBookTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Booking request sent to Kamal!')),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  WorkerCard(
                    name: 'Sunil Weerasinghe',
                    trade: 'Plumber',
                    rating: 4.8,
                    reviewCount: 52,
                    location: 'Nugegoda',
                    distance: '2.5 km',
                    onBookTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Booking request sent to Sunil!')),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  WorkerCard(
                    name: 'Nimal Jayakody',
                    trade: 'Carpenter',
                    rating: 4.7,
                    reviewCount: 29,
                    location: 'Maharagama',
                    distance: '3.8 km',
                    onBookTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Booking request sent to Nimal!')),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
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
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Community Hub',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.brandYellow),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppColors.onPrimaryContainer, size: 26),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Community Assistant',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Ask questions or request recommendations from neighbors.',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: AppColors.onPrimaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _buildPostCard(
            author: 'Dulan Silva',
            time: '2 hours ago',
            tag: 'Help Needed',
            title: 'Urgent: Main water pipe leakage in backyard',
            body: 'Looking for a reliable plumber around Maharagama who can visit today evening.',
            upvotes: 14,
            replies: 5,
          ),
          const SizedBox(height: 14),
          _buildPostCard(
            author: 'Anura Wickramasinghe',
            time: '5 hours ago',
            tag: 'Recommendation',
            title: 'Highly recommend Kamal for domestic electrical rewiring',
            body: 'Kamal completed our switchboard upgrade quickly and charges were very fair. Truly professional work!',
            upvotes: 28,
            replies: 9,
          ),
        ],
      ),
    );
  }

  Widget _buildPostCard({
    required String author,
    required String time,
    required String tag,
    required String title,
    required String body,
    required int upvotes,
    required int replies,
  }) {
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
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.surfaceVariant,
                child: Text(
                  author.substring(0, 1),
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(author, style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(time, style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tag,
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 11, color: AppColors.onSurface),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(title, style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 6),
          Text(body, style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.arrow_upward_rounded, size: 16, color: AppColors.onSurface),
                    const SizedBox(width: 4),
                    Text('$upvotes', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Row(
                children: [
                  const Icon(Icons.mode_comment_outlined, size: 16, color: AppColors.onSurfaceVariant),
                  const SizedBox(width: 6),
                  Text('$replies comments', style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.onSurfaceVariant)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 3. BOOKINGS TAB
class BookingsTabScreen extends StatelessWidget {
  const BookingsTabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Bookings',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildBookingItem(
            proName: 'Kamal Perera',
            trade: 'Electrician',
            date: 'Today, 4:00 PM',
            status: 'Confirmed',
            statusColor: AppColors.success,
          ),
          const SizedBox(height: 14),
          _buildBookingItem(
            proName: 'Sunil Weerasinghe',
            trade: 'Plumber',
            date: 'Yesterday, 10:30 AM',
            status: 'Completed',
            statusColor: AppColors.onSurfaceVariant,
          ),
        ],
      ),
    );
  }

  Widget _buildBookingItem({
    required String proName,
    required String trade,
    required String date,
    required String status,
    required Color statusColor,
  }) {
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
              Text(
                proName,
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status,
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(trade, style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant)),
          const Divider(height: 24, color: AppColors.outlineVariant),
          Row(
            children: [
              const Icon(Icons.schedule, size: 16, color: AppColors.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(date, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600)),
              const Spacer(),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(100, 36),
                  backgroundColor: AppColors.brandYellow,
                  foregroundColor: AppColors.onPrimary,
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
                child: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 4. CHATS TAB
class ChatsTabScreen extends StatelessWidget {
  const ChatsTabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Messages',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800),
        ),
      ),
      body: ListView(
        children: [
          _buildChatTile(
            name: 'Kamal Perera (Electrician)',
            lastMessage: 'I am on my way. Will reach by 4:00 PM.',
            time: '3:42 PM',
            unreadCount: 1,
          ),
          const Divider(height: 1, color: AppColors.outlineVariant),
          _buildChatTile(
            name: 'Sunil Weerasinghe (Plumber)',
            lastMessage: 'Thank you for the rating! Let me know if any issue arises.',
            time: 'Yesterday',
            unreadCount: 0,
          ),
        ],
      ),
    );
  }

  Widget _buildChatTile({
    required String name,
    required String lastMessage,
    required String time,
    required int unreadCount,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: CircleAvatar(
        radius: 24,
        backgroundColor: AppColors.surfaceVariant,
        child: Text(
          name.substring(0, 1),
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      title: Text(
        name,
        style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15),
      ),
      subtitle: Text(
        lastMessage,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(time, style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 4),
          if (unreadCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: const BoxDecoration(
                color: AppColors.brandYellow,
                shape: BoxShape.circle,
              ),
              child: Text(
                '$unreadCount',
                style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.onPrimary),
              ),
            ),
        ],
      ),
      onTap: () {},
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
                  final displayName = user?.name.isNotEmpty == true ? user!.name : 'Guest User';
                  final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'G';
                  final role = user?.activeRole ?? 'Guest';
                  final email = user?.email ?? 'Not signed in';

                  return Column(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: AppColors.primaryContainer,
                        backgroundImage: (user?.picture != null && user!.picture!.isNotEmpty)
                            ? NetworkImage(user.picture!)
                            : null,
                        child: (user?.picture == null || user!.picture!.isEmpty)
                            ? Text(
                                initial,
                                style: GoogleFonts.dmSans(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 32,
                                  color: AppColors.onPrimaryContainer,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        displayName,
                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 20),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$role • $email',
                        style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.onSurfaceVariant),
                      ),
                      if (user == null) ...[
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.pushNamed(context, '/join'),
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
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.onPrimary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.handyman_rounded, color: AppColors.brandYellow, size: 28),
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
                          style: GoogleFonts.dmSans(fontSize: 12, color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                ],
              ),
            ),

            const SizedBox(height: 24),

            _buildSettingsTile(icon: Icons.edit_outlined, title: 'Edit Profile'),
            _buildSettingsTile(icon: Icons.location_on_outlined, title: 'Saved Addresses'),
            _buildSettingsTile(icon: Icons.payment_outlined, title: 'Payment Methods'),
            _buildSettingsTile(icon: Icons.security_outlined, title: 'Privacy & Security'),
            _buildSettingsTile(icon: Icons.help_outline_rounded, title: 'Help & Support'),
            _buildSettingsTile(
              icon: Icons.logout_rounded,
              title: 'Sign Out',
              isDestructive: true,
              onTap: () async {
                await AuthService().logout();
                if (context.mounted) {
                  Navigator.of(context).pushNamedAndRemoveUntil('/join', (route) => false);
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
      leading: Icon(icon, color: isDestructive ? AppColors.error : AppColors.onSurface),
      title: Text(
        title,
        style: GoogleFonts.dmSans(
          fontWeight: FontWeight.w600,
          color: isDestructive ? AppColors.error : AppColors.onSurface,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.outline),
      onTap: onTap ?? () {},
    );
  }
}
