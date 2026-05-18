const fs = require('fs');
const path = require('path');

const replacements = {
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
    "#1e40af": "var(--primary-color)",
    "#333333": "var(--text-main)",
    "#333": "var(--text-main)",
    "#475569": "var(--text-muted)",
    "#1e293b": "var(--text-main)",
    "#ccc": "var(--border-input)",
    "#555": "var(--text-muted)",
    "#f9fafb": "var(--bg-muted)",
    "#c7254e": "var(--danger-color)",
    "\"Segoe UI\", Roboto, Arial, sans-serif": "var(--font-main)",
    "\"Segoe UI\", Arial, sans-serif": "var(--font-main)",
    "monospace, Consolas, Courier New": "var(--font-mono)",
    "monospace": "var(--font-mono)"
};

const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);

function processFile(filePath, extraReplacements = {}) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const key of keys) {
        content = content.split(key).join(replacements[key]);
    }

    const extraKeys = Object.keys(extraReplacements).sort((a, b) => b.length - a.length);
    for (const key of extraKeys) {
        content = content.split(key).join(extraReplacements[key]);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
}

processFile('src/styles/agoras-theme.css');

const extraComponents = {
    "#1d4ed8": "var(--primary-hover)",
    "#9ca3af": "var(--text-light)",
    "#e1e1e1": "var(--border-color)",
    "#d1d5db": "var(--border-input)",
    "#eff6ff": "var(--bg-muted)",
    "#6b7280": "var(--text-muted)",
    "#4b5563": "var(--text-muted)",
    "#e5e7eb": "var(--border-color)",
    "#374151": "var(--text-main)",
    "#fee2e2": "rgba(239, 68, 68, 0.1)"
};

processFile('src/styles/components.css', extraComponents);

console.log("CSS standardization complete.");
