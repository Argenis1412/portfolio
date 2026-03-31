.PHONY: dev-back dev-front test-back test-front test

dev-back:
	cd backend && python -m uvicorn app.principal:app --reload

dev-front:
	cd frontend && npm run dev

test-back:
	cd backend && python -m pytest

test-front:
	cd frontend && npm run test

test: test-back test-front
