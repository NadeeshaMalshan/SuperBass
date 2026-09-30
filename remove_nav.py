import os
import re

dir_path = r'Frontend\src'
removed_count = 0

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Skip M3TopNavbar.jsx and main.jsx
            if file in ['M3TopNavbar.jsx', 'main.jsx']:
                continue
            
            original_content = content
            
            # Remove import
            content = re.sub(r'import\s+M3TopNavbar\s+from\s+[\'\"].*?M3TopNavbar.*?[\'\"];?\n?', '', content)
            
            # Remove component
            content = re.sub(r'<M3TopNavbar\b[^>]*/>\n?', '', content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Removed from {file}')
                removed_count += 1

print(f'Done. Removed from {removed_count} files.')
