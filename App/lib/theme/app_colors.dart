import 'package:flutter/material.dart';

/// Design tokens mapped to Uber-inspired UI for SuperBass
abstract class AppColors {
  // Brand Primary & Accents (Uber Black & Crisp Neutrals)
  static const Color brandBlack = Color(0xFF000000);
  static const Color brandYellow = Color(0xFF000000); // Brand primary
  static const Color brandYellowHover = Color(0xFF1E1E1E);
  static const Color brandYellowLight = Color(0xFFF3F3F3);
  static const Color brandYellowGlow = Color(0x14000000);

  // Material 3 Color Tokens (Uber Style)
  static const Color primary = Color(0xFF000000);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFF3F3F3);
  static const Color onPrimaryContainer = Color(0xFF000000);

  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF000000);
  static const Color surfaceVariant = Color(0xFFF6F6F6);
  static const Color onSurfaceVariant = Color(0xFF5E5E5E);

  static const Color outline = Color(0xFFE5E5E5);
  static const Color outlineVariant = Color(0xFFEEEEEE);

  // Uber Signature Accents
  static const Color accentGreen = Color(0xFF06C167); // Uber Eats Green
  static const Color accentRed = Color(0xFFE11900);   // Uber Promo / Discount Red
  static const Color accentBlue = Color(0xFF276EF1);  // Uber Info / Notification Blue

  // Background ambient radial/linear gradient
  static const List<Color> ambientGradient = [
    Color(0x06000000),
    Color(0x00FFFFFF),
  ];

  // Additional UI states
  static const Color success = Color(0xFF06C167);
  static const Color error = Color(0xFFE11900);
  static const Color starRating = Color(0xFFFFC043);

  // Workio Base Theme Tokens
  static const Color ink = Color(0xFF000000);
  static const Color inkMuted = Color(0xFF5C5C5C);
  static const Color line = Color(0xFFD4D4D4);
  static const Color track = Color(0xFFE2E2E2);
  static const Color designError = Color(0xFFD92D20);
  static const Color buttonPressed = Color(0xFF1F1F1F);
  static const Color disabled = Color(0xFFBDBDBD);
  static const Color backgroundLight = Color(0xFFFFFFFF);
}

