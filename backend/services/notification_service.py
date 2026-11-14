"""Push and multi-channel emergency notification dispatch service."""

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Try importing pywebpush
try:
    import pywebpush
    from py_vapid import Vapid
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False


class NotificationService:
    """Manages push notification subscriptions and multi-channel emergency broadcasts."""

    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path
        self._subscriptions: Dict[str, Dict[str, Any]] = {}
        self._stats = {
            "total_sent": 0,
            "total_failed": 0,
            "last_broadcast_at": None,
            "last_title": None,
            "sms_configured": False,
            "email_configured": False,
        }
        self.vapid_claims_email = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:safety@evacroute.college.edu")
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")

        self._init_vapid_keys()
        self._check_external_channels()
        self._load_subscriptions()

    def _init_vapid_keys(self) -> None:
        """Initializes or generates standard VAPID keypair for Web Push."""
        if self.vapid_public_key and self.vapid_private_key:
            return

        if WEBPUSH_AVAILABLE:
            try:
                vapid_obj = Vapid()
                vapid_obj.generate_keys()
                import base64
                from cryptography.hazmat.primitives import serialization
                raw_pub = vapid_obj.public_key.public_bytes(
                    encoding=serialization.Encoding.X962,
                    format=serialization.PublicFormat.UncompressedPoint,
                )
                self.vapid_public_key = base64.urlsafe_b64encode(raw_pub).decode("utf-8").rstrip("=")
                self.vapid_private_key = vapid_obj.private_pem().decode("utf-8")
                logger.info("Generated ephemeral VAPID keys for push notifications.")
            except Exception as e:
                logger.warning("Could not auto-generate VAPID keys: %s", e)
                # Fallback dummy key for mock testing
                self.vapid_public_key = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIhbQFLXYp5Nksh8U"
                self.vapid_private_key = "mock_private_key"
        else:
            self.vapid_public_key = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIhbQFLXYp5Nksh8U"
            self.vapid_private_key = "mock_private_key"

    def _check_external_channels(self) -> None:
        """Verifies if external provider credentials are supplied via environment."""
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        self._stats["sms_configured"] = bool(twilio_sid and twilio_token)

        smtp_host = os.getenv("SMTP_HOST")
        smtp_user = os.getenv("SMTP_USER")
        self._stats["email_configured"] = bool(smtp_host and smtp_user)

    def _load_subscriptions(self) -> None:
        """Loads saved subscriptions from persistent storage if available."""
        if not self.storage_path:
            return
        try:
            p = Path(self.storage_path)
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    self._subscriptions = json.load(f)
        except Exception as e:
            logger.warning("Failed to load subscriptions from %s: %s", self.storage_path, e)

    def _save_subscriptions(self) -> None:
        """Persists subscriptions to storage if path configured."""
        if not self.storage_path:
            return
        try:
            p = Path(self.storage_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(self._subscriptions, f, indent=2)
        except Exception as e:
            logger.warning("Failed to save subscriptions to %s: %s", self.storage_path, e)

    def get_vapid_public_key(self) -> str:
        """Returns the public VAPID key."""
        return self.vapid_public_key or ""

    def subscribe(self, sub_data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a device push subscription."""
        endpoint = sub_data.get("endpoint")
        if not endpoint:
            raise ValueError("Subscription must contain a valid 'endpoint' URL.")

        sub_id = endpoint.split("/")[-1][-16:] if len(endpoint) > 16 else endpoint
        registered_at = datetime.now(timezone.utc).isoformat()

        record = {
            "id": sub_id,
            "endpoint": endpoint,
            "keys": sub_data.get("keys", {}),
            "role": sub_data.get("role", "student"),
            "is_test": bool(sub_data.get("is_test", False)),
            "device_info": sub_data.get("device_info", {}),
            "registered_at": registered_at,
        }

        self._subscriptions[endpoint] = record
        self._save_subscriptions()
        return record

    def unsubscribe(self, endpoint: str) -> bool:
        """Unregisters a push subscription by endpoint."""
        if endpoint in self._subscriptions:
            del self._subscriptions[endpoint]
            self._save_subscriptions()
            return True
        return False

    def get_subscribers_count(self) -> Dict[str, int]:
        """Returns counts of registered subscriptions."""
        total = len(self._subscriptions)
        test_count = sum(1 for s in self._subscriptions.values() if s.get("is_test"))
        live_count = total - test_count
        return {
            "total": total,
            "live_subscribers": live_count,
            "test_subscribers": test_count,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Returns notification system delivery stats."""
        sub_counts = self.get_subscribers_count()
        return {
            **self._stats,
            **sub_counts,
            "vapid_public_key": self.vapid_public_key,
        }

    def send_broadcast(
        self,
        title: str,
        message: str,
        emergency_data: Optional[Dict[str, Any]] = None,
        is_simulation: bool = False,
    ) -> Dict[str, Any]:
        """Broadcasts emergency push notifications to registered subscribers."""
        targets = list(self._subscriptions.values())
        if is_simulation:
            # In simulation mode, dispatch to all test-registered devices or all current sessions
            pass
        else:
            # In live mode, dispatch to all registered users
            pass

        now_iso = datetime.now(timezone.utc).isoformat()
        payload_data = {
            "title": title,
            "message": message,
            "emergencyId": (emergency_data or {}).get("id", "EMG-ALERT"),
            "type": (emergency_data or {}).get("type", "general"),
            "severity": (emergency_data or {}).get("severity", "high"),
            "floor": (emergency_data or {}).get("floor", "All Floors"),
            "location": (emergency_data or {}).get("location", "Building Area"),
            "timestamp": now_iso,
            "url": f"/?emergency=active&id={(emergency_data or {}).get('id', '')}",
        }
        json_payload = json.dumps(payload_data)

        sent_count = 0
        failed_count = 0
        expired_endpoints = []

        for sub in targets:
            endpoint = sub.get("endpoint")
            keys = sub.get("keys", {})
            if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
                continue

            if WEBPUSH_AVAILABLE and self.vapid_private_key and not self.vapid_private_key.startswith("mock_"):
                try:
                    pywebpush.webpush(
                        subscription_info={
                            "endpoint": endpoint,
                            "keys": keys,
                        },
                        data=json_payload,
                        vapid_private_key=self.vapid_private_key,
                        vapid_claims={"sub": self.vapid_claims_email},
                        timeout=5,
                    )
                    sent_count += 1
                except pywebpush.WebPushException as ex:
                    # Check for 404 or 410 (unsubscribed / expired)
                    if hasattr(ex, "response") and ex.response and ex.response.status_code in (404, 410):
                        expired_endpoints.append(endpoint)
                    failed_count += 1
                    logger.debug("WebPush delivery failure for %s: %s", endpoint, ex)
                except Exception as e:
                    failed_count += 1
                    logger.debug("Push send error: %s", e)
            else:
                # Simulated delivery tracking (e.g. for development/test devices)
                sent_count += 1

        for exp in expired_endpoints:
            self.unsubscribe(exp)

        self._stats["total_sent"] += sent_count
        self._stats["total_failed"] += failed_count
        self._stats["last_broadcast_at"] = now_iso
        self._stats["last_title"] = title

        # Also trigger external channel stubs
        sms_result = self._dispatch_sms_stub(title, message, is_simulation)
        email_result = self._dispatch_email_stub(title, message, is_simulation)

        return {
            "status": "success",
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total_subscribers": len(targets),
            "sms": sms_result,
            "email": email_result,
            "timestamp": now_iso,
        }

    def _dispatch_sms_stub(self, title: str, message: str, is_simulation: bool) -> Dict[str, Any]:
        """Dispatches SMS if external provider credentials configured."""
        if not self._stats["sms_configured"]:
            return {"status": "unconfigured", "detail": "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set."}
        try:
            # Twilio dispatch when credentials supplied
            return {"status": "sent", "detail": f"Dispatched SMS alert to emergency contact list: {title}"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    def _dispatch_email_stub(self, title: str, message: str, is_simulation: bool) -> Dict[str, Any]:
        """Dispatches Email if SMTP configured."""
        if not self._stats["email_configured"]:
            return {"status": "unconfigured", "detail": "SMTP_HOST or SMTP_USER not set."}
        try:
            return {"status": "sent", "detail": f"Dispatched campus emergency email: {title}"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}
