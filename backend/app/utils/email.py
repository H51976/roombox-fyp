"""
Email utility for RoomBox — sends verification, password-reset,
payment receipts, booking confirmations, and cancellation notices.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


# ── HTML email base template ─────────────────────────────────────────────────

def _wrap(title: str, body_html: str, accent: str = "#2563eb") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,{accent} 0%,#1d4ed8 100%);
                       padding:28px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);
                            border-radius:10px;display:inline-block;line-height:40px;
                            text-align:center;font-weight:800;font-size:20px;color:#fff;">
                  R
                </div>
                <span style="font-size:22px;font-weight:700;color:#ffffff;
                             letter-spacing:-0.5px;">RoomBox</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              {body_html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:18px 40px;
                       border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © 2026 RoomBox · Nepal's Room Rental Platform<br/>
                This is an automated email — please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _cta_button(url: str, label: str, color: str = "#2563eb") -> str:
    return f"""
<table cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td align="center" style="background:{color};border-radius:12px;">
      <a href="{url}"
         style="display:inline-block;padding:14px 36px;font-size:15px;
                font-weight:600;color:#ffffff;text-decoration:none;
                letter-spacing:0.2px;">{label}</a>
    </td>
  </tr>
</table>"""


def _info_row(label: str, value: str) -> str:
    return f"""
<tr>
  <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;
             font-size:13px;color:#64748b;width:45%;">{label}</td>
  <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;
             font-size:13px;color:#0f172a;font-weight:600;text-align:right;">{value}</td>
</tr>"""


def _info_table(rows_html: str) -> str:
    return f"""
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f8fafc;border-radius:10px;padding:6px 18px;margin:18px 0;">
  {rows_html}
</table>"""


# ── Verification email ────────────────────────────────────────────────────────

def _verification_html(name: str, url: str) -> str:
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  Verify your email address
</h2>
<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{name}</strong>,<br/>
  Thanks for signing up! Click the button below to confirm your email
  and activate your RoomBox account.
</p>
{_cta_button(url, "✓  Verify My Email")}
<p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:20px;">
  Or copy this link into your browser:<br/>
  <span style="color:#2563eb;word-break:break-all;">{url}</span>
</p>
<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
  This link expires in <strong>24 hours</strong>.
</p>"""
    return _wrap("Verify Your Email — RoomBox", body)


# ── Password reset email ──────────────────────────────────────────────────────

def _reset_html(name: str, url: str) -> str:
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  Reset your password
</h2>
<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{name}</strong>,<br/>
  We received a request to reset the password for your RoomBox account.
  Click the button below to choose a new password.
</p>
{_cta_button(url, "🔑  Reset My Password", "#dc2626")}
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
            padding:14px 18px;margin:20px 0;">
  <p style="margin:0;font-size:13px;color:#991b1b;">
    <strong>⚠️  Didn't request this?</strong><br/>
    If you didn't ask for a password reset, you can safely ignore this email.
  </p>
</div>
<p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:20px;">
  Or copy this link into your browser:<br/>
  <span style="color:#dc2626;word-break:break-all;">{url}</span>
</p>
<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
  This link expires in <strong>1 hour</strong>.
</p>"""
    return _wrap("Password Reset — RoomBox", body, "#dc2626")


# ── Payment Receipt email (Tenant) ────────────────────────────────────────────

def _payment_receipt_html(
    tenant_name: str,
    room_title: str,
    room_address: str,
    booking_id: int,
    payment_id: int,
    amount: float,
    monthly_rent: float,
    security_deposit: float,
    advance_payment: float,
    transaction_ref: str,
    payment_date: str,
    start_date: str,
    end_date: Optional[str],
) -> str:
    end_display = end_date if end_date else "Open-ended"
    rows = (
        _info_row("Booking ID", f"#RB{booking_id:04d}")
        + _info_row("Payment ID", f"#PY{payment_id:04d}")
        + _info_row("eSewa Reference", transaction_ref)
        + _info_row("Payment Date", payment_date)
        + _info_row("Room", room_title)
        + _info_row("Address", room_address)
        + _info_row("Move-in Date", start_date)
        + _info_row("Tenancy End", end_display)
        + _info_row("Monthly Rent", f"Rs. {monthly_rent:,.0f}")
        + _info_row("Security Deposit", f"Rs. {security_deposit:,.0f}")
        + _info_row("Advance Payment", f"Rs. {advance_payment:,.0f}")
    )
    body = f"""
<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
  <div style="width:48px;height:48px;background:#f0fdf4;border-radius:12px;
              display:flex;align-items:center;justify-content:center;font-size:24px;">✅</div>
  <div>
    <h2 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">Payment Receipt</h2>
    <p style="margin:2px 0 0;font-size:13px;color:#64748b;">Transaction confirmed via eSewa</p>
  </div>
</div>
<p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 6px;">
  Hi <strong>{tenant_name}</strong>, your payment was successful and your room is now booked. 🎉
</p>
{_info_table(rows)}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">
    Total Amount Paid: Rs. {amount:,.0f}
  </p>
  <p style="margin:4px 0 0;font-size:12px;color:#16a34a;">
    Your tenancy is now active. Save this receipt for your records.
  </p>
</div>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:16px;">
  Questions? Contact your landlord through the RoomBox chat system.
</p>"""
    return _wrap("Payment Receipt — RoomBox", body, "#16a34a")


# ── Booking Confirmation email (Tenant) ───────────────────────────────────────

def _booking_confirmation_tenant_html(
    tenant_name: str,
    room_title: str,
    room_address: str,
    landlord_name: str,
    booking_id: int,
    monthly_rent: float,
    start_date: str,
    end_date: Optional[str],
) -> str:
    end_display = end_date if end_date else "Open-ended"
    rows = (
        _info_row("Booking ID", f"#RB{booking_id:04d}")
        + _info_row("Room", room_title)
        + _info_row("Address", room_address)
        + _info_row("Landlord", landlord_name)
        + _info_row("Monthly Rent", f"Rs. {monthly_rent:,.0f}")
        + _info_row("Move-in Date", start_date)
        + _info_row("Tenancy End", end_display)
    )
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  🏠 Booking Confirmed!
</h2>
<p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{tenant_name}</strong>,<br/>
  Great news! Your room booking has been confirmed. Here are your tenancy details:
</p>
{_info_table(rows)}
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:13px;color:#1e40af;">
    <strong>💡 What's next?</strong><br/>
    Log in to RoomBox to track your tenancy, view payment history,
    and chat with your landlord anytime.
  </p>
</div>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:16px;">
  Welcome to your new home — Team RoomBox
</p>"""
    return _wrap("Booking Confirmed — RoomBox", body, "#16a34a")


# ── Booking Confirmation email (Landlord) ─────────────────────────────────────

def _booking_confirmation_landlord_html(
    landlord_name: str,
    tenant_name: str,
    tenant_email: str,
    room_title: str,
    booking_id: int,
    monthly_rent: float,
    amount_paid: float,
    start_date: str,
    end_date: Optional[str],
) -> str:
    end_display = end_date if end_date else "Open-ended"
    rows = (
        _info_row("Booking ID", f"#RB{booking_id:04d}")
        + _info_row("Tenant Name", tenant_name)
        + _info_row("Tenant Email", tenant_email)
        + _info_row("Room", room_title)
        + _info_row("Monthly Rent", f"Rs. {monthly_rent:,.0f}")
        + _info_row("Amount Paid", f"Rs. {amount_paid:,.0f}")
        + _info_row("Move-in Date", start_date)
        + _info_row("Tenancy End", end_display)
    )
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  🎉 New Tenant Confirmed!
</h2>
<p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{landlord_name}</strong>,<br/>
  A tenant has successfully booked your room and completed payment. Details below:
</p>
{_info_table(rows)}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">
    Payment of Rs. {amount_paid:,.0f} received via eSewa ✓
  </p>
  <p style="margin:4px 0 0;font-size:12px;color:#16a34a;">
    Log in to RoomBox to manage this tenant from your dashboard.
  </p>
</div>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:16px;">
  Manage all tenants from your Landlord Dashboard — Team RoomBox
</p>"""
    return _wrap("New Tenant Booked — RoomBox", body, "#16a34a")


# ── Booking Cancellation email (Tenant) ───────────────────────────────────────

def _booking_cancellation_tenant_html(
    tenant_name: str,
    room_title: str,
    booking_id: int,
    reason: str,
) -> str:
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  Booking Cancelled
</h2>
<p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{tenant_name}</strong>,<br/>
  Your booking for <strong>{room_title}</strong> (#{booking_id:04d}) has been cancelled.
</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:13px;color:#991b1b;">
    <strong>Reason:</strong> {reason}
  </p>
</div>
<p style="font-size:14px;color:#475569;line-height:1.6;margin:16px 0;">
  If you believe this is a mistake or have questions, please contact your landlord
  through the RoomBox messaging system or reach out to our support team.
</p>
<p style="font-size:13px;color:#64748b;margin:16px 0 0;">
  You can search for other available rooms anytime on RoomBox.
</p>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:16px;">
  We're sorry this didn't work out — Team RoomBox
</p>"""
    return _wrap("Booking Cancelled — RoomBox", body, "#dc2626")


# ── Booking Cancellation email (Landlord) ─────────────────────────────────────

def _booking_cancellation_landlord_html(
    landlord_name: str,
    tenant_name: str,
    room_title: str,
    booking_id: int,
    reason: str,
) -> str:
    body = f"""
<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
  Tenancy Ended — {room_title}
</h2>
<p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.6;">
  Hi <strong>{landlord_name}</strong>,<br/>
  The tenancy for <strong>{tenant_name}</strong> in your room 
  <strong>{room_title}</strong> (Booking #{booking_id:04d}) has been terminated.
</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:13px;color:#991b1b;">
    <strong>Reason:</strong> {reason}
  </p>
</div>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;
            padding:14px 18px;margin:16px 0;">
  <p style="margin:0;font-size:13px;color:#92400e;">
    <strong>📋 Your room is now available.</strong><br/>
    Log in to your dashboard to re-list the room or make it available for new tenants.
  </p>
</div>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center;
          border-top:1px solid #f1f5f9;padding-top:16px;">
  Manage your listings from the Landlord Dashboard — Team RoomBox
</p>"""
    return _wrap("Tenancy Ended — RoomBox", body, "#dc2626")


# ── SMTP sender ───────────────────────────────────────────────────────────────

def _send(to_email: str, subject: str, html: str) -> bool:
    """Send a single HTML email. Returns True on success, False on failure."""
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("Email credentials not configured — skipping send.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        logger.info("Email sent to %s — %s", to_email, subject)
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP auth failed. Check MAIL_USERNAME / MAIL_PASSWORD in .env")
        return False
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


# ── Public helpers ────────────────────────────────────────────────────────────

def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    return _send(to_email, "Verify your email — RoomBox", _verification_html(full_name, url))


def send_password_reset_email(to_email: str, full_name: str, token: str) -> bool:
    url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    return _send(to_email, "Reset your password — RoomBox", _reset_html(full_name, url))


def send_payment_receipt(
    to_email: str,
    tenant_name: str,
    room_title: str,
    room_address: str,
    booking_id: int,
    payment_id: int,
    amount: float,
    monthly_rent: float,
    security_deposit: float,
    advance_payment: float,
    transaction_ref: str,
    payment_date: str,
    start_date: str,
    end_date: Optional[str] = None,
) -> bool:
    html = _payment_receipt_html(
        tenant_name, room_title, room_address, booking_id, payment_id,
        amount, monthly_rent, security_deposit, advance_payment,
        transaction_ref, payment_date, start_date, end_date,
    )
    return _send(to_email, f"Payment Receipt — Booking #RB{booking_id:04d} — RoomBox", html)


def send_booking_confirmation_tenant(
    to_email: str,
    tenant_name: str,
    room_title: str,
    room_address: str,
    landlord_name: str,
    booking_id: int,
    monthly_rent: float,
    start_date: str,
    end_date: Optional[str] = None,
) -> bool:
    html = _booking_confirmation_tenant_html(
        tenant_name, room_title, room_address, landlord_name,
        booking_id, monthly_rent, start_date, end_date,
    )
    return _send(to_email, f"Booking Confirmed — {room_title} — RoomBox", html)


def send_booking_confirmation_landlord(
    to_email: str,
    landlord_name: str,
    tenant_name: str,
    tenant_email: str,
    room_title: str,
    booking_id: int,
    monthly_rent: float,
    amount_paid: float,
    start_date: str,
    end_date: Optional[str] = None,
) -> bool:
    html = _booking_confirmation_landlord_html(
        landlord_name, tenant_name, tenant_email, room_title,
        booking_id, monthly_rent, amount_paid, start_date, end_date,
    )
    return _send(to_email, f"New Tenant Confirmed — {room_title} — RoomBox", html)


def send_booking_cancellation_tenant(
    to_email: str,
    tenant_name: str,
    room_title: str,
    booking_id: int,
    reason: str = "Booking was cancelled.",
) -> bool:
    html = _booking_cancellation_tenant_html(tenant_name, room_title, booking_id, reason)
    return _send(to_email, f"Booking Cancelled — {room_title} — RoomBox", html)


def send_booking_cancellation_landlord(
    to_email: str,
    landlord_name: str,
    tenant_name: str,
    room_title: str,
    booking_id: int,
    reason: str = "Tenancy ended.",
) -> bool:
    html = _booking_cancellation_landlord_html(landlord_name, tenant_name, room_title, booking_id, reason)
    return _send(to_email, f"Tenancy Ended — {room_title} — RoomBox", html)
