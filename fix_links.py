import os
import re

files = ["overview.html", "proxies.html", "rules.html", "connections.html", "logs.html", "config.html"]
mapping = {
    "Overview": "overview.html",
    "Dashboard": "overview.html",
    "Status": "overview.html",
    "Proxies": "proxies.html",
    "Rules": "rules.html",
    "Connections": "connections.html",
    "Conns": "connections.html",
    "Logs": "logs.html",
    "Config": "config.html",
    "Settings": "config.html"
}

for filename in files:
    path = os.path.join("dashboard", filename)
    if not os.path.exists(path):
        continue

    with open(path, "r") as f:
        content = f.read()

    # Strip all nested/double a tags with local .html links first
    while True:
        new_content = re.sub(rf'<a href="[^"]+\.html">(<a href="[^"]+\.html">.*?</a>)</a>', r'\1', content, flags=re.DOTALL)
        if new_content == content:
            break
        content = new_content

    # Now strip the last level if we want to restart fresh
    content = re.sub(rf'<a href="[^"]+\.html">(.*?)</a>', r'\1', content, flags=re.DOTALL)

    for name, target in mapping.items():
        # Match name regardless of case
        # We use a pattern that matches the tag and its content
        pattern = rf'(<(p|span)[^>]*>\s*{name}\s*</\2>)'
        content = re.sub(pattern, rf'<a href="{target}">\1</a>', content, flags=re.IGNORECASE)

    with open(path, "w") as f:
        f.write(content)
