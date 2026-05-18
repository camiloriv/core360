import os
import re

css_file = "src/styles/agoras-theme.css"
with open(css_file, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    "#1e3a8a": "var(--primary-color)",
    "#2563eb": "var(--primary-hover)",
    "#3b82f6": "var(--secondary-color)",
    "#e67e22": "var(--accent-color)",
    "#10b981": "var(--success-color)",
    "#ef4444": "var(--danger-color)",
    "#f59e0b": "var(--warning-color)",
    "#0ea5e9": "var(--info-color)",
    "#f4f6f9": "var(--bg-body)",
    "#ffffff": "var(--bg-container)",
    "#f1f5f9": "var(--bg-muted)",
    "#e2e8f0": "var(--border-color)",
    "#0f172a": "var(--text-main)",
    "#64748b": "var(--text-muted)",
    "#94a3b8": "var(--text-light)",
    "#cbd5e1": "var(--border-input)",
    "#1e40af": "var(--primary-color)", # mapped 1e40af to primary
    "#333": "var(--text-main)",
    "#333333": "var(--text-main)",
    "#475569": "var(--text-muted)",
    "#1e293b": "var(--text-main)",
    "#ccc": "var(--border-input)",
    "#555": "var(--text-muted)",
    "#f9fafb": "var(--bg-muted)",
    "#c7254e": "var(--danger-color)",
    "\"Segoe UI\", Roboto, Arial, sans-serif": "var(--font-main)",
    "\"Segoe UI\", Arial, sans-serif": "var(--font-main)",
    "monospace": "var(--font-mono)",
    "monospace, Consolas, Courier New": "var(--font-mono)"
}

for old, new in replacements.items():
    # we need to be careful with #333 and #333333
    # use word boundaries or just rely on order if we do long ones first
    pass

# sort by length desc to replace #333333 before #333
for old in sorted(replacements.keys(), key=len, reverse=True):
    content = content.replace(old, replacements[old])

with open(css_file, "w", encoding="utf-8") as f:
    f.write(content)

# Also update components.css
css_file2 = "src/styles/components.css"
with open(css_file2, "r", encoding="utf-8") as f:
    content2 = f.read()

for old in sorted(replacements.keys(), key=len, reverse=True):
    content2 = content2.replace(old, replacements[old])

# additional fixes for components.css
content2 = content2.replace("#1d4ed8", "var(--primary-hover)")
content2 = content2.replace("#9ca3af", "var(--text-light)")
content2 = content2.replace("#e1e1e1", "var(--border-color)")
content2 = content2.replace("#d1d5db", "var(--border-input)")
content2 = content2.replace("#eff6ff", "var(--bg-muted)")
content2 = content2.replace("#6b7280", "var(--text-muted)")
content2 = content2.replace("#4b5563", "var(--text-muted)")
content2 = content2.replace("#e5e7eb", "var(--border-color)")
content2 = content2.replace("#374151", "var(--text-main)")
content2 = content2.replace("#fee2e2", "rgba(239, 68, 68, 0.1)")

with open(css_file2, "w", encoding="utf-8") as f:
    f.write(content2)

print("Replaced variables in CSS files")
