import 'package:flutter/material.dart';

/// Worker Mode Color Palette (Black & White Monochrome)
abstract class WorkerColors {
  // Primary Worker Brand Accents (Black & White)
  static const Color primary = Color(0xFF000000);
  static const Color primaryHover = Color(0xFF27272A);
  static const Color primaryLight = Color(0xFFF4F4F5);
  static const Color primaryContainer = Color(0xFFE4E4E7);
  static const Color onPrimaryContainer = Color(0xFF000000);
  static const Color primaryGlow = Color(0x1F000000);
  static const Color primaryBorder = Color(0xFFD4D4D8);

  // Base Neutrals
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFFAFAFA);
  static const Color surfaceVariant = Color(0xFFF4F4F5);
  static const Color onSurface = Color(0xFF000000);
  static const Color onSurfaceVariant = Color(0xFF71717A);
  static const Color outline = Color(0xFFE4E4E7);
  static const Color outlineVariant = Color(0xFFF4F4F5);

  // Status Indicators (Monochrome)
  static const Color online = Color(0xFF000000);
  static const Color onlineLight = Color(0xFFF4F4F5);
  static const Color offline = Color(0xFF71717A);
  static const Color offlineLight = Color(0xFFF4F4F5);

  // State Accents
  static const Color success = Color(0xFF18181B);
  static const Color warning = Color(0xFF18181B);
  static const Color warningLight = Color(0xFFF4F4F5);
  static const Color error = Color(0xFF18181B);
  static const Color errorLight = Color(0xFFF4F4F5);
  static const Color starRating = Color(0xFF18181B);
}
