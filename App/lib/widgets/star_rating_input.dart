import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';

class StarRatingInput extends StatelessWidget {
  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  const StarRatingInput({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: GoogleFonts.dmSans(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                '$value / 5',
                style: GoogleFonts.dmSans(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.starRating,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Select rating (1 to 5 stars)',
            style: GoogleFonts.dmSans(
              fontSize: 12,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(5, (index) {
              final star = index + 1;
              final isSelected = star <= value;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onChanged(star),
                  child: Container(
                    margin: EdgeInsets.only(right: star < 5 ? 8 : 0),
                    height: 48,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isSelected
                            ? Colors.transparent
                            : AppColors.outline,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.star_rounded,
                        color: isSelected
                            ? Colors.white
                            : AppColors.onSurfaceVariant,
                        size: 24,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
