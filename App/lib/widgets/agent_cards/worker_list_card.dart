import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class WorkerListCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const WorkerListCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  State<WorkerListCard> createState() => _WorkerListCardState();
}

class _WorkerListCardState extends State<WorkerListCard> {
  final Set<String> _favoritedIds = {};

  void _toggleFavorite(String workerId) {
    setState(() {
      if (_favoritedIds.contains(workerId)) {
        _favoritedIds.remove(workerId);
      } else {
        _favoritedIds.add(workerId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final workersRaw = widget.data['workers'];
    final List<dynamic> workers = workersRaw is List ? workersRaw : [];
    final category = widget.data['category']?.toString() ??
        widget.data['query']?.toString() ??
        'Service';
    final totalCount = widget.data['totalCount'] ?? workers.length;

    if (workers.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F3F5),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.person_off_rounded, color: Colors.white, size: 24),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No Workers Found',
                        style: GoogleFonts.dmSans(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Matching: $category',
                        style: GoogleFonts.dmSans(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'No verified service professionals currently found for "$category". Try searching for another service category or location.',
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on, size: 14, color: Color(0xFF2563EB)),
                            const SizedBox(width: 4),
                            Text(
                              'Closest $category Pros',
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1D4ED8),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$totalCount available',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: () {
                    widget.onAction?.call('navigate', '/find?query=$category');
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Map View',
                          style: GoogleFonts.dmSans(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.open_in_new_rounded, size: 12, color: Color(0xFF334155)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Horizontal scrolling row of worker cards
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            physics: const BouncingScrollPhysics(),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: workers.map((w) {
                final Map<String, dynamic> worker = w is Map<String, dynamic>
                    ? w
                    : (w is Map ? Map<String, dynamic>.from(w) : {});
                return Container(
                  width: 295,
                  margin: const EdgeInsets.only(right: 12),
                  child: _buildWorkerItem(worker, category),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  String? _resolveImageUrl(dynamic rawUrl) {
    if (rawUrl == null) return null;
    final url = rawUrl.toString().trim();
    if (url.isEmpty || url == 'null' || url == 'default') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const base = 'http://localhost:5237';
    if (url.startsWith('/')) {
      return '$base$url';
    }
    return '$base/$url';
  }

  Widget _buildWorkerItem(Map<String, dynamic> worker, String defaultCategory) {
    final workerId = (worker['id'] ?? worker['workerId'] ?? '').toString();
    final name = worker['name']?.toString() ?? 'Verified Technician';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'W';
    final rawImg = worker['profileImage'] ??
        worker['ProfileImage'] ??
        worker['avatarUrl'] ??
        worker['AvatarUrl'] ??
        worker['workerAvatar'] ??
        worker['WorkerAvatar'] ??
        worker['workerProfileImage'] ??
        worker['WorkerProfileImage'] ??
        worker['picture'] ??
        worker['image'];
    final profileImage = _resolveImageUrl(rawImg);
    final isVerified = worker['isVerified'] != false;
    final isFav = _favoritedIds.contains(workerId);

    final ratingVal = worker['overallRating'] ?? worker['rating'];
    final ratingStr = ratingVal != null ? _formatRating(ratingVal) : '5.0';
    final jobsCount = worker['completedJobs'] != null ? '${worker['completedJobs']} jobs' : 'Verified Pro';

    final hourlyRate = worker['hourlyRate'] ?? worker['dailyRate'] ?? worker['estimatedRate'];
    final rateDisplay = hourlyRate != null
        ? 'Rs. ${_formatAmount(hourlyRate)}'
        : 'Negotiable';
    final rateUnit = worker['hourlyRate'] != null
        ? '/ hr'
        : (worker['dailyRate'] != null ? '/ day' : '');

    final displayRole = worker['primaryRole']?.toString() ?? defaultCategory;
    final skills = worker['skills'];
    String skillText = 'General Repairs & Maintenance';
    if (skills is List && skills.isNotEmpty) {
      final s = skills.first;
      skillText = s is Map ? (s['skillName'] ?? s['name'] ?? skillText) : s.toString();
    }

    final locationText = worker['primaryServiceArea']?.toString() ??
        worker['location']?.toString() ??
        worker['district']?.toString() ??
        'Colombo';

    final isAvailable = worker['isAvailable'] != false;

    return Container(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F3F5),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Top Row: Black circular avatar + Name & Role
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: profileImage != null && profileImage.isNotEmpty
                      ? Image.network(
                          profileImage,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Text(
                              initial,
                              style: GoogleFonts.dmSans(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 19,
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            initial,
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 19,
                            ),
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            style: GoogleFonts.dmSans(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded, size: 15, color: Color(0xFF2563EB)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$displayRole  •  ★ $ratingStr ($jobsCount)',
                      style: GoogleFonts.dmSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => _toggleFavorite(workerId),
                child: Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Icon(
                    isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    size: 20,
                    color: isFav ? const Color(0xFFEF4444) : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. Middle Container: Pure white rounded box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Skills & Location
                Row(
                  children: [
                    const Icon(Icons.build_outlined, size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        skillText,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF334155),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 3),
                    Text(
                      locationText,
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 8),
                // Rate and Availability
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          rateDisplay,
                          style: GoogleFonts.dmSans(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        if (rateUnit.isNotEmpty)
                          Text(
                            ' $rateUnit',
                            style: GoogleFonts.dmSans(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                      ],
                    ),
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: isAvailable ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          isAvailable ? 'Available Now' : 'Busy',
                          style: GoogleFonts.dmSans(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: isAvailable ? const Color(0xFF10B981) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 3. Bottom Row: Solid Black Pill Button + White Pill Button
          Row(
            children: [
              Expanded(
                flex: 3,
                child: InkWell(
                  onTap: () {
                    widget.onAction?.call('book_worker', worker);
                  },
                  borderRadius: BorderRadius.circular(26),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Center(
                      child: Text(
                        'Book Now',
                        style: GoogleFonts.dmSans(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: InkWell(
                  onTap: () {
                    widget.onAction?.call('view_worker', worker);
                  },
                  borderRadius: BorderRadius.circular(26),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Center(
                      child: Text(
                        'Profile',
                        style: GoogleFonts.dmSans(
                          color: const Color(0xFF0F172A),
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatRating(dynamic val) {
    if (val is num) return val.toStringAsFixed(1);
    final parsed = double.tryParse(val.toString());
    return parsed != null ? parsed.toStringAsFixed(1) : val.toString();
  }

  String _formatAmount(dynamic val) {
    if (val is num) return val.toInt().toString();
    final parsed = double.tryParse(val.toString());
    return parsed != null ? parsed.toInt().toString() : val.toString();
  }
}
