import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Layout changes
    # Canvas background
    content = content.replace('bg-[#000]', 'bg-[#f2f0eb]')
    content = content.replace('bg-black', 'bg-[#f2f0eb]')
    content = content.replace('bg-[#050505]', 'bg-[#1E3932]') # sidebar
    content = content.replace('bg-[#1a1a1a]', 'bg-[#ffffff]') # cards
    content = content.replace('bg-[#111]', 'bg-[#ffffff]') # secondary cards
    content = content.replace('bg-[#0a0a0a]', 'bg-[#edebe9]') # inner cards
    content = content.replace('bg-[#222]', 'bg-[#ffffff]') 
    content = content.replace('bg-[#333]', 'bg-[#edebe9]') 
    content = content.replace('bg-[#262626]', 'bg-[#edebe9]') 
    
    # Text changes
    content = content.replace('text-white', 'text-black/87')
    content = content.replace('text-[#bbbbbb]', 'text-black/58')
    content = content.replace('text-[#888]', 'text-black/58')
    content = content.replace('text-[#7e7e7e]', 'text-black/58')
    content = content.replace('text-[#aaa]', 'text-black/58')
    content = content.replace('text-[#555]', 'text-black/58')
    
    # Border changes
    content = content.replace('border-[#3c3c3c]', 'border-[#edebe9]')
    content = content.replace('border-[#333]', 'border-[#edebe9]')
    content = content.replace('border-[#444]', 'border-[#edebe9]')
    content = content.replace('border-[#2a2a2a]', 'border-[#edebe9]')
    content = content.replace('border-[#1a1a1a]', 'border-[#edebe9]')
    
    # Button colors
    # Primary blue -> Green Accent
    content = content.replace('bg-[#1c69d4]', 'bg-[#00754A]')
    content = content.replace('hover:bg-[#0066b1]', 'hover:bg-[#006241]')
    content = content.replace('border-[#1c69d4]', 'border-[#00754A]')
    content = content.replace('text-[#1c69d4]', 'text-[#00754A]')
    
    # Pill buttons
    content = re.sub(r'px-(\d+(?:\.\d+)?) py-(\d+(?:\.\d+)?)', r'px-\1 py-\2 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out', content)
    
    # Cards
    content = content.replace('border border-[#edebe9] p-3', 'border border-[#edebe9] p-3 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]')
    content = content.replace('border border-[#edebe9] p-4', 'border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]')
    content = content.replace('border border-[#edebe9] p-5', 'border border-[#edebe9] p-5 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]')

    # Sidebar adjustments
    content = re.sub(r'<aside([^>]+)bg-\[#1E3932\]', r'<aside\1bg-[#1E3932] text-white', content)
    
    # Fix Sidebar NavItem text-black to text-white (since it's on dark background now)
    content = content.replace('text-black/58 hover:bg-[#151515] hover:text-black/87', 'text-white/70 hover:bg-[#006241] hover:text-white')
    content = content.replace('text-black/87 tracking-wider', 'text-white/90 tracking-wider')

    # Fix button text inside dark areas that got replaced
    content = content.replace('bg-[#00754A] text-black/87', 'bg-[#00754A] text-white')
    content = content.replace('bg-[#00754A] hover:bg-[#006241] text-black/87', 'bg-[#00754A] hover:bg-[#006241] text-white')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in glob.glob('frontend/src/**/*.tsx', recursive=True):
    process_file(filepath)

print("Theme applied successfully")
