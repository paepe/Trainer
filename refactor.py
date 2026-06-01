import os
import re

files = [
    "src/coach-dna/components/index.ts",
    "src/coach-dna/steps/Step01Identity.tsx",
    "src/coach-dna/steps/Step12Philosophy.tsx",
    "src/components/index.ts",
    "src/screens/auth/LoginScreen.tsx",
    "src/screens/auth/RegisterScreen.tsx",
    "src/screens/trainer/TrainerDashboardScreen.tsx",
    "src/screens/trainer/WorkoutPlanEditorScreen.tsx",
    "src/studio/components/CreateStudioView.tsx",
    "src/studio/components/ProtocolDetail.tsx",
    "src/studio/components/ProtocolsView.tsx",
    "src/studio/components/SharedAtoms.tsx",
    "src/studio/components/Sidebar.tsx",
    "src/studio/components/TeamView.tsx"
]

for file in files:
    if not os.path.exists(file): continue
    with open(file, 'r') as f:
        content = f.read()

    orig_content = content
    
    # 1. Tags
    content = content.replace('<Btn ', '<Button ')
    content = content.replace('<Btn>', '<Button>')
    content = content.replace('</Btn>', '</Button>')
    
    content = content.replace('<Field ', '<TextInput ')
    content = content.replace('<Field/>', '<TextInput/>')
    content = content.replace('<Field\n', '<TextInput\n')
    
    content = content.replace('<PillInput ', '<TextInput ')
    content = content.replace('<PillInput/>', '<TextInput/>')
    content = content.replace('<PillInput\n', '<TextInput\n')
    
    content = content.replace('<DNAField ', '<TextInput ')
    content = content.replace('<DNAField/>', '<TextInput/>')
    content = content.replace('<DNAField\n', '<TextInput\n')

    # 2. Imports Cleanup
    lines = content.split('\n')
    new_lines = []
    has_ui_imports = False
    
    for line in lines:
        if line.startswith('import '):
            if "from '@/ui'" in line:
                has_ui_imports = True
            elif '{' in line and '}' in line:
                imports_part = line[line.find('{')+1:line.find('}')]
                imports = [i.strip() for i in imports_part.split(',')]
                imports = [i for i in imports if i not in ('Btn', 'Field', 'Badge', 'PillInput', 'DNAField')]
                if imports:
                    line = line[:line.find('{')+1] + ' ' + ', '.join(imports) + ' ' + line[line.find('}'):]
                else:
                    continue
            else:
                if re.search(r'import\s+(PillInput|DNAField)\s+from', line):
                    continue
        elif line.startswith('export ') and ('DNAField' in line or 'PillInput' in line):
            continue
            
        new_lines.append(line)
        
    content = '\n'.join(new_lines)
    
    # 3. Add @/ui imports
    needs_ui = []
    if '<Button' in content or '</Button>' in content: needs_ui.append('Button')
    if '<TextInput' in content: needs_ui.append('TextInput')
    if '<Badge' in content or '</Badge>' in content: needs_ui.append('Badge')
    
    if needs_ui and not has_ui_imports:
        # insert after first imports
        idx = 0
        for i, l in enumerate(new_lines):
            if l.startswith('import React'):
                idx = i + 1
                break
        
        lines_out = new_lines[:idx] + [f"import {{ {', '.join(needs_ui)} }} from '@/ui';"] + new_lines[idx:]
        content = '\n'.join(lines_out)
        
    with open(file, 'w') as f:
        f.write(content)

print("Done")
