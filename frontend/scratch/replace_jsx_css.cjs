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
    "#fff": "var(--bg-container)",
    "#f1f5f9": "var(--bg-muted)",
    "#e2e8f0": "var(--border-color)",
    "#0f172a": "var(--text-main)",
    "#1e293b": "var(--text-main)",
    "#64748b": "var(--text-muted)",
    "#94a3b8": "var(--text-light)",
    "#cbd5e1": "var(--border-input)",
    "#1e40af": "var(--primary-color)",
    "#333333": "var(--text-main)",
    "#333": "var(--text-main)",
    "#475569": "var(--text-muted)",
    "#ccc": "var(--border-input)",
    "#555": "var(--text-muted)",
    "#f9fafb": "var(--bg-muted)",
    "#c7254e": "var(--danger-color)",
    "#1d4ed8": "var(--primary-hover)",
    "#9ca3af": "var(--text-light)",
    "#e1e1e1": "var(--border-color)",
    "#d1d5db": "var(--border-input)",
    "#eff6ff": "var(--bg-muted)",
    "#6b7280": "var(--text-muted)",
    "#4b5563": "var(--text-muted)",
    "#e5e7eb": "var(--border-color)",
    "#374151": "var(--text-main)"
};

const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);

function walkSync(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
}

const filesToProcess = [
  ...walkSync('src/pages', []),
  ...walkSync('src/components', [])
];

filesToProcess.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Solo reemplazar dentro de comillas simples, dobles o backticks para evitar romper hashes
    for (const key of keys) {
        const regex = new RegExp(`(['"\`])${key}(['"\`])`, 'gi');
        content = content.replace(regex, `$1${replacements[key]}$2`);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
});

console.log("JSX styling standardization complete.");
