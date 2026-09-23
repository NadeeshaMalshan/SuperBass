import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/booking_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';
import '../chat_screen.dart';

class WorkerJobsScreen extends StatefulWidget {
  const WorkerJobsScreen({super.key});

  @override
  State<WorkerJobsScreen> createState() => _WorkerJobsScreenState();
}

class _WorkerJobsScreenState extends State<WorkerJobsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<BookingModel> _bookings = [];
  bool _isLoading = true;
  String? _actionLoadingId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
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
    TimeOfDay selectedTime = TimeOfDay.fromDateTime(selectedDate);
    final noteController = TextEditingController();

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: selectedTime,
    );
    if (pickedTime == null || !mounted) return;

    final newDateTime = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
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
              'New Date: ${newDateTime.day}/${newDateTime.month}/${newDateTime.year} at ${pickedTime.format(ctx)}',
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

    return Column(
      children: [
        // Tab Header matching SuperBass clean styling
        Container(
          color: WorkerColors.surface,
          child: TabBar(
            controller: _tabController,
            isScrollable: false,
            indicatorColor: WorkerColors.primary,
            indicatorWeight: 3,
            labelColor: WorkerColors.primary,
            unselectedLabelColor: WorkerColors.onSurfaceVariant,
            labelStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
            unselectedLabelStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w500, fontSize: 13),
            tabs: [
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Requests'),
                    if (requests.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      _buildCountBadge(requests.length, WorkerColors.warning),
                    ],
                  ],
                ),
              ),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Active'),
                    if (active.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      _buildCountBadge(active.length, WorkerColors.primary),
                    ],
                  ],
                ),
              ),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('History'),
                    if (history.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      _buildCountBadge(history.length, WorkerColors.outline),
                    ],
                  ],
                ),
              ),
              const Tab(text: 'All'),
            ],
          ),
        ),

        // Tab Views
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: WorkerColors.primary))
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
    );
  }

  Widget _buildCountBadge(int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: GoogleFonts.dmSans(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: color,
        ),
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
                Icon(Icons.assignment_outlined, size: 56, color: WorkerColors.outline),
                const SizedBox(height: 14),
                Text(
                  emptyMessage,
                  style: GoogleFonts.dmSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: WorkerColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Pull down to refresh bookings list.',
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    color: WorkerColors.onSurfaceVariant,
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
      color: WorkerColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 14),
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
        ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year} at ${b.scheduledDate!.hour.toString().padLeft(2, '0')}:${b.scheduledDate!.minute.toString().padLeft(2, '0')}'
        : 'Flexible / ASAP';

    Color statusColor;
    Color statusBg;
    switch (status) {
      case 'requested':
        statusColor = WorkerColors.warning;
        statusBg = WorkerColors.warningLight;
        break;
      case 'confirmed':
        statusColor = WorkerColors.primary;
        statusBg = WorkerColors.primaryLight;
        break;
      case 'inprogress':
        statusColor = const Color(0xFF6366F1);
        statusBg = const Color(0xFFEEF2FF);
        break;
      case 'completed':
      case 'reviewed':
        statusColor = WorkerColors.success;
        statusBg = WorkerColors.onlineLight;
        break;
      case 'rejected':
      case 'cancelled':
      default:
        statusColor = WorkerColors.error;
        statusBg = WorkerColors.errorLight;
        break;
    }

    return Container(
      decoration: BoxDecoration(
        color: WorkerColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WorkerColors.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Status & Urgency
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  b.status.toUpperCase(),
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: statusColor,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: WorkerColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${b.urgency} Urgency',
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: WorkerColors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            b.jobTitle,
            style: GoogleFonts.dmSans(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: WorkerColors.onSurface,
            ),
          ),

          if (b.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              b.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(
                fontSize: 13,
                color: WorkerColors.onSurfaceVariant,
              ),
            ),
          ],

          const SizedBox(height: 14),
          const Divider(height: 1, color: WorkerColors.outlineVariant),
          const SizedBox(height: 12),

          // Resident & Details Info
          Row(
            children: [
              const Icon(Icons.person_rounded, size: 16, color: WorkerColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Client: ${b.residentName}',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: WorkerColors.onSurface,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          Row(
            children: [
              const Icon(Icons.calendar_month_rounded, size: 16, color: WorkerColors.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(
                'Scheduled: $scheduledDateStr',
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  color: WorkerColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: WorkerColors.onSurfaceVariant),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  b.locationAddress,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    color: WorkerColors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Rate: ${b.pricingModel}',
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: WorkerColors.onSurfaceVariant,
                ),
              ),
              Text(
                'Rs. ${b.estimatedPrice.round()}',
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: WorkerColors.primary,
                ),
              ),
            ],
          ),

          // Rating comment if reviewed
          if (b.reviewComment != null && b.reviewComment!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: WorkerColors.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.star_rounded, color: WorkerColors.starRating, size: 18),
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

          const SizedBox(height: 16),

          // Dynamic Action Buttons based on status
          if (isActionLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: CircularProgressIndicator(color: WorkerColors.primary),
              ),
            )
          else ...[
            if (status == 'requested') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _handleAccept(b.id),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                      child: Text(
                        'Accept Request',
                        style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: () => _handleDecline(b.id),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkerColors.error,
                      side: const BorderSide(color: WorkerColors.error),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    child: Text(
                      'Decline',
                      style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ] else if (status == 'confirmed') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _handleStart(b.id),
                      icon: const Icon(Icons.play_arrow_rounded, size: 18),
                      label: Text(
                        'Start Job',
                        style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => _openChatWithResident(b),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                    label: const Text('Chat'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkerColors.primary,
                      side: const BorderSide(color: WorkerColors.primary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _handleReschedule(b),
                    icon: const Icon(Icons.edit_calendar_rounded, color: WorkerColors.onSurfaceVariant),
                    tooltip: 'Reschedule',
                  ),
                ],
              ),
            ] else if (status == 'inprogress') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _handleComplete(b.id),
                      icon: const Icon(Icons.done_all_rounded, size: 18),
                      label: Text(
                        'Mark Completed',
                        style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton.icon(
                    onPressed: () => _openChatWithResident(b),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                    label: const Text('Chat'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkerColors.primary,
                      side: const BorderSide(color: WorkerColors.primary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ),
            ] else ...[
              // Completed / Reviewed / Cancelled
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _openChatWithResident(b),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                    label: const Text('Chat History'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkerColors.onSurfaceVariant,
                      side: const BorderSide(color: WorkerColors.outline),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}
