import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"
os.environ["APP_ENV"] = "test"
