import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../models/auth_user.dart';
import 'package:shared_preferences/shared_preferences.dart';

// -----------------------------------------------------------------------------
// EDIT PROFILE SCREEN
// -----------------------------------------------------------------------------
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService().currentUserNotifier.value;
    _nameController = TextEditingController(text: user?.name ?? '');
    _phoneController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final user = AuthService().currentUserNotifier.value;
    if (user != null) {
      final success = await ApiService().updateProfile(user.email, {
        "Name": _nameController.text.trim(),
        "PhoneNo": _phoneController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? "Profile updated successfully." : "Failed to update profile."),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
        if (success) {
          // Ideally update AuthService here if needed
          Navigator.pop(context);
        }
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
                validator: (val) => (val == null || val.isEmpty) ? 'Please enter your name' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _saveChanges,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                child: _isLoading 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)) 
                    : const Text('Save Changes', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// SAVED ADDRESSES SCREEN
// -----------------------------------------------------------------------------
class SavedAddressesScreen extends StatefulWidget {
  const SavedAddressesScreen({super.key});

  @override
  State<SavedAddressesScreen> createState() => _SavedAddressesScreenState();
}

class _SavedAddressesScreenState extends State<SavedAddressesScreen> {
  String? _currentAddress;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Assuming backend only stores a single address per Resident,
    // we fetch it or just allow setting the primary address.
    _currentAddress = "Loading...";
    _fetchAddress();
  }

  Future<void> _fetchAddress() async {
    // There's no getProfile in ApiService yet, so we'll just mock it or assume empty
    // for this UI implementation unless we add a fetch. 
    setState(() {
      _currentAddress = "No saved address found.";
    });
  }

  void _showAddAddressSheet() {
    final controller = TextEditingController();
    String? selectedProvince;
    String? selectedDistrict;
    
    final sriLankaGeoData = {
      "Western": ["Colombo", "Gampaha", "Kalutara"],
      "Central": ["Kandy", "Matale", "Nuwara Eliya"],
      "Southern": ["Galle", "Matara", "Hambantota"],
      "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
      "Eastern": ["Trincomalee", "Batticaloa", "Ampara"],
      "North Western": ["Kurunegala", "Puttalam"],
      "North Central": ["Anuradhapura", "Polonnaruwa"],
      "Uva": ["Badulla", "Monaragala"],
      "Sabaragamuwa": ["Ratnapura", "Kegalle"]
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (BuildContext ctx, StateSetter setSheetState) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 16, right: 16, top: 16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Update Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  decoration: const InputDecoration(labelText: 'Street Address', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Province', border: OutlineInputBorder()),
                  value: selectedProvince,
                  items: sriLankaGeoData.keys.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                  onChanged: (val) {
                    setSheetState(() {
                      selectedProvince = val;
                      selectedDistrict = null; // reset district
                    });
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'District', border: OutlineInputBorder()),
                  value: selectedDistrict,
                  items: (selectedProvince == null ? <String>[] : sriLankaGeoData[selectedProvince]!)
                      .map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                  onChanged: selectedProvince == null ? null : (val) {
                    setSheetState(() {
                      selectedDistrict = val;
                    });
                  },
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    if (controller.text.trim().isEmpty || selectedProvince == null || selectedDistrict == null) return;
                    Navigator.pop(ctx);
                    setState(() => _isLoading = true);
                    final user = AuthService().currentUserNotifier.value;
                    if (user != null) {
                      final fullAddress = "${controller.text.trim()}, $selectedDistrict, $selectedProvince";
                      final success = await ApiService().updateProfile(user.email, {
                        "Address": fullAddress,
                      });
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(success ? "Address saved!" : "Failed to save.")),
                        );
                        if (success) {
                          setState(() => _currentAddress = fullAddress);
                        }
                      }
                    }
                    if (mounted) setState(() => _isLoading = false);
                  },
                  child: const Text('Save Address'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saved Addresses')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                ListTile(
                  leading: const Icon(Icons.location_on),
                  title: const Text("Primary Address"),
                  subtitle: Text(_currentAddress ?? "No address"),
                  trailing: IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: _showAddAddressSheet,
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddAddressSheet,
        icon: const Icon(Icons.add),
        label: const Text('Update'),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// PRIVACY & SECURITY SCREEN
// -----------------------------------------------------------------------------
class PrivacySecurityScreen extends StatefulWidget {
  const PrivacySecurityScreen({super.key});

  @override
  State<PrivacySecurityScreen> createState() => _PrivacySecurityScreenState();
}

class _PrivacySecurityScreenState extends State<PrivacySecurityScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  Future<void> _updatePassword() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Simulate API call since the .NET backend doesn't have a change-password endpoint
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated successfully (Mock).'), backgroundColor: Colors.green),
      );
    }
  }

  Future<void> _deleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text('Are you sure you want to delete your account? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true), 
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final user = AuthService().currentUserNotifier.value;
      if (user != null) {
        final success = await ApiService().deleteProfile(user.email);
        if (mounted) {
          setState(() => _isLoading = false);
          if (success) {
            AuthService().logout();
            Navigator.of(context).popUntil((route) => route.isFirst);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to delete account.')),
            );
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy & Security')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Change Password', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Current Password', border: OutlineInputBorder()),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'New Password', border: OutlineInputBorder()),
                    validator: (v) => v!.length < 6 ? 'Min 6 chars' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Confirm Password', border: OutlineInputBorder()),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _updatePassword,
              child: const Text('Update Password'),
            ),
            const Divider(height: 64),
            const Text('Danger Zone', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red)),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _isLoading ? null : _deleteAccount,
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
              child: const Text('Delete Account'),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// HELP & SUPPORT SCREEN
// -----------------------------------------------------------------------------
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: const Center(child: Text('Please contact support@superbass.com')),
    );
  }
}

// -----------------------------------------------------------------------------
// WORKER ONBOARDING SCREEN
// -----------------------------------------------------------------------------
class WorkerOnboardingScreen extends StatefulWidget {
  const WorkerOnboardingScreen({super.key});

  @override
  State<WorkerOnboardingScreen> createState() => _WorkerOnboardingScreenState();
}

class _WorkerOnboardingScreenState extends State<WorkerOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final _areaController = TextEditingController(text: "Colombo");
  final _radiusController = TextEditingController(text: "10");
  final _rateController = TextEditingController();
  
  String _pricingModel = "Hourly";
  bool _isLoading = false;

  @override
  void dispose() {
    _descController.dispose();
    _areaController.dispose();
    _radiusController.dispose();
    _rateController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    final user = AuthService().currentUserNotifier.value;
    
    if (user != null) {
      final worker = await ApiService().becomeWorker(
        email: user.email,
        description: _descController.text.trim(),
        primaryServiceArea: _areaController.text.trim(),
        coverageRadiusKm: double.tryParse(_radiusController.text.trim()) ?? 10.0,
        pricingModel: _pricingModel,
        hourlyRate: double.tryParse(_rateController.text.trim()),
        skills: [
          {"SkillName": "General Handyman", "ExperienceYears": 1}
        ],
      );
      
      if (mounted) {
        if (worker != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Successfully upgraded to Worker!'), backgroundColor: Colors.green),
          );
          // Update local session correctly without breaking the token
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool('isWorker', true);
          await prefs.setString('activeRole', 'Worker');
          
          AuthService().currentUserNotifier.value = AuthUser(
            token: user.token,
            email: user.email,
            name: user.name,
            picture: user.picture,
            isNewUser: user.isNewUser,
            isWorker: true,
            activeRole: 'Worker',
            workerId: worker.id,
          );
          if (mounted) Navigator.pop(context);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to register as worker.'), backgroundColor: Colors.red),
          );
        }
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Worker Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Complete your profile to start receiving jobs in your area.',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Bio / Description', border: OutlineInputBorder()),
                maxLines: 3,
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _areaController,
                decoration: const InputDecoration(labelText: 'Primary Service Area', border: OutlineInputBorder()),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _radiusController,
                decoration: const InputDecoration(labelText: 'Coverage Radius (km)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _pricingModel,
                decoration: const InputDecoration(labelText: 'Pricing Model', border: OutlineInputBorder()),
                items: ["Hourly", "Fixed", "Daily"].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (val) => setState(() => _pricingModel = val!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _rateController,
                decoration: const InputDecoration(labelText: 'Base Rate (\$)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                child: _isLoading 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)) 
                    : const Text('Complete Registration', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
