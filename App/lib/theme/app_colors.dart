import 'package:flutter/material.dart';

/// Design tokens mapped directly from `design.md` for SuperBass
abstract class AppColors {
  // Brand Primary & Accents
  static const Color brandYellow = Color(0xFFFDC101);
  static const Color brandYellowHover = Color(0xFFD97706);
  static const Color brandYellowLight = Color(0xFFFFFBEB);
  static const Color brandYellowGlow = Color(0x47F59E0B); // rgba(245, 158, 11, 0.28)

  // Material 3 Color Tokens
  static const Color primary = brandYellow;
  static const Color onPrimary = Color(0xFF18181B);
  static const Color primaryContainer = Color(0xFFFEF3C7);
  static const Color onPrimaryContainer = Color(0xFF78350F);

  static const Color surface = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF0F172A);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color onSurfaceVariant = Color(0xFF475569);

  static const Color outline = Color(0xFFCBD5E1);
  static const Color outlineVariant = Color(0xFFE2E8F0);

  // Background ambient radial/linear gradient
  static const List<Color> ambientGradient = [
    Color(0x14F59E0B), // rgba(245, 158, 11, 0.08)
    Color(0x00FFFFFF),
  ];

  // Additional UI states
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color starRating = Color(0xFFF59E0B);
}
