import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/worker_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';
import 'worker_dashboard_screen.dart';
import 'worker_jobs_screen.dart';
import 'worker_performance_screen.dart';
import 'worker_profile_screen.dart';
import '../community_screen.dart';

class WorkerPortalScreen extends StatefulWidget {
  const WorkerPortalScreen({super.key});

  @override
  State<WorkerPortalScreen> createState() => _WorkerPortalScreenState();
}

class _WorkerPortalScreenState extends State<WorkerPortalScreen> {
  int _currentIndex = 0;
  WorkerModel? _worker;
  bool _isLoading = true;
  bool _isOnline = true;
  bool _isTogglingStatus = false;

  @override
  void initState() {
    super.initState();
    _loadWorker();
  }

  Future<void> _loadWorker() async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final worker = await ApiService().fetchMyWorkerProfile(email);
      if (mounted) {
        setState(() {
          _worker = worker;
          _isOnline = worker?.isAvailable ?? true;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading worker in portal: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleAvailability() async {
    if (_isTogglingStatus || _worker == null) return;

    final newStatus = !_isOnline;
    setState(() {
      _isTogglingStatus = true;
      _isOnline = newStatus;
    });

    final success = await ApiService().updateWorkerAvailability(
      _worker!.id,
      isAvailable: newStatus,
    );

    if (mounted) {
      setState(() => _isTogglingStatus = false);
      if (!success) {
        // Rollback on failure
        setState(() => _isOnline = !newStatus);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update availability.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.error,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newStatus ? '✓ You are now Available for new jobs!' : 'You are now Offline.',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
            ),
            backgroundColor: newStatus ? WorkerColors.success : WorkerColors.onSurface,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  void _exitWorkerMode() {
    if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: WorkerColors.background,
        body: const Center(
          child: CircularProgressIndicator(color: WorkerColors.primary),
        ),
      );
    }

    final pages = [
      WorkerDashboardScreen(
        worker: _worker,
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      const WorkerJobsScreen(),
      const CommunityScreen(isWorkerMode: true),
      WorkerPerformanceScreen(worker: _worker),
      WorkerProfileScreen(
        worker: _worker,
        isOnline: _isOnline,
        onAvailabilityChanged: (val) => setState(() => _isOnline = val),
        onWorkerUpdated: _loadWorker,
        onExitWorkerMode: _exitWorkerMode,
      ),
    ];

    return Scaffold(
      backgroundColor: WorkerColors.background,
      appBar: _currentIndex == 2
          ? null
          : AppBar(
              backgroundColor: WorkerColors.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            // SuperBass brand + Worker Portal pill
            Text(
              'superබාස්',
              style: GoogleFonts.dmSans(
                fontWeight: FontWeight.w900,
                fontSize: 20,
                color: WorkerColors.onSurface,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: WorkerColors.primaryLight,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: WorkerColors.primaryBorder),
              ),
              child: Text(
                'WORKER',
                style: GoogleFonts.dmSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: WorkerColors.primary,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
        actions: [
          // Live Availability Switch Pill
          InkWell(
            onTap: _toggleAvailability,
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _isOnline ? WorkerColors.onlineLight : WorkerColors.offlineLight,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _isOnline
                      ? WorkerColors.online.withValues(alpha: 0.4)
                      : WorkerColors.outlineVariant,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _isOnline ? WorkerColors.online : WorkerColors.offline,
                      shape: BoxShape.circle,
                      boxShadow: _isOnline
                          ? [
                              BoxShadow(
                                color: WorkerColors.online.withValues(alpha: 0.5),
                                blurRadius: 4,
                                spreadRadius: 1,
                              ),
                            ]
                          : null,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _isOnline ? 'Online' : 'Offline',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _isOnline ? WorkerColors.online : WorkerColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Account Log Out button
          IconButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Text(
                    'Log Out',
                    style: GoogleFonts.dmSans(
                      fontWeight: FontWeight.w800,
                      color: WorkerColors.onSurface,
                    ),
                  ),
                  content: Text(
                    'Are you sure you want to log out of SuperBass?',
                    style: GoogleFonts.dmSans(fontSize: 14),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: Text(
                        'Cancel',
                        style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant),
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.error,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(
                        'Log Out',
                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                await AuthService().logout();
                if (context.mounted) {
                  Navigator.of(context).pushNamedAndRemoveUntil('/join', (route) => false);
                }
              }
            },
            tooltip: 'Log Out',
            icon: const Icon(Icons.logout_rounded, color: WorkerColors.onSurfaceVariant, size: 20),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: WorkerColors.outlineVariant,
            height: 1,
          ),
        ),
      ),
      body: Stack(
        children: [
          // Page Content
          IndexedStack(
            index: _currentIndex,
            children: pages,
          ),

          // Floating Pill Bottom Navigation Bar (Worker Palette)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildWorkerBottomNav(),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkerBottomNav() {
    final bottomInset = MediaQuery.of(context).padding.bottom;

    final navItems = [
      _WorkerNavItem(
        label: 'Dashboard',
        icon: Icons.space_dashboard_outlined,
        selectedIcon: Icons.space_dashboard_rounded,
      ),
      _WorkerNavItem(
        label: 'My Jobs',
        icon: Icons.work_outline_rounded,
        selectedIcon: Icons.work_rounded,
      ),
      _WorkerNavItem(
        label: 'Community',
        icon: Icons.groups_outlined,
        selectedIcon: Icons.groups_rounded,
      ),
      _WorkerNavItem(
        label: 'Performance',
        icon: Icons.star_outline_rounded,
        selectedIcon: Icons.star_rounded,
      ),
      _WorkerNavItem(
        label: 'Profile',
        icon: Icons.manage_accounts_outlined,
        selectedIcon: Icons.manage_accounts_rounded,
      ),
    ];

    return Container(
      color: Colors.transparent,
      padding: EdgeInsets.fromLTRB(
        16,
        4,
        16,
        bottomInset > 0 ? bottomInset : 16,
      ),
      child: Container(
        height: 66,
        decoration: BoxDecoration(
          color: WorkerColors.surface,
          borderRadius: BorderRadius.circular(33),
          border: Border.all(color: WorkerColors.outlineVariant, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
              blurRadius: 22,
              offset: const Offset(0, 6),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(navItems.length, (index) {
            final item = navItems[index];
            final bool isSelected = _currentIndex == index;

            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
                child: InkWell(
                  onTap: () => setState(() => _currentIndex = index),
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeInOut,
                    decoration: BoxDecoration(
                      color: isSelected ? WorkerColors.primaryContainer : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: WorkerColors.primary.withValues(alpha: 0.15),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isSelected ? item.selectedIcon : item.icon,
                          size: 22,
                          color: isSelected ? WorkerColors.primary : WorkerColors.onSurfaceVariant,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? WorkerColors.primary : WorkerColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _WorkerNavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;

  const _WorkerNavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });
}
