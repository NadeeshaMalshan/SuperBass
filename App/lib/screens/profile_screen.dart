import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/auth_user.dart';
import '../theme/app_colors.dart';
import 'join_screen.dart';
import 'placeholder_screens.dart';
import '../widgets/verified_badge.dart';
import '../widgets/verification_form.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isVerified = false;
  bool _isUpdatingProfile = false;

  Future<void> _updateProfilePicture() async {
    if (_isUpdatingProfile) return;
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 1024,
    );
    if (image == null) return;

    _isUpdatingProfile = true;
    if (mounted) setState(() {});

    try {
      final bytes = await image.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      final user = AuthService().currentUserNotifier.value;
      if (user != null) {
        final success = await ApiService().updateProfile(user.email, {
          "picture": base64Image,
        });
        if (mounted) {
          if (success) {
            // Update the AuthUser object
            final updatedUser = user.copyWith(picture: base64Image);
            AuthService().currentUserNotifier.value = updatedUser;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Profile picture updated successfully')),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to update profile picture')),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      _isUpdatingProfile = false;
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AuthUser?>(
      valueListenable: AuthService().currentUserNotifier,
      builder: (context, user, child) {
        if (user == null) {
          return const JoinScreen();
        }

        final isVerified = user.isVerified || _isVerified;

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

                  // --- Verify Account Section ---
                  if (!isVerified)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 32.0),
                      child: VerificationForm(
                        onVerifySuccess: () {
                          setState(() {
                            _isVerified = true;
                          });
                        },
                      ),
                    ),

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
    final isVerified = user.isVerified || _isVerified;
    return Column(
      children: [
        GestureDetector(
          onTap: _updateProfilePicture,
          child: _isUpdatingProfile
              ? const CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                )
              : _buildRobustAvatar(user.picture, user.name),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              user.name,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            if (isVerified) const VerifiedBadge(size: 22),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.grey.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            "${user.activeRole} \u2022 ${user.email}",
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
}


Widget _buildRobustAvatar(String? photoUrl, String name) {
  return _RobustAvatar(photoUrl: photoUrl, name: name);
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

    if (widget.photoUrl!.startsWith('data:image/')) {
      try {
        final base64Str = widget.photoUrl!.split(',').last;
        final bytes = base64Decode(base64Str);
        return ClipOval(
          child: Image.memory(
            bytes,
            width: 100,
            height: 100,
            fit: BoxFit.cover,
          ),
        );
      } catch (e) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            setState(() {
              _hasError = true;
            });
          }
        });
        return fallbackAvatar;
      }
    } else {
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
}

class _ProfileMenu extends StatelessWidget {
  const _ProfileMenu();

  void _navigateToScreen(BuildContext context, String title) {
    debugPrint('Tapped $title');
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

  Future<void> _handleSignOut(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Log Out',
          style: GoogleFonts.dmSans(
            fontWeight: FontWeight.w800,
            color: AppColors.onSurface,
          ),
        ),
        content: Text(
          'Are you sure you want to log out of SuperBass?',
          style: GoogleFonts.dmSans(
            fontSize: 14,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancel',
              style: GoogleFonts.dmSans(
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              'Log Out',
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    // Show loading indicator during logout
    if (context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    // Perform async API logout logic via AuthService
    await AuthService().logout();

    // Complete navigation and pop the logging dialog by replacing the entire navigation stack
    if (context.mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil(
        '/join',
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
            color: Colors.grey.withValues(alpha: 0.08),
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

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 68.0, right: 20.0),
      child: Divider(
        height: 1,
        thickness: 1,
        color: Theme.of(context).dividerColor.withValues(alpha: 0.1)
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
    final color = isDestructive
        ? Colors.red.shade600
        : Theme.of(context).textTheme.bodyLarge?.color;
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isDestructive
              ? Colors.red.withValues(alpha: 0.08)
              : Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          icon,
          color: isDestructive
              ? Colors.red.shade600
              : Theme.of(context).colorScheme.primary,
          size: 20,
        ),
      ),
      title: Text(
        title,
        style: GoogleFonts.dmSans(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: color?.withValues(alpha: 0.5),
        size: 20,
      ),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
    );
  }
}