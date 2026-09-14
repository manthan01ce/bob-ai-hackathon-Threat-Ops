import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remaining dark mode background leftovers
    content = content.replace('bg-[#161616]', 'bg-[#ffffff]')
    content = content.replace('hover:bg-[#1f1f1f]', 'hover:bg-[#edebe9]')
    content = content.replace('bg-[#181818]', 'bg-[#ffffff]')
    content = content.replace('bg-[#0d0d0d]', 'bg-[#ffffff]')
    content = content.replace('border-[#1e1e1e]', 'border-[#edebe9]')
    content = content.replace('backgroundColor: "#111"', 'backgroundColor: "#ffffff"')
    content = content.replace('border: "1px solid #3c3c3c"', 'border: "1px solid #edebe9"')
    content = content.replace('border: "1px solid #333"', 'border: "1px solid #edebe9"')
    content = content.replace('color: "#888"', 'color: "rgba(0,0,0,0.58)"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in glob.glob('frontend/src/**/*.tsx', recursive=True):
    process_file(filepath)

print("Theme cleanup applied successfully")
