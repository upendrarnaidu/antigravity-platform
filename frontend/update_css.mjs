import fs from 'fs';

const cssContent = fs.readFileSync('src/index.css', 'utf8');

const newRoot = `@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');

@theme {
  --color-primary: var(--color-primary);
  --color-primary-hover: var(--color-primary-hover);
  --color-surface: var(--color-surface);
  --color-bg: var(--color-bg);
  --color-text-main: var(--color-text-main);
  --color-text-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  
  --font-sans: "Inter", sans-serif;
  --font-heading: "Plus Jakarta Sans", "Lexend", sans-serif;
}

/* ── Light Theme: "The Studio Look" ── */
:root, .light {
  --color-bg: theme(colors.slate.50);
  --color-surface: theme(colors.white);
  --color-text-main: theme(colors.slate.900);
  --color-text-muted: theme(colors.slate.500);
  --color-primary: theme(colors.indigo.600);
  --color-primary-hover: theme(colors.indigo.700);
  --color-border: theme(colors.slate.200);

  --bg-dark: var(--color-bg);
  --bg-gradient-1: var(--color-bg);
  --bg-gradient-2: var(--color-surface);
  --primary: var(--color-primary);
  --primary-hover: var(--color-primary-hover);
  --secondary: theme(colors.indigo.400);
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;
  --accent-red: #ef4444;
  --glass-bg: var(--color-surface);
  --glass-border: var(--color-border);
  --glass-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.05);
  --sidebar-width: 240px;
  --sidebar-bg: var(--color-surface);
  --text-main: var(--color-text-main);
  --text-muted: var(--color-text-muted);
  --text-dark: var(--color-text-main);
  
  color-scheme: light;
}

/* ── Dark Theme: "The Cinematic Look" ── */
.dark {
  --color-bg: theme(colors.slate.950);
  --color-surface: rgba(2, 6, 23, 0.6);
  --color-text-main: theme(colors.slate.100);
  --color-text-muted: theme(colors.slate.400);
  --color-primary: theme(colors.indigo.600);
  --color-primary-hover: theme(colors.indigo.500);
  --color-border: rgba(255, 255, 255, 0.1);

  --bg-dark: var(--color-bg);
  --bg-gradient-1: #1e1b4b;
  --bg-gradient-2: #0f172a;
  --primary: var(--color-primary);
  --primary-hover: var(--color-primary-hover);
  --secondary: #a855f7;
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;
  --accent-red: #ef4444;
  --glass-bg: var(--color-surface);
  --glass-border: var(--color-border);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  --sidebar-width: 240px;
  --sidebar-bg: rgba(10, 10, 20, 0.6);
  --text-main: var(--color-text-main);
  --text-muted: var(--color-text-muted);
  --text-dark: #0f172a;

  color-scheme: dark;
}`;

// match everything from the top of the file down to the closing brace of the first :root block
const newCss = cssContent.replace(/[\s\S]*?:root\s*\{[\s\S]*?\}/, newRoot);
fs.writeFileSync('src/index.css', newCss);
console.log("Replaced CSS");
