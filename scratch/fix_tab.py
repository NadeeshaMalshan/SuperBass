import re

file_path = r'D:\git\SuperBass\Frontend\src\ResidentProfile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken className
broken_str = """            <div
              className={m3-drawer-item }
              onClick={() => setActiveTab('verify')}
            >"""

fixed_str = """            <div
              className={`m3-drawer-item ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >"""

if broken_str in content:
    content = content.replace(broken_str, fixed_str)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed the broken className successfully!")
else:
    print("Could not find the broken className.")
