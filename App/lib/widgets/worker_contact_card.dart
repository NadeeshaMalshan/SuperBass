import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

/// Parses a raw message string (JSON or plain phone number) into card data.
Map<String, String> parseContactCard(String raw) {
  try {
    final decoded = jsonDecode(raw);
    if (decoded is Map) {
      final phone = (decoded['phoneNo'] ?? decoded['PhoneNo'] ?? decoded['phone'] ?? '').toString();
      final name  = (decoded['workerName'] ?? decoded['WorkerName'] ?? decoded['name'] ?? 'Worker').toString();
      final loc   = (decoded['location'] ?? decoded['service'] ?? decoded['jobTitle'] ?? '').toString();
      final avatar= (decoded['avatar'] ?? decoded['Avatar'] ?? '').toString();
      return {'phone': phone, 'name': name, 'location': loc, 'avatar': avatar};
    }
  } catch (_) {}
  // Fallback: treat whole string as phone number
  return {'phone': raw.trim(), 'name': 'Worker', 'location': '', 'avatar': ''};
}

class WorkerContactCard extends StatefulWidget {
  final String rawContent;
  final String? workerName;
  final String? location;
  final String? avatarUrl;
  final String? workerPhone;

  const WorkerContactCard({
    super.key,
    required this.rawContent,
    this.workerName,
    this.location,
    this.avatarUrl,
    this.workerPhone,
  });

  @override
  State<WorkerContactCard> createState() => _WorkerContactCardState();
}

class _WorkerContactCardState extends State<WorkerContactCard> {
  bool _copied = false;

  @override
  Widget build(BuildContext context) {
    final card = parseContactCard(widget.rawContent);
    final cardPhone = card['phone'] ?? '';
    final phone = (cardPhone.isNotEmpty && cardPhone != 'null')
        ? cardPhone
        : (widget.workerPhone != null && widget.workerPhone!.isNotEmpty && widget.workerPhone != 'null'
            ? widget.workerPhone!
            : '');
    final name     = widget.workerName ?? (card['name']!.isNotEmpty ? card['name']! : 'Worker');
    final location = widget.location  ?? card['location']!;
    final avatar   = widget.avatarUrl ?? card['avatar']!;

    final displayInitial = name.isNotEmpty ? name[0].toUpperCase() : 'W';

    return Container(
      width: 300,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Header: avatar + name + location ──────────────
          Row(
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Color(0xFF111111),
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: (avatar.isNotEmpty && avatar != 'null')
                      ? Image.network(
                          avatar,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _InitialAvatar(initial: displayInitial),
                        )
                      : _InitialAvatar(initial: displayInitial),
                ),
              ),
              const SizedBox(width: 12),
              // Name + location
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.dmSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF111111),
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        // Blue verified checkmark
                        Container(
                          width: 18,
                          height: 18,
                          decoration: const BoxDecoration(
                            color: Color(0xFF1877F2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            color: Colors.white,
                            size: 12,
                          ),
                        ),
                      ],
                    ),
                    if (location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: const Color(0xFF666666),
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Phone number card ──────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'DIRECT PHONE NUMBER',
                  style: GoogleFonts.dmSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.8,
                    color: const Color(0xFF888888),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  phone.isNotEmpty ? phone : 'Not provided',
                  style: GoogleFonts.dmSans(
                    fontSize: phone.isNotEmpty ? 24 : 16,
                    fontWeight: phone.isNotEmpty ? FontWeight.w700 : FontWeight.w500,
                    color: phone.isNotEmpty ? const Color(0xFF111111) : const Color(0xFF888888),
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // ── Action buttons ─────────────────────────────────
          Row(
            children: [
              // Call Now
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    if (phone.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Phone number not provided')),
                      );
                      return;
                    }
                    final uri = Uri(scheme: 'tel', path: phone.replaceAll(' ', ''));
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri);
                    }
                  },
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF111111),
                      borderRadius: BorderRadius.circular(50),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.phone_rounded, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Call now',
                          style: GoogleFonts.dmSans(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Copy
              GestureDetector(
                onTap: () {
                  if (phone.isEmpty) return;
                  final raw = phone.replaceAll(' ', '');
                  Clipboard.setData(ClipboardData(text: raw));
                  setState(() => _copied = true);
                  Future.delayed(const Duration(seconds: 2), () {
                    if (mounted) setState(() => _copied = false);
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        '✓ Phone number copied!',
                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
                      ),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      duration: const Duration(seconds: 2),
                      backgroundColor: Colors.black,
                    ),
                  );
                },
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(50),
                    border: Border.all(color: const Color(0xFFDDDDDD), width: 1.5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _copied ? Icons.check_rounded : Icons.copy_rounded,
                        size: 16,
                        color: const Color(0xFF111111),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _copied ? 'Copied' : 'Copy',
                        style: GoogleFonts.dmSans(
                          color: const Color(0xFF111111),
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // ── Footer ────────────────────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline_rounded, size: 13, color: Color(0xFF888888)),
              const SizedBox(width: 4),
              Text(
                'Verified number shared for this booking',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: const Color(0xFF888888),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InitialAvatar extends StatelessWidget {
  final String initial;
  const _InitialAvatar({required this.initial});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initial,
        style: GoogleFonts.dmSans(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
