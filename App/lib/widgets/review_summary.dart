import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/booking_model.dart';
import '../theme/app_colors.dart';

class ReviewSummary extends StatelessWidget {
  final BookingModel booking;

  const ReviewSummary({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    if (booking.status.toLowerCase() != 'reviewed') {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB), // Light amber matching React #fffbeb
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.star_rounded,
                color: AppColors.starRating,
                size: 22,
              ),
              const SizedBox(width: 8),
              Text(
                '${booking.reviewRating?.toStringAsFixed(1) ?? '5.0'} / 5.0',
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFFB45309),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Verified Review',
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFD97706),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '(Quality: ${booking.qualityRating ?? 5}★, Punctuality: ${booking.punctualityRating ?? 5}★, Communication: ${booking.communicationRating ?? 5}★)',
            style: GoogleFonts.dmSans(
              fontSize: 12,
              color: const Color(0xFF92400E),
              fontWeight: FontWeight.w600,
            ),
          ),
          if (booking.reviewComment != null &&
              booking.reviewComment!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.format_quote_rounded,
                    color: Color(0xFFFCD34D),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '"${booking.reviewComment}"',
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        color: const Color(0xFF78350F),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
//new UI