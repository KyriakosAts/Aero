FROM python:3.13-slim

WORKDIR /app

# Copy entire workspace
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 8000

CMD ["python", "backend/main.py"]
