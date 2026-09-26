import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

/// The signature SuperBass brand badge
class BrandBadge extends StatelessWidget {
  final double fontSize;
  const BrandBadge({super.key, this.fontSize = 18});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.brandYellow,
        borderRadius: BorderRadius.circular(10),
        boxShadow: const [
          BoxShadow(
            color: AppColors.brandYellowGlow,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.handyman_rounded, size: 18, color: AppColors.onPrimary),
          const SizedBox(width: 6),
          Text(
            'superබාස්',
            style: GoogleFonts.dmSans(
              color: AppColors.onPrimary,
              fontWeight: FontWeight.w800,
              fontSize: fontSize,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Primary Hero CTA button with yellow glow shadow matching design.md
class PrimaryCtaButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final bool isFullWidth;

  const PrimaryCtaButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.isFullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final button = Container(
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(9999),
        boxShadow: const [
          BoxShadow(
            color: AppColors.brandYellowGlow,
            blurRadius: 20,
            spreadRadius: 1,
            offset: Offset(0, 8),
          ),
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: AppColors.brandYellow,
        borderRadius: BorderRadius.circular(9999),
        child: InkWell(
          borderRadius: BorderRadius.circular(9999),
          onTap: onPressed,
          splashColor: AppColors.brandYellowHover.withValues(alpha: 0.3),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, color: const Color(0xFF111827), size: 20),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: GoogleFonts.dmSans(
                    color: const Color(0xFF111827),
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}

/// Secondary Outlined button matching design.md
class SecondaryOutlinedButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final bool isFullWidth;

  const SecondaryOutlinedButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.isFullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      width: isFullWidth ? double.infinity : null,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.outline, width: 1.5),
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 24),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20, color: AppColors.onSurface),
              const SizedBox(width: 8),
            ],
            Text(
              label,
              style: GoogleFonts.dmSans(
                color: AppColors.onSurface,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Modern Pill Search Bar
class ServiceSearchBar extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onFilterTap;

  const ServiceSearchBar({
    super.key,
    this.controller,
    this.onChanged,
    this.onFilterTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(9999),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      child: Row(
        children: [
          const Icon(Icons.search, color: AppColors.onSurfaceVariant, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: GoogleFonts.dmSans(
                color: AppColors.onSurface,
                fontSize: 15,
              ),
              decoration: const InputDecoration(
                hintText: 'Search for services or pros...',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 12),
                fillColor: Colors.transparent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Category Item matching modern circular design (Uber/Grab style)
class CategoryCard extends StatelessWidget {
  final String title;
  final IconData? icon;
  final String? imageAsset;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  const CategoryCard({
    super.key,
    required this.title,
    this.icon,
    this.imageAsset,
    this.count = 0,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isSelected ? const Color(0xFFFEF08A) : const Color(0xFFF3F4F6),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: AppColors.brandYellow.withValues(alpha: 0.28),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ]
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
            ),
            child: Center(
              child: imageAsset != null && imageAsset!.isNotEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(14.0),
                      child: Image.asset(
                        imageAsset!,
                        width: 38,
                        height: 38,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Icon(
                          icon ?? Icons.category_rounded,
                          color: isSelected ? const Color(0xFF18181B) : const Color(0xFF374151),
                          size: 28,
                        ),
                      ),
                    )
                  : Icon(
                      icon ?? Icons.category_rounded,
                      color: isSelected ? const Color(0xFF18181B) : const Color(0xFF374151),
                      size: 28,
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: GoogleFonts.dmSans(
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              fontSize: 13,
              color: isSelected ? AppColors.onSurface : const Color(0xFF374151),
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

/// Worker Profile Card matching frontend directory look
class WorkerCard extends StatelessWidget {
  final String name;
  final String trade;
  final double? rating;
  final int reviewCount;
  final String location;
  final String distance;
  final String? price;
  final String? profileImage;
  final VoidCallback? onBookTap;
  final VoidCallback? onProfileTap;
  final bool showBookNow;

  const WorkerCard({
    super.key,
    required this.name,
    required this.trade,
    this.rating,
    required this.reviewCount,
    required this.location,
    required this.distance,
    this.price,
    this.profileImage,
    this.onBookTap,
    this.onProfileTap,
    this.showBookNow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.surfaceVariant,
            ),
            child: ClipOval(
              child: (profileImage != null && profileImage!.isNotEmpty && profileImage != 'null')
                  ? Image.network(
                      profileImage!,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Center(
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : 'W',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w800,
                            fontSize: 20,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                    )
                  : Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'W',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w800,
                          fontSize: 20,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  trade,
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, size: 18, color: AppColors.starRating),
                    const SizedBox(width: 4),
                    Text(
                      (rating != null && rating! > 0) ? rating!.toStringAsFixed(1) : '0',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.onSurface,
                      ),
                    ),
                    if (reviewCount > 0) ...[
                      const SizedBox(width: 4),
                      Text(
                        '($reviewCount)',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const Spacer(),
                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.onSurfaceVariant),
                    const SizedBox(width: 2),
                    Text(
                      distance,
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                if (price != null && price!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    price!,
                    style: GoogleFonts.dmSans(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 38,
                        child: OutlinedButton(
                          onPressed: onProfileTap ?? () {},
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.outlineVariant),
                            shape: const StadiumBorder(),
                            padding: EdgeInsets.zero,
                          ),
                          child: Text(
                            'View Profile',
                            style: GoogleFonts.dmSans(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (showBookNow && onBookTap != null) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: SizedBox(
                          height: 38,
                          child: ElevatedButton(
                            onPressed: onBookTap,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brandYellow,
                              foregroundColor: AppColors.onPrimary,
                              elevation: 0,
                              shape: const StadiumBorder(),
                              padding: EdgeInsets.zero,
                            ),
                            child: Text(
                              'Book Now',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppColors.onPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
