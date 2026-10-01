const fs = require('fs'); 
const content = fs.readFileSync('Frontend/src/ResidentProfile.jsx', 'utf8'); 
const newContent = content.replace(/\{\/\* TAB: Become Worker \(Disabled - account must be deleted to switch roles\) \*\/\}[\s\S]*?\{\/\* END OF TABS \*\//, ''); 
fs.writeFileSync('Frontend/src/ResidentProfile.jsx', newContent);
