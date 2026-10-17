# Contributing to Marko 🚀

First off, thank you for considering contributing to **Marko**! It's people like you that make Marko an amazing tool for everyone.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open-source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

---

## 📜 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Your First Code Contribution](#your-first-code-contribution)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding & Style Guidelines](#coding--style-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by the [Marko Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to **contact.arunjay@gmail.com**.

---

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check the existing issues to ensure that the problem hasn't already been reported.

When filing a bug report:
- Use a clear and descriptive title.
- Describe the exact steps which reproduce the problem.
- Provide the specific behavior you observed after following the steps.
- Explain which behavior you expected to see instead and why.
- Include screenshots or recordings if applicable.
- Specify your operating system (Windows, macOS, Linux, Android, iOS) and app version.

### Suggesting Enhancements
Feature suggestions are welcome! When proposing a new feature:
- Use a clear and descriptive title.
- Provide a step-by-step description of the suggested enhancement.
- Explain why this enhancement would be useful to most Marko users.
- List any alternative solutions or features you've considered.

---

## Development Workflow

### 1. Fork & Clone
1. Fork the repository on GitHub: `https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor`.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Marko---Markdown-.md-file-Viewer-and-editor.git
   cd Marko---Markdown-.md-file-Viewer-and-editor
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create a Branch
Always create a descriptive branch for your work:
```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/issue-description
```

### 4. Running Locally
Start the development server:
```bash
npm run dev
```

To test inside the Electron desktop shell:
```bash
npm run electron:start
```

### 5. Validate the Build
Ensure the production build succeeds without warnings or errors before pushing:
```bash
npm run build
```

---

## Pull Request Process

1. Ensure your code complies with our coding conventions.
2. Update the `README.md` or relevant documentation with details of changes to the interface or behavior if needed.
3. Test your changes thoroughly across browsers or on desktop.
4. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/my-new-feature
   ```
5. Open a Pull Request targeting the `main` branch of the upstream repository.
6. Fill in the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
7. Maintainers will review your submission and may request modifications or provide feedback.

---

## Coding & Style Guidelines

- **Vanilla CSS**: We use clean, modern Vanilla CSS variables and utility classes defined in `src/style.css`.
- **Modern JavaScript**: ES6+ modules (`import`/`export`), clean functional components, async/await for asynchronous actions.
- **Accessibility & Performance**: Maintain responsive UI, high contrast, smooth animations, and fast load times.
- **Commit Messages**: Follow standard conventional commits format (e.g. `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`).
