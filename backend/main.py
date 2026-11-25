import os
import json
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from prediction import model_status, predict_sequence

from database import (
    init_db,
    users,
    translation_history,
    user_settings,
    learning_progress
)

from auth import (
    COOKIE,
    MAX_AGE,
    hash_password,
    verify_password,
    make_token,
    current_user,
    admin_user
)

from schemas import (
    Register,
    Login,
    PredictInput,
    ProgressInput,
    SettingsInput
)

from prediction import model_status


app = FastAPI(
    title="SignSaathi API",
    version="2.0.0",
    description="SignSaathi REST API using MongoDB."
)

origins = os.getenv(
    "SIGNSAATHI_FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def now():
    return datetime.now(timezone.utc)


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "created_at": user["created_at"].isoformat()
    }


def serialize_history(record):
    return {
        "id": str(record["_id"]),
        "user_id": str(record["user_id"]),
        "recognized_text": record["recognized_text"],
        "confidence": record.get("confidence"),
        "model_name": record.get("model_name"),
        "created_at": record["created_at"].isoformat()
    }


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {
        "application": "SignSaathi API",
        "status": "running",
        "database": "MongoDB",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    try:
        from database import client
        client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(503, "MongoDB connection failed.")


@app.post("/register", status_code=201)
def register(data: Register):
    email = str(data.email).lower().strip()

    user = {
        "full_name": data.full_name.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "is_active": True,
        "created_at": now()
    }

    try:
        result = users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            409,
            "An account with this email already exists."
        )

    uid = result.inserted_id

    user_settings.insert_one({
        "user_id": uid,
        "preferred_voice": None,
        "speech_rate": 1.0,
        "theme": "light",
        "updated_at": now()
    })

    user["_id"] = uid
    return serialize_user(user)


@app.post("/login")
def login(data: Login, response: Response):
    user = users.find_one({
        "email": str(data.email).lower().strip()
    })

    if not user or not verify_password(
        data.password,
        user["password_hash"]
    ):
        raise HTTPException(401, "Incorrect email or password.")

    if not user.get("is_active", True):
        raise HTTPException(403, "Your account is disabled.")

    response.set_cookie(
        COOKIE,
        make_token(user["_id"]),
        httponly=True,
        samesite="lax",
        secure=os.getenv(
            "SIGNSAATHI_COOKIE_SECURE", "false"
        ).lower() == "true",
        max_age=MAX_AGE,
        path="/"
    )

    return {
        "message": "Login successful",
        "user": serialize_user(user)
    }


@app.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        COOKIE,
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out"}


@app.get("/profile")
def profile(user=Depends(current_user)):
    return {
        key: user[key]
        for key in (
            "id",
            "full_name",
            "email",
            "role",
            "created_at"
        )
    }


@app.get("/model-status")
def status():
    return model_status()


@app.post("/predict")
def predict(data: PredictInput, user=Depends(current_user)):

    try:
        result = predict_sequence(data.sequence)
        return result

    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))

    except Exception as error:
        print("Prediction error:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Gesture prediction failed. Check backend terminal."
        )

@app.get("/translation-history")
def history(
    q: str | None = Query(None, max_length=200),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(current_user)
):
    uid = ObjectId(user["id"])

    query = {"user_id": uid}

    if q:
        query["recognized_text"] = {
            "$regex": q,
            "$options": "i"
        }

    cursor = (
        translation_history
        .find(query)
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )

    return {
        "items": [serialize_history(x) for x in cursor],
        "limit": limit,
        "offset": offset
    }


@app.post("/translation-history", status_code=201)
def save_history(data: dict, user=Depends(current_user)):
    text = str(data.get("recognized_text", "")).strip()
    confidence = data.get("confidence")

    if not text or len(text) > 2000:
        raise HTTPException(
            422,
            "Text must contain 1-2000 characters."
        )

    if confidence is not None:
        if (
            isinstance(confidence, bool)
            or not isinstance(confidence, (int, float))
            or not 0 <= confidence <= 1
        ):
            raise HTTPException(
                422,
                "Confidence must be between 0 and 1."
            )

    record = {
        "user_id": ObjectId(user["id"]),
        "recognized_text": text,
        "confidence": confidence,
        "model_name": data.get("model_name"),
        "created_at": now()
    }

    result = translation_history.insert_one(record)
    record["_id"] = result.inserted_id

    return serialize_history(record)


@app.delete("/translation-history/{rid}")
def delete_history(rid: str, user=Depends(current_user)):
    if not ObjectId.is_valid(rid):
        raise HTTPException(404, "Translation record not found.")

    result = translation_history.delete_one({
        "_id": ObjectId(rid),
        "user_id": ObjectId(user["id"])
    })

    if result.deleted_count == 0:
        raise HTTPException(404, "Translation record not found.")

    return {"message": "Translation deleted"}


@app.get("/learning")
def learning(user=Depends(current_user)):
    lessons = [
        {"key": "alphabet", "title": "ISL Alphabet"},
        {"key": "daily-greetings", "title": "Daily Greetings"},
        {"key": "daily-words", "title": "Daily-use Words"}
    ]

    records = learning_progress.find({
        "user_id": ObjectId(user["id"])
    })

    progress = {}

    for record in records:
        progress[record["lesson_key"]] = {
            "lesson_key": record["lesson_key"],
            "score": record.get("score"),
            "completed": record.get("completed", False),
            "updated_at": record["updated_at"].isoformat()
        }

    return {
        "lessons": [
            {**lesson, "progress": progress.get(lesson["key"])}
            for lesson in lessons
        ]
    }


@app.post("/learning/progress")
def save_progress(data: ProgressInput, user=Depends(current_user)):
    uid = ObjectId(user["id"])
    timestamp = now()

    learning_progress.update_one(
        {
            "user_id": uid,
            "lesson_key": data.lesson_key
        },
        {
            "$set": {
                "score": data.score,
                "completed": data.completed,
                "updated_at": timestamp
            },
            "$setOnInsert": {
                "user_id": uid,
                "lesson_key": data.lesson_key
            }
        },
        upsert=True
    )

    record = learning_progress.find_one({
        "user_id": uid,
        "lesson_key": data.lesson_key
    })

    return {
        "lesson_key": record["lesson_key"],
        "score": record.get("score"),
        "completed": record.get("completed", False),
        "updated_at": record["updated_at"].isoformat()
    }


@app.get("/analytics")
def analytics(user=Depends(current_user)):
    uid = ObjectId(user["id"])

    total = translation_history.count_documents({
        "user_id": uid
    })

    pipeline = [
        {"$match": {"user_id": uid}},
        {
            "$group": {
                "_id": "$recognized_text",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]

    popular = [
        {
            "recognized_text": item["_id"],
            "count": item["count"]
        }
        for item in translation_history.aggregate(pipeline)
    ]

    confidence_pipeline = [
        {
            "$match": {
                "user_id": uid,
                "confidence": {"$ne": None}
            }
        },
        {
            "$group": {
                "_id": None,
                "average": {"$avg": "$confidence"}
            }
        }
    ]

    confidence_result = list(
        translation_history.aggregate(confidence_pipeline)
    )

    average = (
        confidence_result[0]["average"]
        if confidence_result else None
    )

    return {
        "total_translations": total,
        "most_recognized": popular,
        "average_confidence": average,
        "model_metrics": None,
        "note": "Metrics require genuine model evaluation."
    }


@app.get("/model-performance")
def performance():
    path = (
        os.path.dirname(os.path.dirname(__file__))
    )

    file_path = os.path.join(
        path,
        "deep_learning",
        "evaluation",
        "performance.json"
    )

    if not os.path.exists(file_path):
        return {
            "available": False,
            "message": "Train and evaluate models first.",
            "models": []
        }

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return {
                "available": True,
                **json.load(file)
            }
    except (ValueError, OSError):
        raise HTTPException(
            500,
            "Evaluation report could not be read."
        )


@app.get("/settings")
def get_settings(user=Depends(current_user)):
    record = user_settings.find_one({
        "user_id": ObjectId(user["id"])
    })

    if not record:
        return {}

    return {
        "preferred_voice": record.get("preferred_voice"),
        "speech_rate": record.get("speech_rate", 1.0),
        "theme": record.get("theme", "light"),
        "updated_at": record["updated_at"].isoformat()
    }


@app.put("/settings")
def put_settings(data: SettingsInput, user=Depends(current_user)):
    user_settings.update_one(
        {"user_id": ObjectId(user["id"])},
        {
            "$set": {
                "preferred_voice": data.preferred_voice,
                "speech_rate": data.speech_rate,
                "theme": data.theme,
                "updated_at": now()
            },
            "$setOnInsert": {
                "user_id": ObjectId(user["id"])
            }
        },
        upsert=True
    )

    return {"message": "Settings saved"}



@app.get("/admin/users")
def admin_users(user=Depends(admin_user)):
    records = users.find(
        {},
        {
            "full_name": 1,
            "email": 1,
            "role": 1,
            "is_active": 1,
            "created_at": 1
        }
    ).sort("created_at", -1)

    result = []

    for record in records:
        result.append({
            "id": str(record["_id"]),
            "full_name": record["full_name"],
            "email": record["email"],
            "role": record.get("role", "user"),
            "is_active": record.get("is_active", True),
            "created_at": record["created_at"].isoformat()
        })

    return {"users": result}


@app.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: str,
    data: dict,
    user=Depends(admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        raise HTTPException(
            status_code=400,
            detail="is_active must be true or false"
        )

    # Prevent admin from deactivating their own account
    if user_id == user["id"] and is_active is False:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own admin account."
        )

    result = users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": is_active}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "message": "User status updated successfully",
        "is_active": is_active
    }


@app.get("/admin/model-status")
def admin_status(user=Depends(admin_user)):
    return model_status()
