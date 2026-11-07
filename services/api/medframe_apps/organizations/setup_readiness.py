"""Administrator-only configuration facts, without network probes or credentials."""

from config.runtime import get_settings
from medframe_apps.operations.call_connection import connection_summary
from medframe_apps.portal.smsgate import configured as otp_configured


def setup_readiness():
    runtime = get_settings()
    local_mail = (
        runtime.app_env == "development"
        and runtime.smtp_host in {"localhost", "127.0.0.1", "mail"}
        and runtime.smtp_port in {51025, 1025}
        and runtime.web_origin in {"http://localhost:3000", "http://127.0.0.1:3000"}
    )
    return {
        "email_mode": "local_capture" if local_mail else "smtp_configured",
        "local_inbox": "http://localhost:58025" if local_mail else None,
        "registration_sms_configured": otp_configured(),
        "reminder_sms_enabled": runtime.sms_live_enabled,
        "calls": connection_summary(),
    }
