import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/booking_model.dart';
import '../../models/worker_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/worker_colors.dart';

class WorkerPerformanceScreen extends StatefulWidget {
  final WorkerModel? worker;

  const WorkerPerformanceScreen({super.key, this.worker});

  @override
  State<WorkerPerformanceScreen> createState() => _WorkerPerformanceScreenState();
}

class _WorkerPerformanceScreenState extends State<WorkerPerformanceScreen> {
  Map<String, dynamic>? _performance;
  List<BookingModel> _reviewedBookings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPerformance();
  }

  Future<void> _fetchPerformance() async {
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
        final reviewed = allBookings
            .where((b) => b.status.toLowerCase() == 'reviewed' || b.reviewRating != null)
            .toList();

        if (mounted) {
          setState(() {
            _performance = perf;
            _reviewedBookings = reviewed;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('Error fetching worker performance: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: WorkerColors.primary));
    }

    final rawOverall = _performance?['overallRating'] ?? _performance?['OverallRating'] ?? widget.worker?.overallRating;
    final overallRatingStr = rawOverall != null ? '★ ${(rawOverall as num).toStringAsFixed(1)}' : 'No rating';

    final rawQuality = (_performance?['qualityRating'] ?? _performance?['QualityRating'] ?? widget.worker?.qualityRating) as num?;
    final rawPunctuality = (_performance?['punctualityRating'] ?? _performance?['PunctualityRating'] ?? widget.worker?.punctualityRating) as num?;
    final rawCommunication = (_performance?['communicationRating'] ?? _performance?['CommunicationRating'] ?? widget.worker?.communicationRating) as num?;

    final rawCompletion = _performance?['completionRate'] ?? _performance?['CompletionRate'];
    final completionRate = (rawCompletion != null && rawCompletion.toString().isNotEmpty) ? rawCompletion.toString() : 'N/A';

    final rawAcceptance = _performance?['acceptanceRate'] ?? _performance?['AcceptanceRate'];
    final acceptanceRate = (rawAcceptance != null && rawAcceptance.toString().isNotEmpty) ? rawAcceptance.toString() : 'N/A';

    final rawCancellation = _performance?['cancellationRate'] ?? _performance?['CancellationRate'];
    final cancellationRate = (rawCancellation != null && rawCancellation.toString().isNotEmpty) ? rawCancellation.toString() : 'N/A';

    return RefreshIndicator(
      onRefresh: _fetchPerformance,
      color: WorkerColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page Header
            Text(
              'Performance & Reviews',
              style: GoogleFonts.dmSans(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: WorkerColors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Track your ratings, punctuality, completion rates, and client reviews.',
              style: GoogleFonts.dmSans(
                fontSize: 13,
                color: WorkerColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),

            // Top Metrics Grid
            GridView.count(
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
                  value: overallRatingStr,
                  label: 'Overall Rating',
                ),
                _buildMetricCard(
                  icon: Icons.task_alt_rounded,
                  iconBg: WorkerColors.primaryLight,
                  iconColor: WorkerColors.primary,
                  value: completionRate,
                  label: 'Completion Rate',
                ),
                _buildMetricCard(
                  icon: Icons.handshake_rounded,
                  iconBg: const Color(0xFFECFDF5),
                  iconColor: WorkerColors.success,
                  value: acceptanceRate,
                  label: 'Acceptance Rate',
                ),
                _buildMetricCard(
                  icon: Icons.cancel_outlined,
                  iconBg: WorkerColors.errorLight,
                  iconColor: WorkerColors.error,
                  value: cancellationRate,
                  label: 'Cancellation Rate',
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Detailed Rating Breakdown
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: WorkerColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: WorkerColors.outlineVariant),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rating Breakdown by Category',
                    style: GoogleFonts.dmSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: WorkerColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 18),
                  _buildRatingBar(
                    label: 'Work Quality & Craftsmanship',
                    rating: rawQuality,
                  ),
                  const SizedBox(height: 16),
                  _buildRatingBar(
                    label: 'Punctuality & Arrival Time',
                    rating: rawPunctuality,
                  ),
                  const SizedBox(height: 16),
                  _buildRatingBar(
                    label: 'Communication & Professionalism',
                    rating: rawCommunication,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Reviews List Section
            Text(
              'Resident Reviews (${_reviewedBookings.length})',
              style: GoogleFonts.dmSans(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: WorkerColors.onSurface,
              ),
            ),
            const SizedBox(height: 12),

            if (_reviewedBookings.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: WorkerColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WorkerColors.outlineVariant),
                ),
                child: Column(
                  children: [
                    Icon(Icons.rate_review_outlined, size: 48, color: WorkerColors.outline),
                    const SizedBox(height: 12),
                    Text(
                      'No reviews received yet',
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: WorkerColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'When residents complete and rate your jobs, their comments appear here.',
                      textAlign: TextAlign.center,
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
                itemCount: _reviewedBookings.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final b = _reviewedBookings[index];
                  final reviewDateStr = b.reviewedAt != null
                      ? '${b.reviewedAt!.day}/${b.reviewedAt!.month}/${b.reviewedAt!.year}'
                      : (b.scheduledDate != null
                          ? '${b.scheduledDate!.day}/${b.scheduledDate!.month}/${b.scheduledDate!.year}'
                          : 'Recently');

                  return Container(
                    padding: const EdgeInsets.all(16),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              b.residentName,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: WorkerColors.onSurface,
                              ),
                            ),
                            Text(
                              reviewDateStr,
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
                            Row(
                              children: List.generate(5, (starIdx) {
                                final r = b.reviewRating ?? 5.0;
                                return Icon(
                                  starIdx < r.round() ? Icons.star_rounded : Icons.star_border_rounded,
                                  color: WorkerColors.starRating,
                                  size: 16,
                                );
                              }),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '★ ${(b.reviewRating ?? 5.0).toStringAsFixed(1)}',
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: WorkerColors.onSurface,
                              ),
                            ),
                          ],
                        ),
                        if (b.reviewComment != null && b.reviewComment!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            '"${b.reviewComment}"',
                            style: GoogleFonts.dmSans(
                              fontSize: 13,
                              fontStyle: FontStyle.italic,
                              color: WorkerColors.onSurface,
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: WorkerColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Job: ${b.jobTitle}',
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              color: WorkerColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
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

  Widget _buildRatingBar({
    required String label,
    required num? rating,
  }) {
    final hasRating = rating != null && rating > 0;
    final percent = hasRating ? (rating.toDouble() / 5.0).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
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
            Text(
              hasRating ? '★ ${(rating.toDouble()).toStringAsFixed(1)} / 5.0' : 'N/A',
              style: GoogleFonts.dmSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: hasRating ? WorkerColors.starRating : WorkerColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: percent,
            minHeight: 8,
            backgroundColor: WorkerColors.surfaceVariant,
            valueColor: const AlwaysStoppedAnimation<Color>(WorkerColors.primary),
          ),
        ),
      ],
    );
  }
}
