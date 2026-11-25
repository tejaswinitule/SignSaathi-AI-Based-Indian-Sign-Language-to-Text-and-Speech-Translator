import hashlib
import hmac
import secrets
import os

from bson import ObjectId
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException

from database import users

COOKIE = "signsaathi_session"
MAX_AGE = 604800

signer = URLSafeTimedSerializer(
    os.getenv(
        "SIGNSAATHI_SECRET_KEY",
        "dev-secret-change-before-deployment"
    ),
    salt="signsaathi"
)


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=2**14,
        r=8,
        p=1
    )
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        scheme, salt, expected = stored.split("$", 2)

        actual = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt),
            n=2**14,
            r=8,
            p=1
        )

        return (
            scheme == "scrypt"
            and hmac.compare_digest(actual.hex(), expected)
        )
    except (ValueError, TypeError, AttributeError):
        return False


def make_token(uid):
    return signer.dumps({"uid": str(uid)})


def current_user(req: Request):
    token = req.cookies.get(COOKIE)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue."
        )

    try:
        uid = signer.loads(token, max_age=MAX_AGE)["uid"]
    except SignatureExpired:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please log in again."
        )
    except (BadSignature, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid session."
        )

    if not ObjectId.is_valid(uid):
        raise HTTPException(
            status_code=401,
            detail="Invalid session."
        )

    user = users.find_one(
        {"_id": ObjectId(uid)},
        {
            "full_name": 1,
            "email": 1,
            "role": 1,
            "is_active": 1,
            "created_at": 1
        }
    )

    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=401,
            detail="Account unavailable."
        )

    return {
        "id": str(user["_id"]),
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at")
    }


def admin_user(req: Request):
    user = current_user(req)

    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required."
        )

    return user
