import json
import os
import zipfile
import fnmatch

def main():
    # Load version from manifest.chrome.json
    try:
        with open('manifest.chrome.json', 'r', encoding='utf-8') as f:
            manifest_chrome = json.load(f)
            version = manifest_chrome.get('version', 'unknown')
    except Exception as e:
        print(f"Erro ao ler manifest.chrome.json: {e}")
        return

    print(f"📦 Iniciando empacotamento do Buscador DJEN v{version}...")

    zip_chrome_name = f"djen_chrome_v{version}.zip"
    zip_firefox_name = f"djen_firefox_v{version}.zip"

    # Define exclusion patterns (applied to filenames and relative paths)
    excludes = [
        'manifest*.json',
        'empacotar.sh',
        'empacotar.py',
        'test.js',
        'test_sidebar.js',
        'refactor*.py',
        'extract_features.py',
        '*_backup.js',
        '*.bak',
        '*Cópia*',
        'dist_temp',
        '*.zip',
        '.git*',
        '.DS_Store'
    ]

    def should_exclude(path):
        parts = path.split(os.sep)
        for part in parts:
            for pattern in excludes:
                if fnmatch.fnmatch(part, pattern):
                    return True
        for pattern in excludes:
            if fnmatch.fnmatch(path, pattern):
                return True
        return False

    # Collect all files to include
    files_to_pack = []
    for root, dirs, files in os.walk('.'):
        # Modify dirs in-place to avoid traversing excluded directories
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        for file in files:
            full_path = os.path.join(root, file)
            # Remove leading './'
            rel_path = os.path.relpath(full_path, '.')
            if not should_exclude(rel_path):
                files_to_pack.append(rel_path)

    # 1. Package for Chrome
    print("🌐 Empacotando para Google Chrome...")
    try:
        if os.path.exists(zip_chrome_name):
            os.remove(zip_chrome_name)
        with zipfile.ZipFile(zip_chrome_name, 'w', zipfile.ZIP_DEFLATED) as z:
            # Add manifest.json under the name 'manifest.json'
            z.write('manifest.chrome.json', 'manifest.json')
            # Add all other files
            for file in files_to_pack:
                z.write(file, file)
        print(f"   - Gerado: {zip_chrome_name} ({os.path.getsize(zip_chrome_name) / 1024:.2f} KB)")
    except Exception as e:
        print(f"Erro ao criar zip do Chrome: {e}")

    # 2. Package for Firefox
    print("🦊 Empacotando para Firefox...")
    try:
        if os.path.exists(zip_firefox_name):
            os.remove(zip_firefox_name)
        with zipfile.ZipFile(zip_firefox_name, 'w', zipfile.ZIP_DEFLATED) as z:
            # Add manifest.json under the name 'manifest.json'
            z.write('manifest.firefox.json', 'manifest.json')
            # Add all other files
            for file in files_to_pack:
                z.write(file, file)
        print(f"   - Gerado: {zip_firefox_name} ({os.path.getsize(zip_firefox_name) / 1024:.2f} KB)")
    except Exception as e:
        print(f"Erro ao criar zip do Firefox: {e}")

    print("--------------------------------------------------")
    print("✅ Empacotamento concluído com sucesso!")
    print("--------------------------------------------------")

if __name__ == '__main__':
    main()
