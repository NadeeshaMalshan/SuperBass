import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

class M3BottomNavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;

  const M3BottomNavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
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

  // Light UI Floating Pill Palette (Harmonized with SuperBass Light Theme)
  static const Color navSurfaceColor = AppColors.surface; // Clean pure white
  static const Color selectedPillColor = Color(0xFFFEF08A); // Soft, premium light yellow
  static const Color selectedContentColor = Color(0xFF18181B); // Dark charcoal/black for bold contrast
  static const Color unselectedContentColor = Color(0xFF64748B); // Slate grey for inactive items
  static const Color borderColor = AppColors.outlineVariant; // Crisp border (0xFFE2E8F0)

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Container(
      color: Colors.transparent,
      padding: EdgeInsets.fromLTRB(
        16,
        4,
        16,
        bottomInset > 0 ? bottomInset : 16,
      ),
      child: Container(
        height: 66,
        decoration: BoxDecoration(
          color: navSurfaceColor,
          borderRadius: BorderRadius.circular(33),
          border: Border.all(color: borderColor, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
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
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(items.length, (index) {
            final item = items[index];
            final bool isSelected = selectedIndex == index;

            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
                child: InkWell(
                  onTap: () => onItemSelected(index),
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeInOut,
                    decoration: BoxDecoration(
                      color: isSelected ? selectedPillColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: const Color(0xFFEAB308).withValues(alpha: 0.20),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isSelected ? item.selectedIcon : item.icon,
                          size: 22,
                          color: isSelected ? selectedContentColor : unselectedContentColor,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? selectedContentColor : unselectedContentColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
