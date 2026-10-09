# Deploying the Holistyca demo

This app builds into static HTML, CSS, JavaScript, and images. No Node.js server or database is required on the web host.

## Build and verify

Use a Node.js version supported by the installed Vite version (Node 22.12+ or a compatible newer release).

```sh
npm ci
npm test
npm run build
npm run preview
```

Open the preview URL printed in the terminal to check the production build. The preview command is for local verification; it is not the production web server.

## Upload to a web host

1. Enable HTTPS for your domain using your hosting control panel.
2. Upload **the contents of `dist/`** into the host's document root (often `public_html/`, `www/`, or `htdocs/`) or your chosen subfolder. Keep the `assets/` directory intact.
3. Ensure `index.html` is in that destination directory and is configured as its default document.
4. Open the hosted URL and check sign up, Chat, Dashboard, Suggestions, and a page refresh.

The build uses relative asset paths, so the same files work at a domain root or a subfolder such as `https://example.com/holistyca/`. Open subfolder URLs with a trailing slash. Navigation uses internal React state, so no SPA rewrite rules are required.

For a host that builds directly from this repository, use `npm ci && npm run build` as the build command and `dist` as the publish directory. No environment variables are currently required. Do not upload `src/`, `node_modules/`, or account data.

For updates, rebuild and upload the new output. Avoid long-lived caching of `index.html`; the hashed files in `assets/` can use long-lived caching. Retain old hashed assets during an update if the host supports it, so already-open browser sessions can finish loading them.

## Demo limitations

Accounts, passwords, and questionnaire data are stored in browser local storage. Passwords are stored as entered. This is demo authentication, not production account security. Use sample credentials and data. Production use with real accounts requires backend authentication and appropriate data storage.

Saved data belongs to the browser and origin; it does not sync between devices. Changing the domain or switching from HTTP to HTTPS creates a different storage origin. Apps hosted in different subfolders of the same origin share browser storage.
