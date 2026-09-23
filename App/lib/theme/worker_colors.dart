import 'package:flutter/material.dart';

/// Worker Mode Color Palette
/// Matches the web frontend's `--worker-blue` design tokens while sharing the
/// exact same typography, card geometries, and layout styling of SuperBass.
abstract class WorkerColors {
  // Primary Worker Brand Accents
  static const Color primary = Color(0xFF2563EB); // #2563EB - Worker Royal Blue
  static const Color primaryHover = Color(0xFF1D4ED8); // #1D4ED8 - Darker Blue
  static const Color primaryLight = Color(0xFFEFF6FF); // #EFF6FF - Soft tint
  static const Color primaryContainer = Color(0xFFDBEAFE); // #DBEAFE - Pill / container
  static const Color onPrimaryContainer = Color(0xFF1E40AF); // #1E40AF - High contrast text
  static const Color primaryGlow = Color(0x332563EB); // rgba(37, 99, 235, 0.20)
  static const Color primaryBorder = Color(0xFFBFDBFE); // #BFDBFE - Subtle border

  // Base Neutrals
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF8FAFC);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color onSurface = Color(0xFF0F172A);
  static const Color onSurfaceVariant = Color(0xFF64748B);
  static const Color outline = Color(0xFFCBD5E1);
  static const Color outlineVariant = Color(0xFFE2E8F0);

  // Status Indicators
  static const Color online = Color(0xFF10B981); // Emerald green for Available
  static const Color onlineLight = Color(0xFFECFDF5);
  static const Color offline = Color(0xFF94A3B8); // Muted slate for Offline
  static const Color offlineLight = Color(0xFFF1F5F9);

  // State Accents
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFFFBEB);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEF2F2);
  static const Color starRating = Color(0xFFF59E0B);
}
