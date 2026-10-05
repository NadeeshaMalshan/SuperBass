with open('App/lib/screens/onboarding_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import 'dart:math' as math;\n", "")
content = content.replace("import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';\n", "")
content = content.replace("value: _selectedProvince,", "initialValue: _selectedProvince,")
content = content.replace("value: _selectedDistrict,", "initialValue: _selectedDistrict,")

with open('App/lib/screens/onboarding_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)
