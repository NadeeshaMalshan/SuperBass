import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/app_notification_model.dart';
import '../services/notification_service.dart';
import '../theme/app_colors.dart';

class NotificationBellButton extends StatelessWidget {
  final Function(AppNotification)? onNotificationTap;

  const NotificationBellButton({super.key, this.onNotificationTap});

  @override
  Widget build(BuildContext context) {
    final service = NotificationService();
    return ValueListenableBuilder<int>(
      valueListenable: service.unreadCountNotifier,
      builder: (context, unreadCount, _) {
        return IconButton(
          tooltip: 'Notifications',
          icon: Stack(
            clipBehavior: Clip.none,
            children: [
              const Icon(Icons.notifications_outlined, size: 24),
              if (unreadCount > 0)
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.brandYellow,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.surface, width: 1.5),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: const TextStyle(
                        color: Color(0xFF111827),
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          onPressed: () {
            NotificationsSheet.show(
              context,
              onNotificationTap: (n) {
                onNotificationTap?.call(n);
              },
            );
          },
        );
      },
    );
  }
}

class NotificationsSheet extends StatefulWidget {
  final Function(AppNotification) onNotificationTap;

  const NotificationsSheet({
    super.key,
    required this.onNotificationTap,
  });

  static void show(BuildContext context, {required Function(AppNotification) onNotificationTap}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => NotificationsSheet(onNotificationTap: onNotificationTap),
    );
  }

  @override
  State<NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<NotificationsSheet> {
  final NotificationService _service = NotificationService();

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final notifications = _service.notifications;

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                Text(
                  'Notifications',
                  style: GoogleFonts.dmSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(width: 8),
                ValueListenableBuilder<int>(
                  valueListenable: _service.unreadCountNotifier,
                  builder: (context, unread, _) {
                    if (unread == 0) return const SizedBox.shrink();
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.brandYellow,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$unread new',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF111827),
                        ),
                      ),
                    );
                  },
                ),
                const Spacer(),
                if (notifications.isNotEmpty) ...[
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _service.markAllAsRead();
                      });
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'Mark all read',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.delete_sweep_outlined, size: 20),
                    tooltip: 'Clear all',
                    color: AppColors.onSurfaceVariant,
                    onPressed: () {
                      setState(() {
                        _service.clearAll();
                      });
                    },
                  ),
                ],
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.outlineVariant),

          // List
          Expanded(
            child: notifications.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.notifications_none_rounded,
                            size: 32,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No notifications yet',
                          style: GoogleFonts.dmSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 40),
                          child: Text(
                            'You will receive instant alerts for booking updates and chat messages here.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.dmSans(
                              fontSize: 13,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: notifications.length,
                    separatorBuilder: (_, __) => const Divider(
                      height: 1,
                      indent: 72,
                      endIndent: 20,
                      color: AppColors.outlineVariant,
                    ),
                    itemBuilder: (context, index) {
                      final n = notifications[index];
                      return InkWell(
                        onTap: () {
                          _service.markAsRead(n.id);
                          Navigator.of(context).pop();
                          widget.onNotificationTap(n);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          color: n.isRead ? Colors.transparent : AppColors.brandYellow.withValues(alpha: 0.04),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Type icon
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: n.iconBgColor,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  n.icon,
                                  color: n.iconColor,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Texts
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            n.title,
                                            style: GoogleFonts.dmSans(
                                              fontWeight: n.isRead ? FontWeight.w600 : FontWeight.w800,
                                              fontSize: 14,
                                              color: AppColors.onSurface,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          _formatTime(n.timestamp),
                                          style: GoogleFonts.dmSans(
                                            fontSize: 11,
                                            color: AppColors.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      n.body,
                                      style: GoogleFonts.dmSans(
                                        fontSize: 13,
                                        color: n.isRead
                                            ? AppColors.onSurfaceVariant
                                            : AppColors.onSurface,
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Unread dot
                              if (!n.isRead) ...[
                                const SizedBox(width: 8),
                                Container(
                                  margin: const EdgeInsets.only(top: 6),
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.brandYellow,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
