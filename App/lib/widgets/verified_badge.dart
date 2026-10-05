import 'package:flutter/material.dart';

class VerifiedBadge extends StatelessWidget {
  final double size;
  final Color? color;
  final String tooltip;

  const VerifiedBadge({
    super.key,
    this.size = 18.0,
    this.color,
    this.tooltip = 'Verified User',
  });

  @override
  Widget build(BuildContext context) {
    final icon = Padding(
      padding: const EdgeInsets.only(left: 4.0),
      child: Icon(
        Icons.verified,
        color: color ?? const Color(0xFF2563EB),
        size: size,
      ),
    );

    if (tooltip.isNotEmpty) {
      return Tooltip(
        message: tooltip,
        child: icon,
      );
    }
    return icon;
  }
}
// This widget is used to display a verified badge icon next to a user's name or profile picture, indicating that the user has been officially verified. The size, color, and tooltip of the badge can be customized.