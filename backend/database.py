import os
from pymongo import MongoClient, ASCENDING, DESCENDING

MONGO_URI = os.getenv(
    "SIGNSAATHI_MONGO_URI",
    "mongodb://127.0.0.1:27017"
)

MONGO_DB_NAME = os.getenv(
    "SIGNSAATHI_MONGO_DB",
    "signsaathi"
)

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

database = client[MONGO_DB_NAME]

users = database["users"]
translation_history = database["translation_history"]
user_settings = database["user_settings"]
learning_progress = database["learning_progress"]


def init_db():
    # Verify MongoDB connection
    client.admin.command("ping")

    # Create indexes
    users.create_index(
        [("email", ASCENDING)],
        unique=True
    )

    translation_history.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)]
    )

    user_settings.create_index(
        [("user_id", ASCENDING)],
        unique=True
    )

    learning_progress.create_index(
        [("user_id", ASCENDING), ("lesson_key", ASCENDING)],
        unique=True
    )

    print("MongoDB connected successfully.")
    print(f"Database: {MONGO_DB_NAME}")
    print("Collections initialized.")
