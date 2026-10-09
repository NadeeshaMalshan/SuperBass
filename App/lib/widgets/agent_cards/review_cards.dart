import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ==========================================
// 1. REVIEW FORM CARD
// ==========================================
class ReviewFormCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const ReviewFormCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  State<ReviewFormCard> createState() => _ReviewFormCardState();
}

class _ReviewFormCardState extends State<ReviewFormCard> {
  int _quality = 5;
  int _punctuality = 5;
  int _communication = 5;
  final TextEditingController _commentCtrl = TextEditingController();
  bool _isSubmitted = false;

  final List<String> _suggestedChips = [
    'Punctual & professional',
    'Great workmanship, resolved quickly',
    'Polite communication and fair pricing',
    'Arrived on time with all tools',
  ];

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  void _onChipTap(String chip) {
    if (_commentCtrl.text.isEmpty) {
      _commentCtrl.text = chip;
    } else if (!_commentCtrl.text.contains(chip)) {
      _commentCtrl.text = '${_commentCtrl.text.trim()} $chip';
    }
  }

  void _submitReview() {
    final bookingId = (widget.data['bookingId'] ?? widget.data['id'] ?? '1').toString();
    final workerId = (widget.data['workerId'] ?? '1').toString();
    final workerName = widget.data['workerName']?.toString() ?? 'Technician';
    final overallRating = ((_quality + _punctuality + _communication) / 3).toStringAsFixed(1);
    final comment = _commentCtrl.text.trim().isNotEmpty
        ? _commentCtrl.text.trim()
        : 'Excellent service provided on time with great quality.';

    setState(() => _isSubmitted = true);

    final prompt =
        'Submit review for booking #$bookingId: worker #$workerId ($workerName). Rating $overallRating stars. Quality: $_quality, Punctuality: $_punctuality, Communication: $_communication. Feedback: "$comment"';

    widget.onAction?.call('send_prompt', prompt);
  }

  Widget _buildStarRow(String label, int value, ValueChanged<int> onChanged) {
    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: GoogleFonts.dmSans(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF475569),
            ),
          ),
        ),
        Row(
          children: List.generate(5, (index) {
            final star = index + 1;
            return GestureDetector(
              onTap: () => onChanged(star),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Icon(
                  star <= value ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: 22,
                  color: star <= value ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                ),
              ),
            );
          }),
        ),
        const Spacer(),
        Text(
          '$value/5',
          style: GoogleFonts.dmSans(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  String? _resolveImageUrl(dynamic rawUrl) {
    if (rawUrl == null) return null;
    final url = rawUrl.toString().trim();
    if (url.isEmpty || url == 'null' || url == 'default') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const base = 'http://localhost:5237';
    if (url.startsWith('/')) {
      return '$base$url';
    }
    return '$base/$url';
  }

  @override
  Widget build(BuildContext context) {
    final workerName = widget.data['workerName']?.toString() ?? 'Technician';
    final jobTitle = widget.data['jobTitle']?.toString() ?? 'Completed Service';
    final double overall = (_quality + _punctuality + _communication) / 3;
    final rawAvatar = widget.data['workerAvatar'] ??
        widget.data['workerProfileImage'] ??
        widget.data['profileImage'] ??
        widget.data['avatarUrl'];
    final workerAvatar = _resolveImageUrl(rawAvatar);

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F3F5),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Top Row: Black circular avatar + Title & Subtitle
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: workerAvatar != null && workerAvatar.isNotEmpty
                      ? Image.network(
                          workerAvatar,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Center(
                            child: Text(
                              workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                              style: GoogleFonts.dmSans(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 19,
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 19,
                            ),
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
                      'Rate & Review $workerName',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$jobTitle  •  ★ ${overall.toStringAsFixed(1)}',
                      style: GoogleFonts.dmSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          if (_isSubmitted) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Icon(Icons.check_circle_rounded, size: 36, color: Color(0xFF16A34A)),
                  const SizedBox(height: 8),
                  Text(
                    'Review Submitted!',
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF15803D),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thank you for helping verify quality in the community.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.dmSans(fontSize: 12.5, color: const Color(0xFF475569)),
                  ),
                ],
              ),
            ),
          ] else ...[
            // 2. Middle Container: Pure white rounded box with rating form
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStarRow('Quality', _quality, (v) => setState(() => _quality = v)),
                  const SizedBox(height: 8),
                  _buildStarRow('Punctuality', _punctuality, (v) => setState(() => _punctuality = v)),
                  const SizedBox(height: 8),
                  _buildStarRow('Communication', _communication, (v) => setState(() => _communication = v)),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 8),
                  Text(
                    'QUICK FEEDBACK',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _suggestedChips.map((c) {
                      return InkWell(
                        onTap: () => _onChipTap(c),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            c,
                            style: GoogleFonts.dmSans(fontSize: 11, color: const Color(0xFF334155)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _commentCtrl,
                    maxLines: 2,
                    style: GoogleFonts.dmSans(fontSize: 12.5),
                    decoration: InputDecoration(
                      hintText: 'Share more about your experience...',
                      hintStyle: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Bottom Row: Solid Black Pill + White Pill
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: InkWell(
                    onTap: _submitReview,
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: Center(
                        child: Text(
                          'Submit Review',
                          style: GoogleFonts.dmSans(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: InkWell(
                    onTap: () {
                      widget.onAction?.call('cancel', {});
                    },
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Center(
                        child: Text(
                          'Cancel',
                          style: GoogleFonts.dmSans(
                            color: const Color(0xFF0F172A),
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
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

// ==========================================
// 2. REVIEW SUBMITTED CONFIRMATION CARD
// ==========================================
class ReviewSubmittedCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const ReviewSubmittedCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final workerName = data['workerName']?.toString() ?? 'Technician';
    final rating = data['rating']?.toString() ?? data['overallRating']?.toString() ?? '5.0';
    final comment = data['comment']?.toString() ?? 'Thank you for your rating!';

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F3F5),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 26),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Review Submitted!',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$workerName  •  ★ $rating Stars',
                      style: GoogleFonts.dmSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '"$comment"',
              style: GoogleFonts.dmSans(
                fontSize: 13,
                fontStyle: FontStyle.italic,
                color: const Color(0xFF475569),
                height: 1.35,
              ),
            ),
          ),

          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    onAction?.call('dismiss', {});
                  },
                  borderRadius: BorderRadius.circular(26),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Center(
                      child: Text(
                        'Done',
                        style: GoogleFonts.dmSans(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
