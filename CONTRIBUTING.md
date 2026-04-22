# Contributing to AQI_taly

Thank you for your interest in contributing to AQI_taly! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/AQI_taly.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and small

### JavaScript (Frontend)
- Use ES6+ features
- Follow React best practices
- Use functional components with hooks
- Add comments for complex logic

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Pull Request Guidelines

1. **Title**: Use a clear and descriptive title
2. **Description**: Explain what changes you made and why
3. **Testing**: Describe how you tested your changes
4. **Screenshots**: Include screenshots for UI changes
5. **Breaking Changes**: Clearly mark any breaking changes

## Commit Message Guidelines

Use clear and meaningful commit messages:

- `feat: Add new feature`
- `fix: Fix bug in component`
- `docs: Update documentation`
- `style: Format code`
- `refactor: Refactor code`
- `test: Add tests`
- `chore: Update dependencies`

## Areas for Contribution

### High Priority
- [ ] Add more data sources for air quality
- [ ] Improve forecasting accuracy
- [ ] Add mobile responsiveness
- [ ] Implement user authentication
- [ ] Add data export functionality

### Medium Priority
- [ ] Add more pollutant types (NO2, O3, etc.)
- [ ] Improve map performance
- [ ] Add historical data visualization
- [ ] Implement notifications system
- [ ] Add multi-language support

### Low Priority
- [ ] Add dark mode
- [ ] Improve accessibility
- [ ] Add more chart types
- [ ] Implement data caching strategies

## Questions?

If you have questions, please:
1. Check existing issues
2. Open a new issue with the `question` label
3. Be specific and provide context

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

Thank you for contributing to cleaner air in Italy! 🇮🇹
