import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../utils/url_launcher_helper.dart';
import '../../models/booking_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';
import '../../widgets/verified_badge.dart';
import '../../widgets/superbass_map.dart';
import '../chat_screen.dart';

class WorkerJobsScreen extends StatefulWidget {
  const WorkerJobsScreen({super.key});

  @override
  State<WorkerJobsScreen> createState() => _WorkerJobsScreenState();
}

class _WorkerJobsScreenState extends State<WorkerJobsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedTabIndex = 0;
  List<BookingModel> _bookings = [];
  bool _isLoading = true;
  String? _actionLoadingId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (mounted && _selectedTabIndex != _tabController.index) {
        setState(() => _selectedTabIndex = _tabController.index);
      }
    });
    _fetchBookings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchBookings() async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final list = await ApiService().fetchWorkerBookings(email);
      if (mounted) {
        setState(() {
          _bookings = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching worker bookings: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleAccept(int id) async {
    setState(() => _actionLoadingId = 'accept_$id');
    final updated = await ApiService().acceptBooking(id);
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Request Accepted! Moved to Active Jobs.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
        _tabController.animateTo(1); // Jump to Active tab
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to accept booking. Please try again.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _handleDecline(int id) async {
    final reasonController = TextEditingController(text: 'Worker schedule unavailable');
    final shouldDecline = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Decline Booking Request', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Optionally provide a reason for declining:', style: GoogleFonts.dmSans(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'e.g. Busy on this date / outside area',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: WorkerColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text('Decline', style: GoogleFonts.dmSans()),
          ),
        ],
      ),
    );

    if (shouldDecline != true) return;

    setState(() => _actionLoadingId = 'decline_$id');
    final updated = await ApiService().rejectBooking(id, reason: reasonController.text.trim());
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking request declined.', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.onSurface,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
      }
    }
  }

  Future<void> _handleStart(int id) async {
    setState(() => _actionLoadingId = 'start_$id');
    final updated = await ApiService().startBooking(id);
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🚀 Job marked as In Progress!', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
      }
    }
  }

  Future<void> _handleComplete(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Finish Job?', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Text(
          'Marking this job as completed will notify the resident to submit their review & rating.',
          style: GoogleFonts.dmSans(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: WorkerColors.success,
              foregroundColor: Colors.white,
            ),
            child: Text('Mark Completed', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _actionLoadingId = 'complete_$id');
    final updated = await ApiService().completeBooking(id);
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🎉 Job marked as Completed!', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
      }
    }
  }

  Future<void> _handleReschedule(BookingModel booking) async {
    DateTime selectedDate = booking.scheduledDate ?? DateTime.now().add(const Duration(days: 1));
    final noteController = TextEditingController();

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (pickedDate == null || !mounted) return;

    final newDateTime = DateTime.utc(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
    );

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Confirm Reschedule', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'New Date: ${newDateTime.day}/${newDateTime.month}/${newDateTime.year}',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, color: WorkerColors.primary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                hintText: 'Reason for reschedule (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: WorkerColors.primary,
              foregroundColor: Colors.white,
            ),
            child: Text('Confirm Reschedule', style: GoogleFonts.dmSans()),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _actionLoadingId = 'reschedule_${booking.id}');
    final updated = await ApiService().rescheduleBooking(
      booking.id,
      newScheduledDate: newDateTime,
      rescheduleNote: noteController.text.trim(),
    );
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Job rescheduled successfully!', style: GoogleFonts.dmSans()),
            backgroundColor: WorkerColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
      }
    }
  }

  void _openChatWithResident(BookingModel booking) async {
    final userEmail = AuthService().currentUser?.email;
    if (userEmail == null) return;

    int? convId = booking.conversationId;
    if (convId == null) {
      // Look up conversations to see if one already exists with resident
      final convs = await ApiService().fetchConversations(userEmail);
      for (final c in convs) {
        if (c['residentEmail'] == booking.residentEmail || c['otherUserEmail'] == booking.residentEmail) {
          convId = c['id'] is int ? c['id'] : int.tryParse(c['id']?.toString() ?? '');
          break;
        }
      }
    }

    if (convId != null && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            conversationId: convId!,
            name: booking.residentName,
            isVerified: booking.isResidentVerified,
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Direct conversation not initialized for this booking yet.', style: GoogleFonts.dmSans()),
          behavior: SnackBarBehavior.floating,
        ),
      );
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
      case 'declined':
      case 'rejected':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requests = _bookings.where((b) => b.status.toLowerCase() == 'requested').toList();
    final active = _bookings.where((b) {
      final s = b.status.toLowerCase();
      return s == 'confirmed' || s == 'inprogress';
    }).toList();
    final history = _bookings.where((b) {
      final s = b.status.toLowerCase();
      return s == 'completed' || s == 'reviewed' || s == 'cancelled' || s == 'rejected';
    }).toList();

    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // "My jobs" Title Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
            child: Text(
              'My jobs',
              style: GoogleFonts.dmSans(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Colors.black,
                letterSpacing: -0.6,
              ),
            ),
          ),

          // Horizontal Filter Pills Row
          _buildFilterPills(requests.length, active.length, history.length),
          const SizedBox(height: 14),

          // Tab Views
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.black))
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildJobsList(requests, 'No pending booking requests'),
                      _buildJobsList(active, 'No active ongoing jobs'),
                      _buildJobsList(history, 'No past job history'),
                      _buildJobsList(_bookings, 'No bookings found'),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPills(int requestsCount, int activeCount, int historyCount) {
    final tabs = [
      {'label': 'Requests', 'count': requestsCount},
      {'label': 'Active', 'count': activeCount},
      {'label': 'History', 'count': historyCount},
      {'label': 'All', 'count': _bookings.length},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: List.generate(tabs.length, (idx) {
          final isSelected = _selectedTabIndex == idx;
          final tab = tabs[idx];
          final count = tab['count'] as int;

          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: InkWell(
              onTap: () {
                setState(() => _selectedTabIndex = idx);
                _tabController.animateTo(idx);
              },
              borderRadius: BorderRadius.circular(24),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.black : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      tab['label'] as String,
                      style: GoogleFonts.dmSans(
                        fontSize: 13.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected ? Colors.white : const Color(0xFF1E293B),
                      ),
                    ),
                    if (count > 0 && idx == 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : Colors.black,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '$count',
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: isSelected ? Colors.black : Colors.white,
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
    );
  }

  Widget _buildJobsList(List<BookingModel> items, String emptyMessage) {
    if (items.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.assignment_outlined, size: 30, color: Colors.black),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  emptyMessage,
                  style: GoogleFonts.dmSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Pull down to refresh bookings list.',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchBookings,
      color: Colors.black,
      backgroundColor: Colors.white,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 100),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final b = items[index];
          return _buildBookingCard(b);
        },
      ),
    );
  }

  Widget _buildBookingCard(BookingModel b) {
    final status = b.status.toLowerCase();
    final isActionLoading = _actionLoadingId?.contains('${b.id}') ?? false;
    final scheduledDateStr = b.scheduledDate != null
        ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year}'
        : 'Flexible / ASAP';
    final urgencyText = '${b.urgency.isNotEmpty ? (b.urgency[0].toUpperCase() + b.urgency.substring(1).toLowerCase()) : "Medium"} urgency';
    final rateLabel = (b.pricingModel.isNotEmpty && b.pricingModel.toLowerCase().contains('hour'))
        ? 'Hourly rate'
        : (b.pricingModel.isNotEmpty ? b.pricingModel : 'Hourly rate');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showBookingDetails(b),
        borderRadius: BorderRadius.circular(24),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF4F6F8),
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Status Pill (left) & Urgency Pill (right)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: _getStatusDotColor(b.status),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      b.status.toUpperCase(),
                      style: GoogleFonts.dmSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  urgencyText,
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Job Title
          Text(
            b.jobTitle,
            style: GoogleFonts.dmSans(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.black,
              letterSpacing: -0.4,
            ),
          ),

          // Description
          if (b.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              b.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: const Color(0xFF64748B),
              ),
            ),
          ],

          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 14),

          // Client Info
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 18, color: Colors.black),
              const SizedBox(width: 10),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        b.residentName,
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (b.isResidentVerified) const VerifiedBadge(size: 14),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Scheduled Date
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 17, color: Color(0xFF475569)),
              const SizedBox(width: 10),
              Text(
                'Scheduled $scheduledDateStr',
                style: GoogleFonts.dmSans(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF475569),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Location Address
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF475569)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  b.locationAddress,
                  style: GoogleFonts.dmSans(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 14),

          // Rate & Price Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                rateLabel,
                style: GoogleFonts.dmSans(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF64748B),
                ),
              ),
              Text(
                'Rs. ${b.estimatedPrice.round()}',
                style: GoogleFonts.dmSans(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.black,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),

          // Review if reviewed
          if (b.reviewComment != null && b.reviewComment!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    '★ ${b.reviewRating?.toStringAsFixed(1) ?? "5.0"}: ',
                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 12),
                  ),
                  Expanded(
                    child: Text(
                      '"${b.reviewComment}"',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.dmSans(fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 18),

          // Dynamic Action Buttons based on status
          if (isActionLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: CircularProgressIndicator(color: Colors.black),
              ),
            )
          else ...[
            if (status == 'requested') ...[
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _handleAccept(b.id),
                      borderRadius: BorderRadius.circular(26),
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(26),
                        ),
                        child: Center(
                          child: Text(
                            'Accept request',
                            style: GoogleFonts.dmSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  InkWell(
                    onTap: () => _handleDecline(b.id),
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: Center(
                        child: Text(
                          'Decline',
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (status == 'confirmed') ...[
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _handleStart(b.id),
                      borderRadius: BorderRadius.circular(26),
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(26),
                        ),
                        child: Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20),
                              const SizedBox(width: 6),
                              Text(
                                'Start Job',
                                style: GoogleFonts.dmSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: () => _handleReschedule(b),
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: const Center(
                        child: Icon(Icons.calendar_month_outlined, size: 18, color: Colors.black),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: () => _openChatWithResident(b),
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: const Center(
                        child: Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.black),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (status == 'inprogress') ...[
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _handleComplete(b.id),
                      borderRadius: BorderRadius.circular(26),
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(26),
                        ),
                        child: Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
                              const SizedBox(width: 6),
                              Text(
                                'Finish Job',
                                style: GoogleFonts.dmSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: () => _openChatWithResident(b),
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: const Center(
                        child: Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.black),
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              // Completed / Cancelled: Chat with resident button
              InkWell(
                onTap: () => _openChatWithResident(b),
                borderRadius: BorderRadius.circular(26),
                child: Container(
                  height: 46,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.black),
                      const SizedBox(width: 8),
                      Text(
                        'Chat with Client',
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    ),
  ),
);
  }

  Map<String, double> _extractBookingCoordinates(BookingModel b) {
    if (b.locationAddress.isNotEmpty) {
      final gpsRegex = RegExp(r'\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]', caseSensitive: false);
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
        if (lat != null && lng != null && lat.abs() <= 90 && lng.abs() <= 180 && lat != 0 && lng != 0) {
          return {'lat': lat, 'lng': lng};
        }
      }
    }
    if (b.description.isNotEmpty) {
      final gmapRegex = RegExp(r'maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)', caseSensitive: false);
      final gmapMatch = gmapRegex.firstMatch(b.description);
      if (gmapMatch != null) {
        final lat = double.tryParse(gmapMatch.group(1) ?? '');
        final lng = double.tryParse(gmapMatch.group(2) ?? '');
        if (lat != null && lng != null) return {'lat': lat, 'lng': lng};
      }
      final gpsDescRegex = RegExp(r'\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]', caseSensitive: false);
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
    final scheduledDateStr = b.scheduledDate != null
        ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year}'
        : 'Flexible / ASAP';

    int currentStep = 1;
    final status = b.status.toLowerCase();
    if (status == 'accepted') currentStep = 2;
    if (status == 'confirmed') currentStep = 3;
    if (status == 'inprogress' || status == 'in progress') currentStep = 4;
    if (status == 'completed') currentStep = 5;

    final rateLabel = (b.pricingModel.isNotEmpty && b.pricingModel.toLowerCase().contains('hour'))
        ? 'Hourly rate'
        : (b.pricingModel.isNotEmpty ? b.pricingModel : 'Estimated Price');

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
            // Top Drag Handle & Header
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
                        Icons.assignment_outlined,
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
                                  horizontal: 14,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1F2937),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 7,
                                      height: 7,
                                      decoration: BoxDecoration(
                                        color: _getStatusDotColor(b.status),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      b.status.toUpperCase(),
                                      style: GoogleFonts.dmSans(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12.5,
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
                                  horizontal: 14,
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
                                      size: 15,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      b.urgency.isNotEmpty ? b.urgency.toUpperCase() : 'MEDIUM',
                                      style: GoogleFonts.dmSans(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12.5,
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

                    // Client Card with Chat button
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
                                  'CLIENT / RESIDENT',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        b.residentName,
                                        style: GoogleFonts.dmSans(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF111827),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (b.isResidentVerified) const VerifiedBadge(size: 14),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              Navigator.of(ctx).pop();
                              _openChatWithResident(b);
                            },
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.black,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.chat_bubble_outline_rounded, size: 14, color: Colors.white),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Message',
                                    style: GoogleFonts.dmSans(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Date & Location Card
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
                                      'DATE',
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

                    // Service Location & Map Preview Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
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
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: Colors.black,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.map_outlined,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Service Location & Map Preview',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                              color: const Color(0xFF111827),
                                            ),
                                          ),
                                          Text(
                                            b.locationAddress,
                                            style: GoogleFonts.dmSans(
                                              fontSize: 11.5,
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
                              InkWell(
                                onTap: () {
                                  final coords = _extractBookingCoordinates(b);
                                  final lat = coords['lat'];
                                  final lng = coords['lng'];
                                  final url =
                                      'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
                                  if (kIsWeb) {
                                    openUrl(url);
                                  }
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
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
                                        size: 13,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Google Maps',
                                        style: GoogleFonts.dmSans(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Builder(
                            builder: (context) {
                              final coords = _extractBookingCoordinates(b);
                              return SuperBassMap(
                                latitude: coords['lat']!,
                                longitude: coords['lng']!,
                                zoom: 15.0,
                                height: 200,
                                borderRadius: 14,
                                isInteractive: true,
                                markerTitle: b.locationAddress.isNotEmpty
                                    ? b.locationAddress
                                    : 'Service Location',
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Price Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                rateLabel.toUpperCase(),
                                style: GoogleFonts.dmSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Rs. ${b.estimatedPrice.round()}',
                                style: GoogleFonts.dmSans(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF111827),
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                          if (b.status.toLowerCase() == 'confirmed')
                            OutlinedButton.icon(
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                _handleReschedule(b);
                              },
                              icon: const Icon(Icons.edit_calendar_rounded, size: 16),
                              label: const Text('Reschedule'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.black,
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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

                    if (b.reviewComment != null && b.reviewComment!.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text(
                        'CLIENT REVIEW',
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
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.star_rounded, color: Colors.amber, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Rating: ${b.reviewRating?.toStringAsFixed(1) ?? "5.0"} / 5.0',
                                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '"${b.reviewComment}"',
                                    style: GoogleFonts.dmSans(fontSize: 13, fontStyle: FontStyle.italic),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Action buttons in modal
                    const SizedBox(height: 28),
                    if (status == 'requested') ...[
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                _handleAccept(b.id);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.black,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                              ),
                              child: Text(
                                'Accept Request',
                                style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _handleDecline(b.id);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFDC2626),
                              side: const BorderSide(color: Color(0xFFDC2626)),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                            ),
                            child: Text(
                              'Decline',
                              style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ] else if (status == 'confirmed') ...[
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            _handleStart(b.id);
                          },
                          icon: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20),
                          label: Text(
                            'Start Job',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                          ),
                        ),
                      ),
                    ] else if (status == 'inprogress' || status == 'in progress') ...[
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            _handleComplete(b.id);
                          },
                          icon: const Icon(Icons.done_all_rounded, color: Colors.white, size: 20),
                          label: Text(
                            'Mark Completed',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                          ),
                        ),
                      ),
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
}
