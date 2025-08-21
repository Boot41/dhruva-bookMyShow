from datetime import datetime, timedelta, timezone
from typing import Any, Optional

try:
    from passlib.context import CryptContext  # type: ignore
except Exception:  # pragma: no cover - fallback when passlib missing
    CryptContext = None  # type: ignore
import base64
import hmac
import json
import hashlib
import secrets

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext else None


def hash_password(password: str) -> str:
    if pwd_context:
        return pwd_context.hash(password)
    # Fallback: salted SHA256 (not for production use)
    salt = secrets.token_hex(16)
    digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"sha256${salt}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if pwd_context:
        return pwd_context.verify(plain_password, hashed_password)
    try:
        algo, salt, digest = hashed_password.split("$", 2)
        if algo != "sha256":
            return False
        calc = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return hmac.compare_digest(calc, digest)
    except Exception:
        return False


def create_access_token(subject: str | int, expires_minutes: Optional[int] = None) -> str:
    """Create a minimal HMAC-signed token without external JWT deps.

    The token format is: base64url(payload_json).base64url(signature_bytes)
    where signature = HMAC-SHA256(secret, payload_json_bytes).
    """
    expire_minutes = expires_minutes or settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload: dict[str, Any] = {"sub": str(subject), "exp": int(expire.timestamp())}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    sig = hmac.new(settings.jwt_secret_key.encode("utf-8"), payload_bytes, hashlib.sha256).digest()

    def b64u(b: bytes) -> str:
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")

    return f"{b64u(payload_bytes)}.{b64u(sig)}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify the minimal HMAC-signed token produced above.

    Returns the payload dict on success, or None on failure/expiration.
    """
    try:
        payload_b64, sig_b64 = token.split(".", 1)
    except ValueError:
        return None

    def b64u_decode(s: str) -> bytes:
        padding = "=" * (-len(s) % 4)
        return base64.urlsafe_b64decode(s + padding)

    try:
        payload_bytes = b64u_decode(payload_b64)
        sig = b64u_decode(sig_b64)
    except Exception:
        return None

    expected_sig = hmac.new(settings.jwt_secret_key.encode("utf-8"), payload_bytes, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected_sig):
        return None

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None

    exp = payload.get("exp")
    if isinstance(exp, int):
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if now_ts >= exp:
            return None

    return payload
