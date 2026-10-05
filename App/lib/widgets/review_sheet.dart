import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import 'star_rating_input.dart';

class ReviewSheet extends StatefulWidget {
  final BookingModel booking;
  final VoidCallback onReviewSubmitted;

  const ReviewSheet({
    super.key,
    required this.booking,
    required this.onReviewSubmitted,
  });

  @override
  State<ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<ReviewSheet> {
  int quality = 5;
  int punctuality = 5;
  int communication = 5;
  final TextEditingController commentController = TextEditingController();
  bool isSubmitting = false;

  final List<String> suggestedChips = [
    'Punctual, professional, and resolved the issue quickly!',
    'Great workmanship and left the work area clean.',
    'Polite communication and fair pricing. Highly recommended!',
    'Arrived on time with all necessary tools. Very satisfied.',
  ];

  @override
  void dispose() {
    commentController.dispose();
    super.dispose();
  }

  void _handleChipClick(String chipText) {
    setState(() {
      final currentText = commentController.text;
      if (currentText.isEmpty) {
        commentController.text = chipText;
      } else if (!currentText.contains(chipText)) {
        commentController.text = '${currentText.trim()} $chipText';
      }
    });
  }

  Future<void> _submitReview() async {
    setState(() => isSubmitting = true);
    try {
      final updated = await ApiService().submitReview(
        widget.booking.id,
        qualityRating: quality,
        punctualityRating: punctuality,
        communicationRating: communication,
        reviewComment: commentController.text.trim(),
      );

      if (mounted) {
        if (updated != null) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                '🎉 Thank you! Your review and rating have been submitted successfully.',
              ),
              backgroundColor: Colors.black,
            ),
          );
          widget.onReviewSubmitted();
        } else {
          setState(() => isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to submit review. Please try again.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.star_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Review ${widget.booking.workerName}',
                        style: GoogleFonts.dmSans(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      Text(
                        'Rate your experience for ${widget.booking.jobTitle}',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            StarRatingInput(
              label: 'Quality & Craftsmanship',
              value: quality,
              onChanged: (v) => setState(() => quality = v),
            ),
            const SizedBox(height: 16),

            StarRatingInput(
              label: 'Punctuality',
              value: punctuality,
              onChanged: (v) => setState(() => punctuality = v),
            ),
            const SizedBox(height: 16),

            StarRatingInput(
              label: 'Communication',
              value: communication,
              onChanged: (v) => setState(() => communication = v),
            ),
            const SizedBox(height: 24),

            Text(
              'COMMENT / FEEDBACK (OPTIONAL)',
              style: GoogleFonts.dmSans(
                fontWeight: FontWeight.w700,
                fontSize: 11,
                letterSpacing: 0.5,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: suggestedChips.map((chip) {
                return ActionChip(
                  label: Text('+ $chip'),
                  labelStyle: GoogleFonts.dmSans(
                    fontSize: 12,
                    color: AppColors.onSurface,
                  ),
                  backgroundColor: AppColors.surfaceVariant,
                  side: BorderSide(color: AppColors.outline),
                  onPressed: () => _handleChipClick(chip),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: commentController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText:
                    'Share details about the work done, punctuality, and overall experience...',
                hintStyle: GoogleFonts.dmSans(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 14,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.outline),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.black, width: 1.5),
                ),
                contentPadding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 32),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isSubmitting
                        ? null
                        : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.black,
                      side: const BorderSide(color: Colors.black),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(26),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: isSubmitting ? null : _submitReview,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(26),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'Submit Review',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

void showReviewSheet(
  BuildContext context,
  BookingModel booking,
  VoidCallback onReviewSubmitted,
) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) =>
        ReviewSheet(booking: booking, onReviewSubmitted: onReviewSubmitted),
  );
}
//with new UI