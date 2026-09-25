import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/booking_model.dart';
import '../../models/worker_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';

class WorkerDashboardScreen extends StatefulWidget {
  final WorkerModel? worker;
  final Function(int tabIndex)? onNavigateTab;

  const WorkerDashboardScreen({
    super.key,
    this.worker,
    this.onNavigateTab,
  });

  @override
  State<WorkerDashboardScreen> createState() => _WorkerDashboardScreenState();
}

class _WorkerDashboardScreenState extends State<WorkerDashboardScreen> {
  WorkerModel? _worker;
  Map<String, dynamic>? _performance;
  List<BookingModel> _pendingBookings = [];
  BookingModel? _recentReview;
  bool _isLoading = true;
  String _selectedOverviewPeriod = 'All Time';
  String _currentLocation = 'Colombo, Western Province';

  @override
  void initState() {
    super.initState();
    _worker = widget.worker;
    if (_worker?.primaryServiceArea != null && _worker!.primaryServiceArea!.isNotEmpty) {
      _currentLocation = '${_worker!.primaryServiceArea}, Western Province';
    }
    _loadDashboardData();
  }

  @override
  void didUpdateWidget(covariant WorkerDashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.worker != oldWidget.worker) {
      _worker = widget.worker;
      if (_worker?.primaryServiceArea != null && _worker!.primaryServiceArea!.isNotEmpty) {
        _currentLocation = '${_worker!.primaryServiceArea}, Western Province';
      }
    }
  }

  Future<void> _loadDashboardData() async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final worker = _worker ?? await ApiService().fetchMyWorkerProfile(email);
      if (worker != null) {
        final perf = await ApiService().fetchWorkerPerformance(worker.id);
        final allBookings = await ApiService().fetchWorkerBookings(email);

        final pending = allBookings
            .where((b) =>
                b.status.toLowerCase() == 'requested' ||
                b.status.toLowerCase() == 'pending')
            .toList();

        final reviewed = allBookings
            .where((b) =>
                (b.status.toLowerCase() == 'reviewed' || b.reviewRating != null) &&
                (b.reviewComment?.isNotEmpty ?? false))
            .toList();

        if (mounted) {
          setState(() {
            _worker = worker;
            _performance = perf;
            _pendingBookings = pending;
            if (reviewed.isNotEmpty) {
              _recentReview = reviewed.first;
            }
            if (worker.primaryServiceArea != null && worker.primaryServiceArea!.isNotEmpty) {
              _currentLocation = '${worker.primaryServiceArea}, Western Province';
            }
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('Error loading worker dashboard: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getTimeGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }

  Future<void> _handleAccept(BookingModel booking) async {
    if (booking.id == 9999) {
      // Demo booking action
      setState(() {
        _pendingBookings.removeWhere((b) => b.id == booking.id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Request Accepted! Moved to My Jobs.',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
          backgroundColor: WorkerColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      widget.onNavigateTab?.call(1);
      return;
    }

    final updated = await ApiService().acceptBooking(booking.id);
    if (mounted) {
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Request Accepted! Moved to My Jobs.',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
            backgroundColor: WorkerColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadDashboardData();
        widget.onNavigateTab?.call(1);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to accept booking. Please try again.',
                style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _handleDecline(BookingModel booking) async {
    final reasonController = TextEditingController(text: 'Worker schedule unavailable');
    final shouldDecline = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Decline Booking Request',
            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Optionally provide a reason for declining:',
                style: GoogleFonts.dmSans(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'e.g. Busy on this date / outside service area',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel',
                style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: WorkerColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text('Decline', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (shouldDecline != true) return;

    if (booking.id == 9999) {
      setState(() {
        _pendingBookings.removeWhere((b) => b.id == booking.id);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking request declined.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.onSurface,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    final updated = await ApiService().rejectBooking(booking.id,
        reason: reasonController.text.trim());
    if (mounted) {
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking request declined.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.onSurface,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadDashboardData();
      }
    }
  }

  void _showChangeLocationSheet() {
    final areas = [
      'Colombo, Western Province',
      'Colombo 03, Western Province',
      'Colombo Central, Western Province',
      'Gampaha, Western Province',
      'Kalutara, Western Province',
      'Kandy, Central Province',
      'Galle, Southern Province',
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
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
                'Select Primary Service Area',
                style: GoogleFonts.dmSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Resident job alerts will prioritize this operational zone.',
                style: GoogleFonts.dmSans(fontSize: 13, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),
              ...areas.map((area) {
                final isSelected = area == _currentLocation;
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  leading: Icon(
                    Icons.near_me_outlined,
                    color: isSelected ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                    size: 20,
                  ),
                  title: Text(
                    area,
                    style: GoogleFonts.dmSans(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF475569),
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle_rounded,
                          color: Color(0xFF059669), size: 20)
                      : null,
                  onTap: () {
                    setState(() => _currentLocation = area);
                    Navigator.of(ctx).pop();
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  void _showPeriodFilterMenu() {
    final periods = ['All Time', 'This Month', 'This Week', 'Today'];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
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
                'Select Metric Timeframe',
                style: GoogleFonts.dmSans(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              ...periods.map((p) {
                final isSelected = p == _selectedOverviewPeriod;
                return ListTile(
                  leading: Icon(
                    Icons.calendar_today_outlined,
                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
                    size: 18,
                  ),
                  title: Text(
                    p,
                    style: GoogleFonts.dmSans(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF334155),
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_rounded, color: Color(0xFF2563EB), size: 20)
                      : null,
                  onTap: () {
                    setState(() => _selectedOverviewPeriod = p);
                    Navigator.of(ctx).pop();
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: WorkerColors.primary),
      );
    }

    final worker = _worker ?? widget.worker;
    final fullName = worker?.name ?? AuthService().currentUser?.name ?? 'Kasun';
    final firstName = fullName.trim().split(' ').first;

    // Display bookings: real bookings if available, otherwise match screenshot sample
    final List<BookingModel> displayBookings = _pendingBookings.isNotEmpty
        ? _pendingBookings
        : [
            BookingModel(
              id: 9999,
              residentEmail: 'jayashan@example.com',
              residentName: 'JAYASHAN MANODYA',
              workerId: worker?.id ?? 1,
              workerName: fullName,
              jobTitle: 'Need help with Electrical',
              urgency: 'Medium',
              scheduledDate: DateTime.now().add(const Duration(days: 2, hours: 4)),
              locationAddress: 'Colombo 03',
              estimatedPrice: 2000.0,
              status: 'Pending',
              createdAt: DateTime.now(),
            ),
          ];

    // Performance metrics
    final rawOverall = _performance?['overallRating'] ??
        _performance?['OverallRating'] ??
        worker?.overallRating;
    final overallStr = rawOverall != null
        ? (rawOverall as num).toStringAsFixed(1)
        : '5.0';

    final rawCompletion =
        _performance?['completionRate'] ?? _performance?['CompletionRate'];
    final completionStr = (rawCompletion != null && rawCompletion.toString().isNotEmpty)
        ? rawCompletion.toString()
        : '0.0%';

    final rawCompletedJobs = _performance?['completedJobs'] ??
        _performance?['CompletedJobs'] ??
        worker?.completedJobs ??
        0;

    final rawAcceptance =
        _performance?['acceptanceRate'] ?? _performance?['AcceptanceRate'];
    final acceptanceStr = (rawAcceptance != null && rawAcceptance.toString().isNotEmpty)
        ? rawAcceptance.toString()
        : 'N/A';

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      color: WorkerColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Welcome Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Row: Icon + GOOD MORNING • FIELD READY
                  Row(
                    children: [
                      const Icon(
                        Icons.wb_sunny_outlined,
                        size: 16,
                        color: Color(0xFF2563EB),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${_getTimeGreeting()} • FIELD READY',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF2563EB),
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Welcome back, Kasun!
                  Text(
                    'Welcome back, $firstName!',
                    style: GoogleFonts.dmSans(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.6,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Location Row: Compass Icon + Colombo, Western Province + Change ⌵
                  Row(
                    children: [
                      const Icon(
                        Icons.near_me_outlined,
                        size: 16,
                        color: Color(0xFF059669),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _currentLocation,
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: _showChangeLocationSheet,
                        borderRadius: BorderRadius.circular(6),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Change',
                                style: GoogleFonts.dmSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF2563EB),
                                ),
                              ),
                              const SizedBox(width: 2),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 16,
                                color: Color(0xFF2563EB),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 2. PRO TIP Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: const BoxDecoration(
                              color: Color(0xFFECFDF5),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.lightbulb_outline_rounded,
                              color: Color(0xFF059669),
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'PRO TIP',
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF047857),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          'Setup 60%',
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF334155),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Complete your profile setup to unlock priority booking & zero-commission job alerts in Colombo Central.',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      height: 1.45,
                      fontWeight: FontWeight.w400,
                      color: const Color(0xFF475569),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),

            // 3. Overview Header & 4 Metrics
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Overview',
                      style: GoogleFonts.dmSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Live operational metrics',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: _showPeriodFilterMenu,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 13,
                          color: Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _selectedOverviewPeriod,
                          style: GoogleFonts.dmSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 16,
                          color: Color(0xFF64748B),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 4 Metrics Grid (2x2)
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.62,
              children: [
                _buildOverviewMetricCard(
                  icon: Icons.star_outline_rounded,
                  iconBg: const Color(0xFFFEF3C7),
                  iconColor: const Color(0xFFF59E0B),
                  prefix: '★ ',
                  value: overallStr,
                  label: 'Overall Rating',
                ),
                _buildOverviewMetricCard(
                  icon: Icons.verified_outlined,
                  iconBg: const Color(0xFFEFF6FF),
                  iconColor: const Color(0xFF2563EB),
                  value: completionStr,
                  label: 'Completion R...',
                ),
                _buildOverviewMetricCard(
                  icon: Icons.work_outline_rounded,
                  iconBg: const Color(0xFFECFDF5),
                  iconColor: const Color(0xFF10B981),
                  value: '$rawCompletedJobs',
                  label: 'Completed J...',
                ),
                _buildOverviewMetricCard(
                  icon: Icons.thumb_up_alt_outlined,
                  iconBg: const Color(0xFFF3E8FF),
                  iconColor: const Color(0xFF9333EA),
                  value: acceptanceStr,
                  label: 'Acceptance ...',
                ),
              ],
            ),
            const SizedBox(height: 22),

            // 4. Pending Requests Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.notifications_active_rounded,
                      color: Color(0xFF2563EB),
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Pending Requests (${displayBookings.length})',
                      style: GoogleFonts.dmSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () => widget.onNavigateTab?.call(1),
                  child: Text(
                    'VIEW ALL',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF2563EB),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Pending Request Card(s)
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayBookings.take(2).length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final req = displayBookings[index];
                final dateStr = req.scheduledDate != null
                    ? '${req.scheduledDate!.day}/${req.scheduledDate!.month} at ${req.scheduledDate!.hour.toString().padLeft(2, '0')}:${req.scheduledDate!.minute.toString().padLeft(2, '0')}'
                    : '27/9 at 21:00';

                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Job Title + Urgency Pill
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              req.jobTitle,
                              style: GoogleFonts.dmSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Text(
                              req.urgency,
                              style: GoogleFonts.dmSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFB45309),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Resident Name
                      Row(
                        children: [
                          const Icon(
                            Icons.person_outline_rounded,
                            size: 16,
                            color: Color(0xFF64748B),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            req.residentName.toUpperCase(),
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF334155),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Schedule & Location Container
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.access_time_rounded,
                              size: 15,
                              color: Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              dateStr,
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(width: 14),
                            const Icon(
                              Icons.near_me_outlined,
                              size: 15,
                              color: Color(0xFF059669),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${req.locationAddress} • 2.4 km away',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF334155),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Bottom Payout and Buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ESTIMATED\nPAYOUT',
                                style: GoogleFonts.dmSans(
                                  fontSize: 9,
                                  height: 1.1,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF64748B),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Rs. ${req.estimatedPrice.round() > 0 ? req.estimatedPrice.round().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},') : '2,000'}',
                                style: GoogleFonts.dmSans(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF1D4ED8),
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              // Decline Button
                              InkWell(
                                onTap: () => _handleDecline(req),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    'Decline',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF475569),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Accept Job Button (Styled exactly like screenshot)
                              InkWell(
                                onTap: () => _handleAccept(req),
                                borderRadius: BorderRadius.circular(24),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1D68D8),
                                    borderRadius: BorderRadius.circular(24),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF1D68D8)
                                            .withValues(alpha: 0.28),
                                        blurRadius: 8,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.check_rounded,
                                          color: Colors.white, size: 18),
                                      const SizedBox(width: 6),
                                      Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          Text(
                                            'Accept',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 12,
                                              height: 1.1,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                          Text(
                                            'Job',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 12,
                                              height: 1.1,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 22),

            // 5. Quick Actions Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Quick Actions',
                  style: GoogleFonts.dmSans(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  'Worker Setup',
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 4 Distinct Quick Action Cards
            _buildQuickActionCard(
              icon: Icons.chat_bubble_outline_rounded,
              iconBg: const Color(0xFFECFDF5),
              iconColor: const Color(0xFF10B981),
              title: 'Explore Community Dis...',
              badgeText: 'Active',
              badgeBg: const Color(0xFFECFDF5),
              badgeTextColor: const Color(0xFF059669),
              subtitle: 'Connect with 1,200+ local Colombo...',
              onTap: () => widget.onNavigateTab?.call(2), // Community
            ),
            const SizedBox(height: 10),

            _buildQuickActionCard(
              icon: Icons.handyman_outlined,
              iconBg: const Color(0xFFEFF6FF),
              iconColor: const Color(0xFF2563EB),
              title: 'Update Skills & Rates',
              badgeText: '2x Faster',
              badgeBg: const Color(0xFFDBEAFE),
              badgeTextColor: const Color(0xFF1D4ED8),
              subtitle: 'Plumbing, Electrical, Handyman services',
              onTap: () => widget.onNavigateTab?.call(4), // Profile / Skills
            ),
            const SizedBox(height: 10),

            _buildQuickActionCard(
              icon: Icons.access_time_rounded,
              iconBg: const Color(0xFFF1F5F9),
              iconColor: const Color(0xFF475569),
              title: 'Set Working Hours & Availability',
              subtitle: 'Mon - Sat • 8:00 AM - 6:00 PM',
              onTap: () => widget.onNavigateTab?.call(4), // Profile / Availability
            ),
            const SizedBox(height: 10),

            _buildQuickActionCard(
              icon: Icons.trending_up_rounded,
              iconBg: const Color(0xFFF3E8FF),
              iconColor: const Color(0xFF9333EA),
              title: 'View Detailed Rating Analytics',
              subtitle: 'Track client feedback, tips &...',
              onTap: () => widget.onNavigateTab?.call(3), // Performance
            ),

            // Optional: Recent Review if present
            if (_recentReview != null) ...[
              const SizedBox(height: 24),
              Text(
                'Recent Client Review',
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _recentReview!.residentName,
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        Row(
                          children: List.generate(5, (starIdx) {
                            final rating = _recentReview!.reviewRating ?? 5.0;
                            return Icon(
                              starIdx < rating.round()
                                  ? Icons.star_rounded
                                  : Icons.star_border_rounded,
                              color: const Color(0xFFF59E0B),
                              size: 16,
                            );
                          }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '"${_recentReview!.reviewComment}"',
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                        color: const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewMetricCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    String? prefix,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (prefix != null)
                      Text(
                        prefix,
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFFF59E0B),
                        ),
                      ),
                    Flexible(
                      child: Text(
                        value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.dmSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    String? badgeText,
    Color? badgeBg,
    Color? badgeTextColor,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      if (badgeText != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeBg ?? const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            badgeText,
                            style: GoogleFonts.dmSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: badgeTextColor ?? const Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                size: 15,
                color: Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
