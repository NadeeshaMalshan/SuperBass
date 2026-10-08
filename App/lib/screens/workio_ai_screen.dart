import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/ai_service.dart';
import '../services/auth_service.dart';

class WorkioAiScreen extends StatefulWidget {
  final Function(int tabIndex)? onNavigateToTab;

  const WorkioAiScreen({
    super.key,
    this.onNavigateToTab,
  });

  @override
  State<WorkioAiScreen> createState() => _WorkioAiScreenState();
}

class _WorkioAiScreenState extends State<WorkioAiScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  String? _selectedEmergencyService = 'AC repair';
  bool _isLoading = false;
  String _conversationId = 'conv_${DateTime.now().millisecondsSinceEpoch}';

  late List<Map<String, dynamic>> _messages;

  @override
  void initState() {
    super.initState();
    _initChat();
  }

  void _initChat() {
    _conversationId = 'conv_${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now();
    final timeStr = _formatTime(now);

    _messages = [
      {
        'sender': 'assistant',
        'isWelcome': true,
        'time': timeStr,
        'text':
            'Hi! I can help you find workers, create a community post, view your bookings or rate technicians. What would you like to do?',
      },
    ];
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $ampm';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final clean = text.trim();
    if (clean.isEmpty) return;

    _inputController.clear();
    final now = DateTime.now();

    setState(() {
      _messages.add({
        'sender': 'user',
        'isWelcome': false,
        'time': _formatTime(now),
        'text': clean,
      });
      _isLoading = true;
    });
    _scrollToBottom();

    final user = AuthService().currentUser;
    final email = user?.email ?? 'guest@superbass.lk';
    final role = user?.activeRole ?? 'Resident';

    try {
      final res = await AiService().sendMessage(
        message: clean,
        email: email,
        userType: role,
        conversationId: _conversationId,
      );

      final respData = res['response'] as Map<String, dynamic>?;
      final replyMsg = respData?['message']?.toString() ??
          'I am processing your request. Please let me know how else I can help you.';

      if (mounted) {
        setState(() {
          _isLoading = false;
          _messages.add({
            'sender': 'assistant',
            'isWelcome': false,
            'time': _formatTime(DateTime.now()),
            'text': replyMsg,
            'card_data': respData?['card_data'],
            'response_type': respData?['response_type'],
          });
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _messages.add({
            'sender': 'assistant',
            'isWelcome': false,
            'time': _formatTime(DateTime.now()),
            'text': 'I encountered an error connecting to the agent network. Please try again.',
          });
        });
        _scrollToBottom();
      }
    }
  }

  void _handleActionCardTap(String actionKey) {
    if (actionKey == 'find_workers') {
      if (widget.onNavigateToTab != null) {
        Navigator.pop(context);
        widget.onNavigateToTab!(0); // Find tab
      } else {
        _sendMessage('Find top-rated workers near me');
      }
    } else if (actionKey == 'create_post') {
      if (widget.onNavigateToTab != null) {
        Navigator.pop(context);
        widget.onNavigateToTab!(1); // Community tab
      } else {
        _sendMessage('I want to create a community service request post');
      }
    } else if (actionKey == 'see_bookings') {
      if (widget.onNavigateToTab != null) {
        Navigator.pop(context);
        widget.onNavigateToTab!(2); // Bookings tab
      } else {
        _sendMessage('Show my active bookings and schedule');
      }
    } else if (actionKey == 'rate_workers') {
      _sendMessage('How can I rate and review technicians for completed services?');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: _buildAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            // Chat Stream
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: _messages.length + (_isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildDatePill('Today'),
                        const SizedBox(height: 16),
                        _buildMessageItem(_messages[0]),
                      ],
                    );
                  }

                  if (index < _messages.length) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: _buildMessageItem(_messages[index]),
                    );
                  }

                  // Loading bubble
                  return Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: _buildLoadingBubble(),
                  );
                },
              ),
            ),

            // Bottom Section: Quick Actions, Emergency Services, and Input Bar
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      leadingWidth: 56,
      leading: Padding(
        padding: const EdgeInsets.only(left: 14),
        child: Center(
          child: InkWell(
            onTap: () => Navigator.pop(context),
            borderRadius: BorderRadius.circular(22),
            child: Container(
              width: 42,
              height: 42,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F3F5),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 16,
                color: Colors.black,
              ),
            ),
          ),
        ),
      ),
      titleSpacing: 8,
      title: Row(
        children: [
          // Black Circular Logo with White W
          Container(
            width: 38,
            height: 38,
            decoration: const BoxDecoration(
              color: Colors.black,
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(7),
            child: Image.asset(
              'assets/images/Workio_Logo_White_WithOut_Text.png',
              fit: BoxFit.contain,
              errorBuilder: (_, error, stackTrace) => const Center(
                child: Text(
                  'W',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Workio AI',
            style: GoogleFonts.dmSans(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.black,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Center(
            child: InkWell(
              onTap: () {
                setState(() {
                  _initChat();
                });
              },
              borderRadius: BorderRadius.circular(22),
              child: Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.add_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(
          color: const Color(0xFFF1F3F5),
          height: 1,
        ),
      ),
    );
  }

  Widget _buildDatePill(String text) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F3F5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          text,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildMessageItem(Map<String, dynamic> msg) {
    final isAssistant = msg['sender'] == 'assistant';
    final isWelcome = msg['isWelcome'] == true;

    if (!isAssistant) {
      // User outgoing message
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              msg['text'] ?? '',
              style: GoogleFonts.dmSans(
                fontSize: 14.5,
                color: Colors.white,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            msg['time'] ?? '',
            style: GoogleFonts.dmSans(
              fontSize: 11,
              color: const Color(0xFF94A3B8),
            ),
          ),
        ],
      );
    }

    // Assistant incoming message
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Small Circular Logo Avatar
        Container(
          width: 32,
          height: 32,
          margin: const EdgeInsets.only(top: 2),
          decoration: const BoxDecoration(
            color: Colors.black,
            shape: BoxShape.circle,
          ),
          padding: const EdgeInsets.all(6),
          child: Image.asset(
            'assets/images/Workio_Logo_White_WithOut_Text.png',
            fit: BoxFit.contain,
            errorBuilder: (_, error, stackTrace) => const Center(
              child: Text(
                'W',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),

        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bubble
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F3F5),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(20),
                    bottomLeft: Radius.circular(20),
                    bottomRight: Radius.circular(20),
                  ),
                ),
                child: Text(
                  msg['text'] ?? '',
                  style: GoogleFonts.dmSans(
                    fontSize: 14.5,
                    color: const Color(0xFF0F172A),
                    height: 1.45,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),

              // Embedded Action Cards (shown on welcome message)
              if (isWelcome) ...[
                const SizedBox(height: 10),
                _buildActionCard(
                  title: 'Find workers',
                  subtitle: 'Trusted workers near you',
                  icon: Icons.search_rounded,
                  onTap: () => _handleActionCardTap('find_workers'),
                ),
                _buildActionCard(
                  title: 'Create community post',
                  subtitle: 'Post your service needs',
                  icon: Icons.chat_bubble_outline_rounded,
                  onTap: () => _handleActionCardTap('create_post'),
                ),
                _buildActionCard(
                  title: 'See my bookings',
                  subtitle: 'Upcoming and past bookings',
                  icon: Icons.calendar_today_outlined,
                  onTap: () => _handleActionCardTap('see_bookings'),
                ),
                _buildActionCard(
                  title: 'Rate workers',
                  subtitle: 'Review completed services',
                  icon: Icons.star_outline_rounded,
                  onTap: () => _handleActionCardTap('rate_workers'),
                ),
              ],

              const SizedBox(height: 4),
              Text(
                msg['time'] ?? '',
                style: GoogleFonts.dmSans(
                  fontSize: 11,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F3F5),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              // Black Circular Icon Avatar
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),

              // Text info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.dmSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.dmSans(
                        fontSize: 12.5,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),

              // Chevron Right
              const Icon(
                Icons.chevron_right_rounded,
                size: 22,
                color: Color(0xFF64748B),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingBubble() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            color: Colors.black,
            shape: BoxShape.circle,
          ),
          padding: const EdgeInsets.all(6),
          child: Image.asset(
            'assets/images/Workio_Logo_White_WithOut_Text.png',
            fit: BoxFit.contain,
            errorBuilder: (_, error, stackTrace) => const Center(
              child: Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F3F5),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Workio AI is thinking...',
                style: GoogleFonts.dmSans(
                  fontSize: 13.5,
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomControls() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF1F3F5))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 10),

          // QUICK ACTIONS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'QUICK ACTIONS',
              style: GoogleFonts.dmSans(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildActionChip(
                  label: 'Recent posts',
                  onTap: () => _sendMessage('Show recent community service posts'),
                ),
                const SizedBox(width: 8),
                _buildActionChip(
                  label: 'Find craftsmen',
                  onTap: () => _sendMessage('Find top recommended craftsmen near me'),
                ),
                const SizedBox(width: 8),
                _buildActionChip(
                  label: 'My posts',
                  onTap: () => _sendMessage('Show my community posts and requests'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // EMERGENCY SERVICES
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'EMERGENCY SERVICES',
              style: GoogleFonts.dmSans(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildEmergencyChip('Plumber'),
                const SizedBox(width: 8),
                _buildEmergencyChip('Electrician'),
                const SizedBox(width: 8),
                _buildEmergencyChip('AC repair'),
                const SizedBox(width: 8),
                _buildEmergencyChip('Cleaner'),
                const SizedBox(width: 8),
                _buildEmergencyChip('Carpenter'),
                const SizedBox(width: 8),
                _buildEmergencyChip('Painter'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Input Bar with Send Button
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F3F5),
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: TextField(
                      controller: _inputController,
                      focusNode: _focusNode,
                      style: GoogleFonts.dmSans(
                        fontSize: 14.5,
                        color: Colors.black,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: _sendMessage,
                      decoration: InputDecoration(
                        hintText: 'Ask anything or create a post',
                        hintStyle: GoogleFonts.dmSans(
                          fontSize: 14,
                          color: const Color(0xFF64748B),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Solid Black Circular Send Button
                GestureDetector(
                  onTap: () => _sendMessage(_inputController.text),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Colors.black,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionChip({
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F3F5),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0F172A),
          ),
        ),
      ),
    );
  }

  Widget _buildEmergencyChip(String serviceName) {
    final bool isSelected = _selectedEmergencyService == serviceName;

    return InkWell(
      onTap: () {
        setState(() {
          _selectedEmergencyService = serviceName;
        });
        _sendMessage('I need an emergency $serviceName immediately');
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.black : const Color(0xFFF1F3F5),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          serviceName,
          style: GoogleFonts.dmSans(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
      ),
    );
  }
}
