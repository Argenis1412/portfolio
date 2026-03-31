# 🎯 CONTRIBUTING

Thank you for your interest in contributing to this project! 🙌

---

## 📋 How to Contribute

### 1. Fork the Repository

```bash
git clone https://github.com/Argenis1412/portfolio.git
cd portfolio
```

### 2. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 3. Make Your Changes

- Follow existing code standards
- Add tests for new features
- Update documentation if necessary
- **Security Check:** Never hardcode production URLs (e.g. CORS placeholders) or secrets into YAML config files. Use environment variables or platform dashboard configurations (`sync: false`).

### 4. Run the Tests

```bash
cd backend
pytest
```

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature X"
```

**Commit patterns:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `test:` Add or fix tests
- `refactor:` Code refactor
- `style:` Code formatting

### 6. Push to GitHub

```bash
git push origin feature/my-feature
```

### 7. Open a Pull Request

- Describe your changes
- Reference related issues
- Wait for review

---

## ✅ PR Checklist

- [ ] Code follows project standards
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Commits well-described
- [ ] No conflicts with `main`

---

## 🐛 Reporting Bugs

Open an issue with:

1. **Clear description** of the problem
2. **Steps to reproduce**
3. **Expected behavior**
4. **Screenshots** (if applicable)
5. **Environment** (OS, Python version, etc.)

---

## 💡 Suggesting Features

Open an issue describing:

1. **What** you would like to see
2. **Why** it would be useful
3. **How** you imagine it working

---

Thank you! 🚀
