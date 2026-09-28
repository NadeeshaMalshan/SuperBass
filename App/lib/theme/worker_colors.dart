import 'package:flutter/material.dart';

/// Worker Mode Color Palette (Uber Driver Inspired Black, Charcoal & White)
abstract class WorkerColors {
  // Primary Worker Brand Accents (Uber Black & Silver Neutrals)
  static const Color primary = Color(0xFF000000);
  static const Color primaryHover = Color(0xFF1E1E1E);
  static const Color primaryLight = Color(0xFFF3F3F3);
  static const Color primaryContainer = Color(0xFFF3F3F3);
  static const Color onPrimaryContainer = Color(0xFF000000);
  static const Color primaryGlow = Color(0x14000000);
  static const Color primaryBorder = Color(0xFFE5E5E5);

  // Base Neutrals
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF6F6F6);
  static const Color onSurface = Color(0xFF000000);
  static const Color onSurfaceVariant = Color(0xFF5E5E5E);
  static const Color outline = Color(0xFFE5E5E5);
  static const Color outlineVariant = Color(0xFFEEEEEE);

  // Status Indicators (Uber Driver Style)
  static const Color online = Color(0xFF06C167); // Uber Green online indicator
  static const Color onlineLight = Color(0xFFE6F9F0);
  static const Color offline = Color(0xFF757575);
  static const Color offlineLight = Color(0xFFF3F3F3);

  // State Accents
  static const Color success = Color(0xFF06C167);
  static const Color warning = Color(0xFFFFB800);
  static const Color warningLight = Color(0xFFFFF8E6);
  static const Color error = Color(0xFFE11900);
  static const Color errorLight = Color(0xFFFDECEB);
  static const Color starRating = Color(0xFFFFB800);
}

