import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../superbass_map.dart';
import '../../services/location_service.dart';
import '../../services/api_config.dart';

// ==========================================
// 1. BOOKING LIST CARD
// ==========================================
class BookingListCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const BookingListCard({
    super.key,
    required this.data,
    this.onAction,
  });

  Color _getStatusColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('confirm')) return const Color(0xFF10B981);
    if (s.contains('progress') || s.contains('ongoing')) return const Color(0xFF2563EB);
    if (s.contains('complete') || s.contains('done')) return const Color(0xFF64748B);
    if (s.contains('cancel') || s.contains('reject')) return const Color(0xFFEF4444);
    return const Color(0xFFF59E0B);
  }

  @override
  Widget build(BuildContext context) {
    final bookingsRaw = data['bookings'];
    final List<dynamic> bookings = bookingsRaw is List ? bookingsRaw : [];
    final statusFilter = data['statusFilter']?.toString() ?? 'Active';
    final totalCount = data['totalCount'] ?? bookings.length;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F3F5),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Top Header Row: 48x48 Black Circular Icon + Title & Subtitle
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
                  child: Icon(Icons.calendar_month_rounded, color: Colors.white, size: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$statusFilter Bookings',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$totalCount scheduled appointment${totalCount == 1 ? '' : 's'}',
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
            ],
          ),

          const SizedBox(height: 12),

          // 2. Middle Content: Empty State or Horizontally Scrollable Cards
          if (bookings.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Icon(Icons.event_busy_rounded, size: 36, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 8),
                  Text(
                    'No scheduled bookings found.',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              physics: const BouncingScrollPhysics(),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: bookings.map((b) {
                  final Map<String, dynamic> booking = b is Map<String, dynamic>
                      ? b
                      : (b is Map ? Map<String, dynamic>.from(b) : {});
                  final bId = (booking['id'] ?? booking['bookingId'] ?? '').toString();
                  final workerName = booking['workerName']?.toString() ?? 'Technician';
                  final jobTitle = booking['jobTitle']?.toString() ?? 'Service Appointment';
                  final status = booking['status']?.toString() ?? 'Requested';
                  final dateStr = booking['scheduledDate']?.toString() ?? '';
                  final location = booking['locationAddress']?.toString() ?? 'Colombo';
                  final price = booking['agreedPrice'] ?? booking['estimatedPrice'];

                  final statusColor = _getStatusColor(status);

                  // STRICT: Only true if completed
                  final statusLower = status.toLowerCase().trim();
                  final isCompleted = statusLower == 'completed' ||
                      statusLower == 'done' ||
                      statusLower == 'finished';

                  return Container(
                    width: 295,
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Card Header: Worker Initial Icon + Title & Worker + Status
                        Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: const BoxDecoration(
                                color: Colors.black,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                                  style: GoogleFonts.dmSans(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    jobTitle,
                                    style: GoogleFonts.dmSans(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF0F172A),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 1),
                                  Text(
                                    '#$bId  •  $workerName',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 11.5,
                                      color: const Color(0xFF64748B),
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                status,
                                style: GoogleFonts.dmSans(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 10),

                        // Details container
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              if (dateStr.isNotEmpty) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        _formatDate(dateStr),
                                        style: GoogleFonts.dmSans(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                          color: const Color(0xFF334155),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),
                              ],
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 12, color: Color(0xFFE11D48)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      location,
                                      style: GoogleFonts.dmSans(fontSize: 11, color: const Color(0xFF64748B)),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (price != null) ...[
                                    Text(
                                      'Rs. $price',
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 10),

                        // Action Buttons: Review is STRICTLY for completed bookings
                        Row(
                          children: [
                            if (isCompleted) ...[
                              Expanded(
                                flex: 3,
                                child: InkWell(
                                  onTap: () {
                                    onAction?.call('review_worker', booking);
                                  },
                                  borderRadius: BorderRadius.circular(26),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    decoration: BoxDecoration(
                                      color: Colors.black,
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '★ Review',
                                        style: GoogleFonts.dmSans(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12.5,
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
                                    onAction?.call('send_prompt', 'Show details for booking #$bId');
                                  },
                                  borderRadius: BorderRadius.circular(26),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(26),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: Center(
                                      child: Text(
                                        'Details',
                                        style: GoogleFonts.dmSans(
                                          color: const Color(0xFF0F172A),
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ] else ...[
                              // NOT completed: ONLY "View Details" button, NO review button
                              Expanded(
                                child: InkWell(
                                  onTap: () {
                                    onAction?.call('send_prompt', 'Show details for booking #$bId');
                                  },
                                  borderRadius: BorderRadius.circular(26),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    decoration: BoxDecoration(
                                      color: Colors.black,
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                    child: Center(
                                      child: Text(
                                        'View Details',
                                        style: GoogleFonts.dmSans(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),

          const SizedBox(height: 12),

          // 3. Bottom Row: Solid Black Pill + White Pill
          Row(
            children: [
              Expanded(
                flex: 3,
                child: InkWell(
                  onTap: () {
                    onAction?.call('send_prompt', 'Find a verified technician near me');
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
                        'Book a Technician',
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
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: InkWell(
                  onTap: () {
                    onAction?.call('navigate', '/bookings');
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
                        'All Bookings',
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

  String _formatDate(String str) {
    try {
      final d = DateTime.parse(str);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.hour > 12 ? d.hour - 12 : (d.hour == 0 ? 12 : d.hour)}:${d.minute.toString().padLeft(2, '0')} ${d.hour >= 12 ? 'PM' : 'AM'}';
    } catch (_) {
      return str;
    }
  }
}

// ==========================================
// 2. IN-CHAT BOOKING FORM CARD
// ==========================================
class BookingFormCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const BookingFormCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  State<BookingFormCard> createState() => _BookingFormCardState();
}

class _BookingFormCardState extends State<BookingFormCard> {
  late TextEditingController _jobTitleCtrl;
  late TextEditingController _descriptionCtrl;
  late TextEditingController _notesCtrl;
  late TextEditingController _districtCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _phoneCtrl;
  late DateTime _selectedDate;
  String _priority = 'Medium';
  bool _isSubmitting = false;
  bool _isCompleted = false;

  // GPS location state
  late double _locationLat;
  late double _locationLng;
  late bool _shareGps;
  bool _isLocatingGps = false;

  @override
  void initState() {
    super.initState();
    final rawP = widget.data['priority']?.toString() ??
        widget.data['urgency']?.toString() ??
        'Medium';
    final pLower = rawP.toLowerCase().trim();
    if (pLower == 'high' || pLower == 'urgent' || pLower == 'emergency') {
      _priority = 'High';
    } else if (pLower == 'low') {
      _priority = 'Low';
    } else {
      _priority = 'Medium';
    }

    // Parse pre-filled date if provided
    final rawDate = widget.data['selectedDate'] ??
        widget.data['date'] ??
        widget.data['scheduledDate'];
    DateTime parsedDate = DateTime.now().add(const Duration(days: 1));
    if (rawDate != null) {
      final s = rawDate.toString().split('T').first;
      final p = DateTime.tryParse(s);
      if (p != null) parsedDate = p;
    }
    _selectedDate = parsedDate;

    final cat = widget.data['category']?.toString() ?? 'Home Service';
    _jobTitleCtrl = TextEditingController(
      text: widget.data['jobTitle']?.toString() ?? '$cat Service Request',
    );
    _descriptionCtrl = TextEditingController(
      text: widget.data['description']?.toString() ??
          widget.data['notes']?.toString() ??
          '',
    );
    _notesCtrl = TextEditingController(text: widget.data['notes']?.toString() ?? '');

    // Parse coordinates if available
    double? initLat;
    double? initLng;
    if (widget.data['latitude'] != null) initLat = double.tryParse(widget.data['latitude'].toString());
    if (widget.data['lat'] != null) initLat = double.tryParse(widget.data['lat'].toString());
    if (widget.data['locationLat'] != null) initLat = double.tryParse(widget.data['locationLat'].toString());

    if (widget.data['longitude'] != null) initLng = double.tryParse(widget.data['longitude'].toString());
    if (widget.data['lng'] != null) initLng = double.tryParse(widget.data['lng'].toString());
    if (widget.data['locationLng'] != null) initLng = double.tryParse(widget.data['locationLng'].toString());

    final rawLoc = widget.data['location']?.toString() ?? '';
    final rawAddr = widget.data['address']?.toString() ?? widget.data['specificAddress']?.toString() ?? '';

    final coordRegex = RegExp(r'^\s*([-\d.]+)\s*,\s*([-\d.]+)\s*$');
    final matchLoc = coordRegex.firstMatch(rawLoc);
    if (matchLoc != null) {
      initLat ??= double.tryParse(matchLoc.group(1) ?? '');
      initLng ??= double.tryParse(matchLoc.group(2) ?? '');
    }

    _locationLat = initLat ?? 6.74006;
    _locationLng = initLng ?? 80.38106;
    _shareGps = initLat != null && initLng != null;

    String initialDistrict = 'Ratnapura';
    if (matchLoc == null && rawLoc.isNotEmpty) {
      initialDistrict = rawLoc;
    } else if (rawAddr.isNotEmpty && !coordRegex.hasMatch(rawAddr)) {
      initialDistrict = 'Ratnapura';
    }

    _districtCtrl = TextEditingController(text: initialDistrict);
    _addressCtrl = TextEditingController(
      text: matchLoc != null ? '' : (rawAddr.isNotEmpty ? rawAddr : ''),
    );
    _phoneCtrl = TextEditingController(
      text: widget.data['contactPhone']?.toString() ?? '0771756463',
    );

    // If initial location was coordinates, try reverse-geocoding district in background
    if (matchLoc != null && initLat != null && initLng != null) {
      LocationService.reverseGeocodeToDistrict(initLat, initLng).then((d) {
        if (d != null && d.isNotEmpty && mounted) {
          setState(() {
            _districtCtrl.text = d;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _jobTitleCtrl.dispose();
    _descriptionCtrl.dispose();
    _notesCtrl.dispose();
    _districtCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _onSubmit() async {
    setState(() => _isSubmitting = true);
    final workerId = (widget.data['workerId'] ?? widget.data['id'] ?? '1').toString();
    final workerName = widget.data['workerName']?.toString() ?? 'Technician';
    final dateStr = _selectedDate.toIso8601String().split('T').first;
    final title = _jobTitleCtrl.text.trim();
    final desc = _descriptionCtrl.text.trim();
    final district = _districtCtrl.text.trim();
    final specificAddress = _addressCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final notes = _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : desc;

    final fullAddress = specificAddress.isNotEmpty
        ? '$specificAddress, $district'
        : (district.isNotEmpty ? district : 'Ratnapura');

    final gpsText = _shareGps
        ? ' [GPS: ${_locationLat.toStringAsFixed(5)}, ${_locationLng.toStringAsFixed(5)}]'
        : '';

    final descText = desc.isNotEmpty ? ' Description: $desc.' : '';

    final prompt =
        "REVIEW_BOOKING: Please review booking details for worker ID $workerId ($workerName) on $dateStr. Priority: $_priority. Service: $title.$descText Location: $fullAddress$gpsText. Phone: $phone. Notes: $notes";

    widget.onAction?.call('send_prompt', {
      'prompt': prompt,
      'action': 'review_booking',
      'workerId': workerId,
      'bookingData': {
        'workerId': workerId,
        'workerName': workerName,
        'workerAvatar': widget.data['workerAvatar'] ??
            widget.data['workerProfileImage'] ??
            widget.data['profileImage'] ??
            widget.data['avatarUrl'],
        'category': widget.data['category'] ?? 'Home Service',
        'date': dateStr,
        'scheduledDate': '${dateStr}T09:00:00',
        'jobTitle': title,
        'description': desc,
        'priority': _priority,
        'urgency': _priority,
        'locationAddress': fullAddress,
        'specificAddress': specificAddress,
        'district': district,
        'contactPhone': phone,
        'notes': notes,
        'hourlyRate': widget.data['hourlyRate'] ?? 2500,
        'estimatedPrice': widget.data['hourlyRate'] ?? 2500,
        'locationLat': _shareGps ? _locationLat : null,
        'locationLng': _shareGps ? _locationLng : null,
        'shareGps': _shareGps,
      },
    });

    setState(() {
      _isSubmitting = false;
      _isCompleted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final workerName = widget.data['workerName']?.toString() ?? 'Verified Pro';
    final role = widget.data['category']?.toString() ?? 'Technician';
    final rate = widget.data['hourlyRate'] ?? 2500;

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
          // 1. Top Row: Black circular avatar + Title & Subtitle
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                    style: GoogleFonts.dmSans(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 19,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Book $workerName',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$role  •  Rs. $rate / hr',
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
            ],
          ),

          const SizedBox(height: 12),

          if (_isCompleted) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Icon(Icons.fact_check_rounded, size: 24, color: Color(0xFF2563EB)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Booking Summary Generated',
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Please review the booking confirmation details in the card below to finalize your appointment with $workerName.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.dmSans(fontSize: 12.5, color: const Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ] else ...[
            // 2. Middle Container: Pure white rounded box with form fields
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SERVICE TITLE',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _jobTitleCtrl,
                    style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Problem Description / Issue Details
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PROBLEM DESCRIPTION / DETAILS',
                        style: GoogleFonts.dmSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'AI Auto-Filled',
                          style: GoogleFonts.dmSans(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF2563EB),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _descriptionCtrl,
                    maxLines: 2,
                    style: GoogleFonts.dmSans(fontSize: 12.5),
                    decoration: InputDecoration(
                      hintText: 'Detailed description of the issue...',
                      hintStyle: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Priority Level Selector
                  Text(
                    'PRIORITY LEVEL',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: ['Low', 'Medium', 'High'].map((p) {
                        final isSel = _priority.toLowerCase() == p.toLowerCase();
                        Color activeBg = Colors.black;
                        Color activeBorder = Colors.black;

                        if (p == 'High') {
                          activeBg = const Color(0xFFDC2626);
                          activeBorder = const Color(0xFFDC2626);
                        } else if (p == 'Medium') {
                          activeBg = const Color(0xFF0F172A);
                          activeBorder = const Color(0xFF0F172A);
                        } else {
                          activeBg = const Color(0xFF475569);
                          activeBorder = const Color(0xFF475569);
                        }

                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: InkWell(
                            onTap: () => setState(() => _priority = p),
                            borderRadius: BorderRadius.circular(20),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                              decoration: BoxDecoration(
                                color: isSel ? activeBg : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSel ? activeBorder : const Color(0xFFE2E8F0),
                                  width: isSel ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isSel) ...[
                                    Icon(
                                      p == 'High'
                                          ? Icons.warning_amber_rounded
                                          : Icons.check_circle_rounded,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                                    const SizedBox(width: 4),
                                  ],
                                  Text(
                                    p,
                                    style: GoogleFonts.dmSans(
                                      fontSize: 11.5,
                                      fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                      color: isSel ? Colors.white : const Color(0xFF475569),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 10),

                  Text(
                    'SCHEDULE DATE',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded, size: 15, color: Color(0xFF2563EB)),
                          const SizedBox(width: 8),
                          Text(
                            '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
                            style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          const Spacer(),
                          const Icon(Icons.edit_calendar_rounded, size: 15, color: Color(0xFF64748B)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Location (District) & Phone Row
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'LOCATION / DISTRICT',
                              style: GoogleFonts.dmSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _districtCtrl,
                              style: GoogleFonts.dmSans(fontSize: 12),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PHONE',
                              style: GoogleFonts.dmSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _phoneCtrl,
                              style: GoogleFonts.dmSans(fontSize: 12),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Specific Address / Street
                  Text(
                    'SPECIFIC ADDRESS / STREET',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _addressCtrl,
                    style: GoogleFonts.dmSans(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'e.g. 5656, Batuhena, Ratnapura',
                      hintStyle: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.home_outlined, size: 16, color: Color(0xFF64748B)),
                      prefixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Share saved GPS location section card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.my_location_rounded, size: 15, color: Colors.black),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Share saved GPS location',
                                        style: GoogleFonts.dmSans(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 13,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _shareGps
                                        ? 'Saved pin: ${_locationLat.toStringAsFixed(5)}, ${_locationLng.toStringAsFixed(5)}'
                                        : 'GPS coordinates will not be attached',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 11,
                                      color: const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: _shareGps,
                              activeThumbColor: Colors.white,
                              activeTrackColor: Colors.black,
                              inactiveThumbColor: Colors.white,
                              inactiveTrackColor: const Color(0xFFCBD5E1),
                              onChanged: (val) {
                                setState(() {
                                  _shareGps = val;
                                });
                              },
                            ),
                          ],
                        ),
                        if (_shareGps) ...[
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Stack(
                              children: [
                                SuperBassMap(
                                  latitude: _locationLat,
                                  longitude: _locationLng,
                                  height: 140,
                                  borderRadius: 12,
                                  isInteractive: true,
                                  markerTitle: '',
                                  onLocationPicked: (point) {
                                    setState(() {
                                      _locationLat = point.latitude;
                                      _locationLng = point.longitude;
                                    });
                                  },
                                ),
                                Positioned(
                                  top: 8,
                                  left: 8,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(20),
                                    onTap: _isLocatingGps
                                        ? null
                                        : () async {
                                            setState(() => _isLocatingGps = true);
                                            try {
                                              final coords = await LocationService.getCurrentCoordinates();
                                              if (coords != null &&
                                                  coords['lat'] != null &&
                                                  coords['lng'] != null) {
                                                final lat = coords['lat']!;
                                                final lng = coords['lng']!;
                                                setState(() {
                                                  _locationLat = lat;
                                                  _locationLng = lng;
                                                  _isLocatingGps = false;
                                                });
                                                try {
                                                  final district = await LocationService.reverseGeocodeToDistrict(lat, lng);
                                                  if (district != null && district.isNotEmpty) {
                                                    if (_districtCtrl.text.trim().isEmpty || _districtCtrl.text == 'Colombo') {
                                                      _districtCtrl.text = district;
                                                    }
                                                  }
                                                } catch (_) {}
                                              } else {
                                                setState(() => _isLocatingGps = false);
                                              }
                                            } catch (_) {
                                              setState(() => _isLocatingGps = false);
                                            }
                                          },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(20),
                                        boxShadow: const [
                                          BoxShadow(
                                            color: Colors.black12,
                                            blurRadius: 4,
                                            offset: Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if (_isLocatingGps) ...[
                                            const SizedBox(
                                              width: 12,
                                              height: 12,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                                              ),
                                            ),
                                            const SizedBox(width: 5),
                                            Text(
                                              'Locating...',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.black,
                                              ),
                                            ),
                                          ] else ...[
                                            const Icon(Icons.my_location, size: 13, color: Colors.black),
                                            const SizedBox(width: 5),
                                            Text(
                                              'Use my location',
                                              style: GoogleFonts.dmSans(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.black,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Tap the map to set pin: ${_locationLat.toStringAsFixed(5)}, ${_locationLng.toStringAsFixed(5)}',
                            style: GoogleFonts.dmSans(
                              fontSize: 10.5,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    'NOTES FOR TECHNICIAN (OPTIONAL)',
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _notesCtrl,
                    maxLines: 2,
                    style: GoogleFonts.dmSans(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Add instructions, gate number, or special requests...',
                      hintStyle: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Bottom Row: Solid Black Pill + White Pill
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: InkWell(
                    onTap: _isSubmitting ? null : _onSubmit,
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: Center(
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Review & Confirm Details',
                                    style: GoogleFonts.dmSans(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                                ],
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
                      widget.onAction?.call('cancel', {});
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
                          'Cancel',
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
        ],
      ),
    );
  }
}


// ==========================================
// 3. BOOKING CONFIRMED CARD
// ==========================================
class BookingStatusCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const BookingStatusCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final bookingId = (data['bookingId'] ?? data['id'] ?? 'new').toString();
    final workerName = data['workerName']?.toString() ?? 'Technician';
    final jobTitle = data['jobTitle']?.toString() ?? 'Service Appointment';
    final dateStr = data['scheduledDate']?.toString() ?? 'Scheduled';
    final location = data['locationAddress']?.toString() ?? 'Colombo';
    final price = data['estimatedPrice'] ?? data['agreedPrice'];

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
          // 1. Top Row: Black circle checkmark + Title & Subtitle
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
                  child: Icon(Icons.check_circle_rounded, color: Colors.white, size: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Appointment Confirmed!',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '#$bookingId  •  $workerName',
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
            ],
          ),

          const SizedBox(height: 12),

          // 2. Middle Container: Pure white rounded box with details
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildRow(Icons.engineering_rounded, 'Service', jobTitle),
                const SizedBox(height: 8),
                _buildRow(Icons.calendar_today_rounded, 'Date', dateStr.split('T').first),
                const SizedBox(height: 8),
                _buildRow(Icons.location_on_outlined, 'Location', location),
                if (price != null) ...[
                  const SizedBox(height: 8),
                  _buildRow(Icons.account_balance_wallet_outlined, 'Price', 'Rs. $price'),
                ],
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 3. Bottom Row: Solid Black Pill + White Pill
          Row(
            children: [
              Expanded(
                flex: 3,
                child: InkWell(
                  onTap: () {
                    onAction?.call('navigate', '/bookings');
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
                        'View in Bookings',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
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
                    onAction?.call('dismiss', {});
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
                        'Done',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
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

  Widget _buildRow(IconData icon, String label, String val) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFF64748B)),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: GoogleFonts.dmSans(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF64748B),
          ),
        ),
        Expanded(
          child: Text(
            val,
            style: GoogleFonts.dmSans(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// ==========================================
// 4. BOOKING CONFIRMATION REVIEW CARD (AI REVIEW)
// ==========================================
class BookingConfirmationCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final void Function(String actionType, dynamic payload)? onAction;

  const BookingConfirmationCard({
    super.key,
    required this.data,
    this.onAction,
  });

  @override
  State<BookingConfirmationCard> createState() => _BookingConfirmationCardState();
}

class _BookingConfirmationCardState extends State<BookingConfirmationCard> {
  bool _isSubmitting = false;

  void _handleConfirm() {
    setState(() => _isSubmitting = true);
    final data = widget.data;
    final workerId = (data['workerId'] ?? data['id'] ?? '').toString();
    final workerName = data['workerName']?.toString() ?? 'Technician';
    final scheduledDate = (data['scheduledDate'] ?? data['date'] ?? 'Upcoming').toString().split('T').first;
    final jobTitle = data['jobTitle']?.toString() ?? data['category']?.toString() ?? 'Service Appointment';
    final location = data['locationAddress']?.toString() ?? 'Colombo';
    final phone = data['contactPhone']?.toString() ?? '';
    final priority = data['priority']?.toString() ?? data['urgency']?.toString() ?? 'Normal';
    final description = data['description']?.toString() ?? '';
    final notes = data['notes']?.toString() ?? description;

    final prompt = data['confirmPrompt']?.toString() ??
        "CONFIRM_BOOKING: Yes, please book worker ID $workerId ($workerName) for $scheduledDate. Priority: $priority. Service: $jobTitle. Description: $description. Location: $location. Phone: $phone. Notes: $notes";

    widget.onAction?.call('send_prompt', {
      'prompt': prompt,
      'action': 'create_booking',
      'workerId': workerId,
      'bookingData': data,
    });
  }

  void _handleCancel() {
    final data = widget.data;
    final workerName = data['workerName']?.toString() ?? 'Technician';
    final workerId = (data['workerId'] ?? data['id'] ?? '').toString();

    final prompt = data['cancelPrompt']?.toString() ??
        "CANCEL_BOOKING: Cancel this booking request for $workerName. I do not want to proceed.";

    widget.onAction?.call('send_prompt', {
      'prompt': prompt,
      'action': 'cancel_booking_request',
      'workerId': workerId,
    });
  }

  String? _resolveImageUrl(dynamic rawUrl) {
    if (rawUrl == null) return null;
    final url = rawUrl.toString().trim();
    if (url.isEmpty || url == 'null' || url == 'default') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    final base = ApiConfig.baseUrl;
    if (url.startsWith('/')) {
      return '$base$url';
    }
    return '$base/$url';
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    final bookingId = (data['bookingId'] ?? '').toString();
    final workerId = (data['workerId'] ?? data['id'] ?? '').toString();
    final workerName = data['workerName']?.toString() ?? 'Verified Technician';
    final category = data['category']?.toString() ?? 'Home Service';
    final jobTitle = data['jobTitle']?.toString() ?? category;
    final scheduledDate = (data['scheduledDate'] ?? data['date'] ?? '').toString().split('T').first;
    final locationAddress = data['locationAddress']?.toString() ?? 'Colombo';
    final contactPhone = data['contactPhone']?.toString() ?? '';
    final hourlyRate = data['hourlyRate'];
    final priority = data['priority']?.toString() ?? data['urgency']?.toString() ?? 'Normal';
    final description = data['description']?.toString() ?? '';
    final notes = data['notes']?.toString();
    final rawAvatar = data['workerAvatar'] ??
        data['workerProfileImage'] ??
        data['profileImage'] ??
        data['avatarUrl'];
    final avatarUrl = _resolveImageUrl(rawAvatar);

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
          // 1. Top Row: Black circular avatar + Title & Subtitle
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
                  child: avatarUrl != null && avatarUrl.isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, error, stackTrace) => const Center(
                            child: Icon(Icons.calendar_today_rounded, color: Colors.white, size: 22),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.calendar_today_rounded, color: Colors.white, size: 22),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bookingId.isNotEmpty ? 'Booking #$bookingId' : 'Confirm Booking',
                      style: GoogleFonts.dmSans(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$workerName  •  $jobTitle',
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
            ],
          ),

          const SizedBox(height: 12),

          // 2. Middle Container: Pure white rounded box with details
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildDetailRow(Icons.engineering_rounded, 'Technician', '$workerName${workerId.isNotEmpty ? " (ID: #$workerId)" : ""}'),
                const SizedBox(height: 8),
                _buildDetailRow(Icons.calendar_today_rounded, 'Date', scheduledDate.isNotEmpty ? scheduledDate : 'Upcoming appointment'),
                const SizedBox(height: 8),
                _buildDetailRow(Icons.flag_rounded, 'Priority', priority),
                const SizedBox(height: 8),
                _buildDetailRow(Icons.construction_rounded, 'Service', jobTitle),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildDetailRow(Icons.description_outlined, 'Problem', description),
                ],
                const SizedBox(height: 8),
                _buildDetailRow(Icons.location_on_outlined, 'Location', locationAddress),
                if (contactPhone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildDetailRow(Icons.phone_outlined, 'Contact', contactPhone),
                ],
                if (hourlyRate != null) ...[
                  const SizedBox(height: 8),
                  _buildDetailRow(Icons.payments_outlined, 'Rate', 'Rs. $hourlyRate / hr'),
                ],
                if (notes != null && notes.isNotEmpty && notes != description) ...[
                  const SizedBox(height: 8),
                  _buildDetailRow(Icons.notes_rounded, 'Notes', notes),
                ],
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 3. Bottom Row: Solid Black Pill + White Pill
          Row(
            children: [
              Expanded(
                flex: 3,
                child: InkWell(
                  onTap: _isSubmitting ? null : _handleConfirm,
                  borderRadius: BorderRadius.circular(26),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Center(
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              'Confirm Booking',
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
                  onTap: _isSubmitting ? null : _handleCancel,
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
                        'Cancel',
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

  Widget _buildDetailRow(IconData icon, String label, String val) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: const Color(0xFF64748B)),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: GoogleFonts.dmSans(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF64748B),
          ),
        ),
        Expanded(
          child: Text(
            val,
            style: GoogleFonts.dmSans(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
