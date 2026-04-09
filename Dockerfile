FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build


FROM python:3.13-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY src ./src
COPY projects ./projects
COPY pyproject.toml README.md LICENSE ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["python", "backend/main.py"]
