import re

with open('App/lib/screens/onboarding_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove SingleTickerProviderStateMixin and animation vars
content = re.sub(r'with SingleTickerProviderStateMixin \{.*?(?=  int _step = 0;)', '{', content, flags=re.DOTALL)
content = content.replace('int _step = 0;', 'int _step = 1;')
content = content.replace('bool _showForm = false;', '')

# Fix initState
init_state_pattern = r'  @override\n  void initState\(\) \{[\s\S]*?super\.initState\(\);[\s\S]*?_nameController\.text = currentUser\?\.name \?\? \'\';[\s\S]*?(?=  @override\n  void dispose\(\))'
new_init_state = '''  @override
  void initState() {
    super.initState();
    final currentUser = AuthService().currentUser;
    _nameController.text = currentUser?.name ?? '';
  }

'''
content = re.sub(init_state_pattern, new_init_state, content)

# Fix dispose
dispose_pattern = r'  @override\n  void dispose\(\) \{[\s\S]*?super\.dispose\(\);\n  \}'
new_dispose = '''  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _houseNoController.dispose();
    _streetController.dispose();
    _areaController.dispose();
    super.dispose();
  }'''
content = re.sub(dispose_pattern, new_dispose, content)

with open('App/lib/screens/onboarding_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)
