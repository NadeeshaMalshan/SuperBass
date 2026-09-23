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
  Map<String, dynamic>? _performance;
  List<BookingModel> _pendingBookings = [];
  BookingModel? _recentReview;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final worker = widget.worker ?? await ApiService().fetchMyWorkerProfile(email);
      if (worker != null) {
        final perf = await ApiService().fetchWorkerPerformance(worker.id);
        final allBookings = await ApiService().fetchWorkerBookings(email);

        final pending = allBookings.where((b) => b.status.toLowerCase() == 'requested').toList();
        final reviewed = allBookings
            .where((b) => (b.status.toLowerCase() == 'reviewed' || b.reviewRating != null) && (b.reviewComment?.isNotEmpty ?? false))
            .toList();

        if (mounted) {
          setState(() {
            _performance = perf;
            _pendingBookings = pending;
            if (reviewed.isNotEmpty) {
              _recentReview = reviewed.first;
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: WorkerColors.primary),
      );
    }

    final worker = widget.worker;
    final workerName = worker?.name ?? AuthService().currentUser?.name ?? 'Worker';

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      color: WorkerColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), WorkerColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: WorkerColors.primaryGlow,
                    blurRadius: 18,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.20),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                'PRO WORKER',
                                style: GoogleFonts.dmSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (worker != null)
                              Text(
                                worker.primaryServiceArea ?? 'Colombo',
                                style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  color: Colors.white70,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Welcome back, $workerName!',
                          style: GoogleFonts.dmSans(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'You have ${_pendingBookings.length} pending job request${_pendingBookings.length == 1 ? '' : 's'}.',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white.withValues(alpha: 0.20),
                    child: const Icon(Icons.handyman_rounded, color: Colors.white, size: 30),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4 Metrics Grid
            Builder(
              builder: (context) {
                final rawOverall = _performance?['overallRating'] ?? _performance?['OverallRating'] ?? worker?.overallRating;
                final overallStr = rawOverall != null ? '★ ${(rawOverall as num).toStringAsFixed(1)}' : 'No rating';

                final rawCompletion = _performance?['completionRate'] ?? _performance?['CompletionRate'];
                final completionStr = (rawCompletion != null && rawCompletion.toString().isNotEmpty)
                    ? rawCompletion.toString()
                    : 'N/A';

                final rawCompletedJobs = _performance?['completedJobs'] ?? _performance?['CompletedJobs'] ?? worker?.completedJobs ?? 0;

                final rawAcceptance = _performance?['acceptanceRate'] ?? _performance?['AcceptanceRate'];
                final acceptanceStr = (rawAcceptance != null && rawAcceptance.toString().isNotEmpty)
                    ? rawAcceptance.toString()
                    : 'N/A';

                return GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.55,
                  children: [
                    _buildMetricCard(
                      icon: Icons.star_rounded,
                      iconBg: const Color(0xFFFEF3C7),
                      iconColor: WorkerColors.starRating,
                      value: overallStr,
                      label: 'Overall Rating',
                    ),
                    _buildMetricCard(
                      icon: Icons.check_circle_rounded,
                      iconBg: WorkerColors.primaryLight,
                      iconColor: WorkerColors.primary,
                      value: completionStr,
                      label: 'Completion Rate',
                    ),
                    _buildMetricCard(
                      icon: Icons.work_rounded,
                      iconBg: const Color(0xFFECFDF5),
                      iconColor: WorkerColors.success,
                      value: '$rawCompletedJobs',
                      label: 'Completed Jobs',
                    ),
                    _buildMetricCard(
                      icon: Icons.thumb_up_rounded,
                      iconBg: const Color(0xFFF3E8FF),
                      iconColor: const Color(0xFF9333EA),
                      value: acceptanceStr,
                      label: 'Acceptance Rate',
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),

            // Pending Booking Requests Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.notifications_active_rounded, color: WorkerColors.primary, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      'Pending Requests (${_pendingBookings.length})',
                      style: GoogleFonts.dmSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: WorkerColors.onSurface,
                      ),
                    ),
                  ],
                ),
                if (_pendingBookings.isNotEmpty)
                  InkWell(
                    onTap: () => widget.onNavigateTab?.call(1),
                    child: Text(
                      'View All',
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: WorkerColors.primary,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            if (_pendingBookings.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
                decoration: BoxDecoration(
                  color: WorkerColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WorkerColors.outlineVariant),
                ),
                child: Column(
                  children: [
                    Icon(Icons.inbox_rounded, size: 40, color: WorkerColors.outline),
                    const SizedBox(height: 10),
                    Text(
                      'No pending requests right now',
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: WorkerColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'New resident bookings will appear here instantly.',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        color: WorkerColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _pendingBookings.take(3).length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final req = _pendingBookings[index];
                  final dateStr = req.scheduledDate != null
                      ? '${req.scheduledDate!.day}/${req.scheduledDate!.month} at ${req.scheduledDate!.hour.toString().padLeft(2, '0')}:${req.scheduledDate!.minute.toString().padLeft(2, '0')}'
                      : 'Flexible';

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: WorkerColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: WorkerColors.outlineVariant),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                req.jobTitle,
                                style: GoogleFonts.dmSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: WorkerColors.onSurface,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: WorkerColors.warningLight,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: WorkerColors.warning.withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                req.urgency,
                                style: GoogleFonts.dmSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: WorkerColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.person_outline_rounded, size: 16, color: WorkerColors.onSurfaceVariant),
                            const SizedBox(width: 6),
                            Text(
                              req.residentName,
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: WorkerColors.onSurface,
                              ),
                            ),
                            const SizedBox(width: 14),
                            const Icon(Icons.calendar_today_rounded, size: 15, color: WorkerColors.onSurfaceVariant),
                            const SizedBox(width: 6),
                            Text(
                              dateStr,
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                color: WorkerColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 16, color: WorkerColors.onSurfaceVariant),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                req.locationAddress,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  color: WorkerColors.onSurfaceVariant,
                                ),
                              ),
                            ),
                            Text(
                              'Rs. ${req.estimatedPrice.round()}',
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: WorkerColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          height: 38,
                          child: ElevatedButton(
                            onPressed: () => widget.onNavigateTab?.call(1),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: WorkerColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            child: Text(
                              'View in My Jobs',
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 24),

            // Quick Actions Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: WorkerColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: WorkerColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.bolt_rounded, color: WorkerColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Quick Actions',
                        style: GoogleFonts.dmSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: WorkerColors.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildQuickActionTile(
                    icon: Icons.design_services_outlined,
                    label: 'Update Skills & Rates',
                    onTap: () => widget.onNavigateTab?.call(3),
                  ),
                  const Divider(height: 16, color: WorkerColors.outlineVariant),
                  _buildQuickActionTile(
                    icon: Icons.schedule_rounded,
                    label: 'Set Working Hours & Availability',
                    onTap: () => widget.onNavigateTab?.call(3),
                  ),
                  const Divider(height: 16, color: WorkerColors.outlineVariant),
                  _buildQuickActionTile(
                    icon: Icons.insights_rounded,
                    label: 'View Detailed Rating Analytics',
                    onTap: () => widget.onNavigateTab?.call(2),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Recent Resident Review
            if (_recentReview != null) ...[
              Text(
                'Recent Client Review',
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: WorkerColors.onSurface,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: WorkerColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WorkerColors.outlineVariant),
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
                            color: WorkerColors.onSurface,
                          ),
                        ),
                        Row(
                          children: List.generate(5, (starIdx) {
                            final rating = _recentReview!.reviewRating ?? 5.0;
                            return Icon(
                              starIdx < rating.round() ? Icons.star_rounded : Icons.star_border_rounded,
                              color: WorkerColors.starRating,
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
                        color: WorkerColors.onSurfaceVariant,
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

  Widget _buildMetricCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WorkerColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WorkerColors.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: GoogleFonts.dmSans(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: WorkerColors.onSurface,
                  ),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    color: WorkerColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(icon, color: WorkerColors.primary, size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: WorkerColors.onSurface,
                ),
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 13, color: WorkerColors.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
