import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Worker Mode Color Palette (Synced with AppColors for consistent theme)
abstract class WorkerColors {
  // Primary Worker Brand Accents (Uber Black & Silver Neutrals)
  static const Color primary = AppColors.primary;
  static const Color primaryHover = AppColors.brandYellowHover;
  static const Color primaryLight = AppColors.brandYellowLight;
  static const Color primaryContainer = AppColors.primaryContainer;
  static const Color onPrimaryContainer = AppColors.onPrimaryContainer;
  static const Color primaryGlow = AppColors.brandYellowGlow;
  static const Color primaryBorder = AppColors.outline;

  // Base Neutrals
  static const Color surface = AppColors.surface;
  static const Color background = AppColors.background;
  static const Color surfaceVariant = AppColors.surfaceVariant;
  static const Color onSurface = AppColors.onSurface;
  static const Color onSurfaceVariant = AppColors.onSurfaceVariant;
  static const Color outline = AppColors.outline;
  static const Color outlineVariant = AppColors.outlineVariant;

  // Status Indicators
  static const Color online = AppColors.success; 
  static const Color onlineLight = Color(0xFFE6F9F0);
  static const Color offline = AppColors.onSurfaceVariant;
  static const Color offlineLight = AppColors.surfaceVariant;

  // State Accents
  static const Color success = AppColors.success;
  static const Color warning = AppColors.starRating;
  static const Color warningLight = Color(0xFFFFF8E6);
  static const Color error = AppColors.error;
  static const Color errorLight = Color(0xFFFDECEB);
  static const Color starRating = AppColors.starRating;
}

