import os
import argparse
from datetime import datetime

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Index of {directory}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
        tr:hover {{ background-color: #f5f5f5; }}
    </style>
</head>
<body>
    <h2>Index of {directory}</h2>
    <table>
        <tr>
            <th>Name</th>
            <th>Last Modified</th>
            <th>Type</th>
        </tr>
        <tr>
            <td><a href="../">Parent Directory</a></td>
            <td>-</td>
            <td>Directory</td>
        </tr>
        {items}
    </table>
</body>
</html>
"""

def generate_index(directory):
    """Generate an index.html file for the given directory."""
    # Get all items in the directory
    items = os.listdir(directory)
    
    # Separate directories and files
    dirs = [item for item in items if os.path.isdir(os.path.join(directory, item))]
    files = [item for item in items if os.path.isfile(os.path.join(directory, item)) and item != 'index.html']
    
    # Sort directories and files
    dirs.sort()
    files.sort()
    
    # Generate HTML rows for all items
    rows = []
    
    # Add directories first
    for dirname in dirs:
        path = os.path.join(directory, dirname)
        modified = datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d %H:%M:%S')
        rows.append(f'''
        <tr>
            <td><a href="{dirname}/">{dirname}/</a></td>
            <td>{modified}</td>
            <td>Directory</td>
        </tr>''')
    
    # Add files
    for filename in files:
        path = os.path.join(directory, filename)
        modified = datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d %H:%M:%S')
        rows.append(f'''
        <tr>
            <td><a href="{filename}">{filename}</a></td>
            <td>{modified}</td>
            <td>File</td>
        </tr>''')
    
    # Generate the complete HTML
    html = HTML_TEMPLATE.format(
        directory=os.path.basename(os.path.abspath(directory)) or '/',
        items='\n'.join(rows)
    )
    
    # Write the index.html file
    with open(os.path.join(directory, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    
    # Recursively process subdirectories
    for dirname in dirs:
        try:
            generate_index(os.path.join(directory, dirname))
        except Exception as e:
            print(f"Error processing directory {dirname}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Generate directory index files')
    parser.add_argument('directory', help='Directory to index')
    args = parser.parse_args()
    
    if not os.path.isdir(args.directory):
        print(f"Error: {args.directory} is not a directory")
        return
    
    generate_index(args.directory)
    print(f"Successfully generated index files in {args.directory}")

if __name__ == '__main__':
    main()