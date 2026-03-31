import os
import re
import glob

components_dir = r"c:\Users\Visitante\Desktop\Projectos de Github\Portf-lio\frontend\src"

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # App.tsx
    content = content.replace("selection:bg-amber-500/30 selection:text-slate-900 dark:selection:text-white", "selection:bg-app-primary/30 selection:text-app-text")
    
    # Text replacements
    content = content.replace("text-slate-900 dark:text-slate-100", "text-app-text")
    content = content.replace("text-slate-700 dark:text-slate-300", "text-app-text")
    content = content.replace("text-slate-600 dark:text-slate-400", "text-app-muted")
    content = content.replace("text-slate-500 dark:text-slate-400", "text-app-muted")
    content = content.replace("text-slate-600 dark:text-slate-500", "text-app-muted")
    content = content.replace("text-amber-600 dark:text-amber-500", "text-app-primary")
    content = content.replace("text-amber-600 dark:text-amber-400", "text-app-primary")
    content = content.replace("text-amber-700 dark:text-amber-300/90", "text-app-primary")
    content = content.replace("text-amber-700 dark:text-amber-300/80", "text-app-primary")
    
    # Hover text
    content = content.replace("hover:text-amber-600 dark:hover:text-amber-400", "hover:text-app-primary-hover")
    content = content.replace("hover:text-amber-500 dark:hover:text-amber-400", "hover:text-app-primary-hover")
    
    # Backgrounds
    content = content.replace("bg-white dark:bg-slate-950", "bg-app-surface")
    content = content.replace("bg-white dark:bg-slate-900", "bg-app-surface")
    content = content.replace("bg-slate-50 dark:bg-[#121212]", "bg-app-surface")
    content = content.replace("bg-slate-100 dark:bg-slate-900", "bg-app-surface-hover")
    content = content.replace("bg-slate-200 dark:bg-slate-800", "bg-app-surface-hover")
    content = content.replace("bg-slate-300 dark:bg-slate-600", "bg-app-muted")
    content = content.replace("bg-slate-100/50 dark:bg-slate-900/50", "bg-app-surface-hover/50")
    content = content.replace("bg-slate-200/80 dark:bg-slate-800/80", "bg-app-surface-hover/80")
    
    content = content.replace("bg-[#121212]", "bg-app-surface") # specific to dark hover in Hero
    content = content.replace("hover:bg-slate-50 dark:hover:bg-slate-800", "hover:bg-app-surface-hover")
    content = content.replace("hover:bg-slate-200 dark:hover:bg-slate-800", "hover:bg-app-surface-hover")
    
    # Borders
    content = content.replace("border-slate-300 dark:border-slate-800", "border-app-border")
    content = content.replace("border-slate-300 dark:border-slate-700/50", "border-app-border")
    content = content.replace("border-slate-200 dark:border-slate-800/50", "border-app-border")
    content = content.replace("border-slate-200 dark:border-slate-700", "border-app-border")
    content = content.replace("border-slate-200 dark:border-slate-800", "border-app-border")
    content = content.replace("border-slate-50 dark:border-[#0a0a0a]", "border-app-bg")
    
    # Special button logic
    content = content.replace("hover:border-amber-500 hover:text-amber-500 dark:hover:border-amber-500 dark:hover:text-amber-400", "hover:border-app-primary hover:text-app-primary")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

tsx_files = glob.glob(os.path.join(components_dir, '**', '*.tsx'), recursive=True)
for file in tsx_files:
    replace_in_file(file)

print("Done replacing.")
