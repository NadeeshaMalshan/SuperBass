import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class M3BottomNavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final bool hasBadge;
  final Color? badgeColor;

  const M3BottomNavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.hasBadge = false,
    this.badgeColor,
  });
}

class M3BottomNavigationBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;
  final List<M3BottomNavItem> items;

  const M3BottomNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
    required this.items,
  });

  // Uber Exact Floating Pill Palette
  static const Color navSurfaceColor = Color(0xFFFFFFFF); // Pure White Bar
  static const Color selectedPillColor = Color(0xFFF2F2F2); // Uber Light Grey Pill for active item
  static const Color selectedContentColor = Color(0xFF000000); // Uber Pitch Black icon & text
  static const Color unselectedIconColor = Color(0xFF333333); // Dark crisp grey icon
  static const Color unselectedTextColor = Color(0xFF5E5E5E); // Uber secondary grey text
  static const Color borderColor = Color(0xFFEEEEEE); // Ultra-light crisp hairline border
  static const Color defaultBadgeColor = Color(0xFF276EF1); // Uber Signature Blue dot

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final int safeIndex = selectedIndex.clamp(0, items.isEmpty ? 0 : items.length - 1);

    return Container(
      color: Colors.transparent,
      padding: EdgeInsets.fromLTRB(
        16,
        4,
        16,
        bottomInset > 0 ? bottomInset : 16,
      ),
      child: Container(
        height: 68,
        decoration: BoxDecoration(
          color: navSurfaceColor,
          borderRadius: BorderRadius.circular(34),
          border: Border.all(color: borderColor, width: 0.8),
          boxShadow: [
            // White radiant ambient shadow / glow
            BoxShadow(
              color: Colors.white.withValues(alpha: 0.95),
              blurRadius: 28,
              spreadRadius: 8,
              offset: const Offset(0, 0),
            ),
            BoxShadow(
              color: Colors.white.withValues(alpha: 0.7),
              blurRadius: 14,
              spreadRadius: 3,
              offset: const Offset(0, -2),
            ),
            // Subtle depth shadow
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.09),
              blurRadius: 22,
              offset: const Offset(0, 6),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            const double horizontalPadding = 6.0;
            const double verticalPadding = 6.0;
            final double availableWidth = constraints.maxWidth - (horizontalPadding * 2);
            final double itemWidth = items.isNotEmpty ? availableWidth / items.length : availableWidth;
            final double pillHeight = constraints.maxHeight - (verticalPadding * 2);

            return Stack(
              children: [
                // Sliding Active Pill Background Animation
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 260),
                  curve: Curves.fastOutSlowIn,
                  left: horizontalPadding + (safeIndex * itemWidth),
                  top: verticalPadding,
                  width: itemWidth,
                  height: pillHeight,
                  child: Container(
                    decoration: BoxDecoration(
                      color: selectedPillColor,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),

                // Interactive Tab Buttons
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: horizontalPadding,
                      vertical: verticalPadding,
                    ),
                    child: Row(
                      children: List.generate(items.length, (index) {
                        final item = items[index];
                        final bool isSelected = safeIndex == index;

                        return Expanded(
                          child: InkWell(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              onItemSelected(index);
                            },
                            splashColor: Colors.transparent,
                            highlightColor: Colors.transparent,
                            borderRadius: BorderRadius.circular(24),
                            child: SizedBox(
                              height: pillHeight,
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  // Icon with animated scale & micro-bounce
                                  AnimatedScale(
                                    scale: isSelected ? 1.08 : 0.95,
                                    duration: const Duration(milliseconds: 220),
                                    curve: Curves.easeOutBack,
                                    child: Stack(
                                      clipBehavior: Clip.none,
                                      children: [
                                        AnimatedSwitcher(
                                          duration: const Duration(milliseconds: 180),
                                          transitionBuilder: (child, anim) => FadeTransition(
                                            opacity: anim,
                                            child: child,
                                          ),
                                          child: Icon(
                                            isSelected ? item.selectedIcon : item.icon,
                                            key: ValueKey('${item.label}_$isSelected'),
                                            size: 23,
                                            color: isSelected
                                                ? selectedContentColor
                                                : unselectedIconColor,
                                          ),
                                        ),
                                        if (item.hasBadge)
                                          Positioned(
                                            top: -2,
                                            right: -4,
                                            child: Container(
                                              width: 8,
                                              height: 8,
                                              decoration: BoxDecoration(
                                                color: item.badgeColor ?? defaultBadgeColor,
                                                shape: BoxShape.circle,
                                                border: Border.all(
                                                  color: isSelected
                                                      ? selectedPillColor
                                                      : navSurfaceColor,
                                                  width: 1.5,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  // Animated text style transition
                                  AnimatedDefaultTextStyle(
                                    duration: const Duration(milliseconds: 200),
                                    curve: Curves.easeInOut,
                                    style: GoogleFonts.dmSans(
                                      fontSize: 11.5,
                                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                      color: isSelected
                                          ? selectedContentColor
                                          : unselectedTextColor,
                                      letterSpacing: isSelected ? -0.2 : 0,
                                    ),
                                    child: Text(
                                      item.label,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}


