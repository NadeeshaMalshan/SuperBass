import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
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

  Future<void> _handleCancel(int id) async {
    final reasonController = TextEditingController(text: 'Worker schedule unavailable');
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Cancel Booking', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Optionally provide a reason for cancelling:', style: GoogleFonts.dmSans(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'e.g. Busy on this date / emergency',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Keep Booking', style: GoogleFonts.dmSans(color: WorkerColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: WorkerColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text('Cancel Booking', style: GoogleFonts.dmSans()),
          ),
        ],
      ),
    );

    if (shouldCancel != true) return;

    setState(() => _actionLoadingId = 'cancel_$id');
    final success = await ApiService().cancelBooking(id, reason: reasonController.text.trim());
    if (mounted) {
      setState(() => _actionLoadingId = null);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking cancelled.', style: GoogleFonts.dmSans()),
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

  void _showBookingOptions(BookingModel b) {
    final scheduledDateStr = b.scheduledDate != null
        ? '${b.scheduledDate!.month}/${b.scheduledDate!.day}/${b.scheduledDate!.year}, ${b.scheduledDate!.hour > 12 ? b.scheduledDate!.hour - 12 : (b.scheduledDate!.hour == 0 ? 12 : b.scheduledDate!.hour)}:${b.scheduledDate!.minute.toString().padLeft(2, '0')}:00 ${b.scheduledDate!.hour >= 12 ? "PM" : "AM"}'
        : 'Flexible / ASAP';
        
    int currentStep = 1;
    final status = b.status.toLowerCase();
    if (status == 'accepted') currentStep = 2;
    if (status == 'confirmed') currentStep = 3;
    if (status == 'inprogress') currentStep = 4;
    if (status == 'completed') currentStep = 5;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.9,
        padding: const EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 24),
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
                      child: const Icon(Icons.assignment, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Booking Details',
                          style: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w800, color: const Color(0xFF111827)),
                        ),
                        Text(
                          'Reference ID: #${b.id}',
                          style: GoogleFonts.dmSans(fontSize: 13, color: const Color(0xFF64748B)),
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
                    Text('JOB TITLE', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    Text(b.jobTitle, style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF111827))),
                    const SizedBox(height: 16),
                    
                    // Status & Priority
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('STATUS', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(color: const Color(0xFF1F2937), borderRadius: BorderRadius.circular(20)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.thumb_up_alt_outlined, color: Colors.white, size: 16),
                                    const SizedBox(width: 6),
                                    Text(b.status, style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
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
                              Text('PRIORITY', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(20)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.flag_outlined, color: Colors.white, size: 16),
                                    const SizedBox(width: 6),
                                    Text(b.urgency.toUpperCase(), style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
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
                              const Icon(Icons.calendar_today_outlined, size: 18, color: Color(0xFF111827)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('DATE & TIME', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
                                    const SizedBox(height: 4),
                                    Text(scheduledDateStr, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF111827))),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF111827)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('LOCATION', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
                                    const SizedBox(height: 4),
                                    Text(b.locationAddress, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF111827))),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Resident & Price Card
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
                                Text('CLIENT', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Text(b.residentName, style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF111827))),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('ESTIMATED EARNINGS', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Text(b.estimatedPrice > 0 ? 'Rs. ${b.estimatedPrice.toStringAsFixed(0)}' : 'Negotiable', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF111827))),
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
                          Text('SERVICE LIFECYCLE STATUS', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF64748B), letterSpacing: 0.5)),
                          const SizedBox(height: 20),
                          _buildLifecycleStep('1', 'Booking Requested', 'Request submitted by resident', currentStep >= 1, isCompleted: currentStep > 1),
                          const SizedBox(height: 16),
                          _buildLifecycleStep('2', 'Worker Accepts / Rejects', 'Worker accepted the booking', currentStep >= 2, isCompleted: currentStep > 2),
                          const SizedBox(height: 16),
                          _buildLifecycleStep('3', 'Confirmed', 'Schedule locked in', currentStep >= 3, isCompleted: currentStep > 3),
                          const SizedBox(height: 16),
                          _buildLifecycleStep('4', 'In Progress', '', currentStep >= 4, isCompleted: currentStep > 4),
                          const SizedBox(height: 16),
                          _buildLifecycleStep('5', 'Completed', '', currentStep >= 5, isCompleted: currentStep > 5),
                        ],
                      ),
                    ),
                    
                    if (b.description.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text('NOTES / DESCRIPTION', style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
                      const SizedBox(height: 6),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                        ),
                        child: Text(b.description, style: GoogleFonts.dmSans(fontSize: 14, color: const Color(0xFF334155))),
                      ),
                    ],
                    
                    // Map Preview Card
                    const SizedBox(height: 24),
                    GestureDetector(
                      onTap: () async {
                        final url = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(b.locationAddress)}');
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
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.map_outlined, color: Colors.white, size: 20),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('Service Location & Map Preview', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF111827))),
                                            Text(b.locationAddress, style: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF71717A)), overflow: TextOverflow.ellipsis),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.black,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.open_in_new, color: Colors.white, size: 16),
                                      const SizedBox(width: 6),
                                      Text('View on Google Maps', style: GoogleFonts.dmSans(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
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
                                    const Icon(Icons.location_on, color: Color(0xFFE11D48), size: 48),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(4),
                                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                                      ),
                                      child: Text(
                                        'Service Location',
                                        style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFE11D48)),
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
                    
                    // Action Buttons (Chat, Reschedule, Decline)
                    const SizedBox(height: 32),
                    
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _openChatWithResident(b);
                        },
                        icon: const Icon(Icons.chat_bubble_rounded, color: Colors.white),
                        label: Text(
                          'Chat with Resident',
                          style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white),
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: WorkerColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    if (status == 'requested' || status == 'confirmed') ...[
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            if (status == 'requested') {
                              _handleDecline(b.id);
                            } else {
                              _handleCancel(b.id);
                            }
                          },
                          icon: const Icon(Icons.cancel_outlined, color: WorkerColors.error),
                          label: Text(
                            status == 'requested' ? 'Decline Request' : 'Cancel Booking',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15, color: WorkerColors.error),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: WorkerColors.error),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
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

  Widget _buildLifecycleStep(String number, String title, String subtitle, bool isActive, {bool isCompleted = false}) {
    final color = isActive ? Colors.black : const Color(0xFFCBD5E1);
    final textColor = isActive ? Colors.black : const Color(0xFF94A3B8);
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          margin: const EdgeInsets.only(top: 2),
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 14)
                : Text(number, style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: textColor)),
              if (subtitle.isNotEmpty && isActive)
                Text(subtitle, style: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF64748B))),
            ],
          ),
        ),
      ],
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
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
            Row(
              children: [
                if (status == 'requested')
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
                      child: Text('Accept Request', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  )
                else if (status == 'confirmed')
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _handleStart(b.id),
                      icon: const Icon(Icons.play_arrow_rounded, size: 18),
                      label: Text('Start Job', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                    ),
                  )
                else if (status == 'inprogress')
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _handleComplete(b.id),
                      icon: const Icon(Icons.done_all_rounded, size: 18),
                      label: Text('Mark Completed', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WorkerColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                    ),
                  ),

                if (status == 'requested' || status == 'confirmed' || status == 'inprogress')
                  const SizedBox(width: 8),

                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showBookingOptions(b),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkerColors.primary,
                      side: const BorderSide(color: WorkerColors.outline),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text('View Booking', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
