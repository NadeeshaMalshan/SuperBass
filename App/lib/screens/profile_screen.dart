import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/auth_user.dart';
import 'join_screen.dart';
import 'placeholder_screens.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AuthUser?>(
      valueListenable: AuthService().currentUserNotifier,
      builder: (context, user, child) {
        if (user == null) {
          // If the session hasn't loaded yet
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          appBar: AppBar(
            title: const Text(
              "My Profile",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24),
            ),
            centerTitle: false,
            elevation: 0,
            backgroundColor: Colors.transparent,
            foregroundColor: Theme.of(context).textTheme.bodyLarge?.color,
          ),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // --- Profile Header ---
                  _buildProfileHeader(user),
                  const SizedBox(height: 32),

                  // --- Worker Mode Banner ---
                  if (!user.isWorker) ...[
                    const _WorkerModeBanner(),
                    const SizedBox(height: 32),
                  ],

                  // --- Menu Options ---
                  const _ProfileMenu(),
                  const SizedBox(height: 40), // Bottom padding
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(AuthUser user) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.yellow.shade700, width: 3),
          ),
          child: _buildRobustAvatar(user.picture, user.name),
        ),
        const SizedBox(height: 20),
        Text(
          user.name,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            "${user.activeRole} • ${user.email}",
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRobustAvatar(String? photoUrl, String name) {
    return _RobustAvatar(photoUrl: photoUrl, name: name);
  }
}

class _RobustAvatar extends StatefulWidget {
  final String? photoUrl;
  final String name;

  const _RobustAvatar({required this.photoUrl, required this.name});

  @override
  State<_RobustAvatar> createState() => _RobustAvatarState();
}

class _RobustAvatarState extends State<_RobustAvatar> {
  bool _hasError = false;

  @override
  void didUpdateWidget(_RobustAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.photoUrl != widget.photoUrl) {
      _hasError = false; // Reset error state if the URL changes
    }
  }

  @override
  Widget build(BuildContext context) {
    final String initial = widget.name.isNotEmpty 
        ? widget.name.substring(0, 1).toUpperCase() 
        : 'U';
    
    final Widget fallbackAvatar = CircleAvatar(
      radius: 50,
      backgroundColor: Colors.yellow.shade700,
      child: Text(
        initial,
        style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );

    if (widget.photoUrl == null || widget.photoUrl!.isEmpty || _hasError) {
      return fallbackAvatar;
    }

    return ClipOval(
      child: Image.network(
        widget.photoUrl!,
        width: 100,
        height: 100,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _hasError = true;
              });
            }
          });
          return fallbackAvatar;
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return const SizedBox(
            width: 100,
            height: 100,
            child: Center(
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        },
      ),
    );
  }

}

// --- Worker Mode Banner Widget ---
class _WorkerModeBanner extends StatelessWidget {
  const _WorkerModeBanner();

  void _handleSwitchToWorker(BuildContext context) {
    print("Tapped Switch to Worker Mode");
    // Using a dialog for a clean, modern user interaction flow.
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text("Worker Mode"),
        content: const Text("This feature will guide you through the worker registration and onboarding process. Ready to start?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const WorkerOnboardingScreen()),
              );
            },
            child: const Text("Get Started"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.grey.shade900, Colors.black87],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => _handleSwitchToWorker(context),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.yellow.shade700.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.handyman, color: Colors.yellow.shade700, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Switch to Worker Mode",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "Offer your skills and get jobs in your area.",
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 13,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, color: Colors.white, size: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- Interactive Profile Menu Widget ---
class _ProfileMenu extends StatelessWidget {
  const _ProfileMenu();

  void _navigateToScreen(BuildContext context, String title) {
    print('Tapped $title');
    Widget targetScreen;
    switch (title) {
      case "Edit Profile":
        targetScreen = const EditProfileScreen();
        break;
      case "Saved Addresses":
        targetScreen = const SavedAddressesScreen();
        break;
      case "Privacy & Security":
        targetScreen = const PrivacySecurityScreen();
        break;
      case "Help & Support":
        targetScreen = const HelpSupportScreen();
        break;
      default:
        return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => targetScreen),
    );
  }

  void _handleSignOut(BuildContext context) async {
    // 1. Show a loading indicator during the logout process
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    
    // 2. Perform the async API logout logic via AuthService
    await AuthService().logout();
    
    // 3. Complete navigation and pop the loading dialog by replacing the entire navigation stack
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const JoinScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            _MenuTile(
              icon: Icons.edit_outlined,
              title: "Edit Profile",
              onTap: () => _navigateToScreen(context, "Edit Profile"),
            ),
            const _MenuDivider(),
            _MenuTile(
              icon: Icons.location_on_outlined,
              title: "Saved Addresses",
              onTap: () => _navigateToScreen(context, "Saved Addresses"),
            ),
            const _MenuDivider(),
            _MenuTile(
              icon: Icons.shield_outlined,
              title: "Privacy & Security",
              onTap: () => _navigateToScreen(context, "Privacy & Security"),
            ),
            const _MenuDivider(),
            _MenuTile(
              icon: Icons.help_outline,
              title: "Help & Support",
              onTap: () => _navigateToScreen(context, "Help & Support"),
            ),
            const _MenuDivider(),
            _MenuTile(
              icon: Icons.exit_to_app_rounded,
              title: "Sign Out",
              isDestructive: true,
              onTap: () => _handleSignOut(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool isDestructive;

  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultColor = isDark ? Colors.white : Colors.black87;
    final color = isDestructive ? Colors.redAccent : defaultColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDestructive
                      ? Colors.red.withOpacity(0.1)
                      : Colors.grey.withOpacity(isDark ? 0.2 : 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: color,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (!isDestructive)
                Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 68.0, right: 20.0),
      child: Divider(
        height: 1, 
        thickness: 1, 
        color: Theme.of(context).dividerColor.withOpacity(0.1)
      ),
    );
  }
}
