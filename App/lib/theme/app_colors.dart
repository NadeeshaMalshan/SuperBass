import 'package:flutter/material.dart';

/// Design tokens mapped to Black and White Monochrome UI for SuperBass
abstract class AppColors {
  // Brand Primary & Accents (Monochrome Black & White)
  static const Color brandYellow = Color(0xFF000000);
  static const Color brandYellowHover = Color(0xFF27272A);
  static const Color brandYellowLight = Color(0xFFF4F4F5);
  static const Color brandYellowGlow = Color(0x1F000000);

  // Material 3 Color Tokens
  static const Color primary = Color(0xFF000000);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFF4F4F5);
  static const Color onPrimaryContainer = Color(0xFF000000);

  static const Color surface = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF000000);
  static const Color surfaceVariant = Color(0xFFF4F4F5);
  static const Color onSurfaceVariant = Color(0xFF71717A);

  static const Color outline = Color(0xFFE4E4E7);
  static const Color outlineVariant = Color(0xFFF4F4F5);

  // Background ambient radial/linear gradient
  static const List<Color> ambientGradient = [
    Color(0x0A000000),
    Color(0x00FFFFFF),
  ];

  // Additional UI states (Monochrome High Contrast)
  static const Color success = Color(0xFF18181B);
  static const Color error = Color(0xFF18181B);
  static const Color starRating = Color(0xFF18181B);
}
