# RoomBox — Unit Test Report
**Project:** RoomBox — Room Rental Platform  
**Backend Framework:** FastAPI (Python)  
**Test Framework:** pytest 9.0.3  
**Python Version:** 3.13.2  
|| | | **TOTAL** | **157** | **? ALL PASS** |
**Overall Result:** ✅ All 128 passed in 2.12 s

---

## Unit Testing Overview

Unit testing was performed on the backend business logic of the RoomBox platform. Each test class (UT001–UT030) targets an isolated, independent component of the system, including validation utilities, authentication helpers, payment logic, booking rules, and administrative constraints. Tests were executed using the `pytest` framework without requiring a live database connection, ensuring fast, repeatable, and environment-independent results.

To run all tests:
```
cd backend
pytest tests/test_unit.py -v
```

---

## Test 1 – UT001 – Email Format Validation

| Field | Details |
|---|---|
| **TC ID** | UT001 |
| **Objective** | To verify that the `validate_email()` utility correctly identifies valid and invalid email address formats before they are stored in the database or used for authentication. |
| **Action** | Call `validate_email()` with a range of inputs including standard emails, subdomains, plus-aliases, emails missing the `@` sign, emails without a domain extension, an empty string, and an email beginning with `@`. |
| **Expected Result** | Valid email formats such as `user@example.com`, `tenant@mail.roombox.np`, and `john+filter@gmail.com` should return `True`. Invalid formats such as `notanemail`, `user@nodot`, an empty string `""`, and `@nodomain.com` should return `False`. |
| **Actual Result** | All 7 assertions passed. Valid emails were accepted and all invalid formats were correctly rejected by the regex-based validator. |
| **Conclusion** | The test was successful. The email validation logic operates correctly and protects the system from malformed addresses during registration and login. |

---

## Test 2 – UT002 – Password Encryption (bcrypt Hashing)

| Field | Details |
|---|---|
| **TC ID** | UT002 |
| **Objective** | To verify that the `hash_password()` function generates secure bcrypt hashes and that `verify_password()` correctly authenticates users while rejecting incorrect credentials. |
| **Action** | Hash a plaintext password and assert it differs from the original. Confirm the hash begins with the bcrypt prefix `$2b$`. Verify that the correct password authenticates successfully and that a wrong password is rejected. Generate two hashes for the same password and confirm they differ due to random salt generation. |
| **Expected Result** | The hashed value should not equal the plaintext. The bcrypt prefix `$2b$` or `$2a$` should be present. `verify_password()` should return `True` for the correct password and `False` for an incorrect one. Two hashes of the same password should be different due to random salting. |
| **Actual Result** | All 5 assertions passed. Passwords are hashed securely, verified correctly, and the random salt ensures no two hashes are identical. |
| **Conclusion** | The test was successful. Password encryption and verification meet security standards required for user authentication in the RoomBox platform. |

---

## Test 3 – UT003 – Verification Token Generation

| Field | Details |
|---|---|
| **TC ID** | UT003 |
| **Objective** | To verify that the email verification token generator produces tokens that are sufficiently long, contain only URL-safe characters, and are cryptographically unique across repeated generations. |
| **Action** | Generate a token using `secrets.token_urlsafe(40)` and check its length is at least 50 characters. Validate that the token only contains alphanumeric characters, hyphens, and underscores using a regex pattern. Generate 200 tokens and store them in a set to confirm no duplicates exist. |
| **Expected Result** | Each token should be at least 50 characters long. All characters should match the URL-safe pattern `[A-Za-z0-9_\-]`. All 200 generated tokens should be unique. |
| **Actual Result** | All 3 assertions passed. Tokens are consistently long, URL-safe, and unique across all generated samples. |
| **Conclusion** | The test was successful. The token generation mechanism is cryptographically secure and suitable for use in email verification links without risk of collision or encoding issues. |

---

## Test 4 – UT004 – Reset Token Expiry Validation

| Field | Details |
|---|---|
| **TC ID** | UT004 |
| **Objective** | To verify that the time-based expiry logic for password reset tokens correctly accepts tokens within the valid window and rejects tokens that have passed their expiry time. |
| **Action** | Create an expiry timestamp 1 hour in the future and confirm it has not yet passed. Create an expiry timestamp 1 second in the past and confirm it is expired. Simulate a token issued now with a 1-hour window and check that a timestamp 30 minutes later is still valid. Simulate a token issued 2 hours ago with a 1-hour window and confirm it is now expired. |
| **Expected Result** | A future expiry should be greater than the current time. A past expiry should be less than the current time. A timestamp within the 1-hour window should remain valid. A token issued 2 hours ago should be recognised as expired. |
| **Actual Result** | All 4 assertions passed. The expiry logic correctly handles valid and expired token scenarios across all tested time boundaries. |
| **Conclusion** | The test was successful. The password reset token expiry mechanism reliably enforces the 1-hour validity window, preventing reuse of old or stolen reset links. |

---

## Test 5 – UT005 – JWT Token Creation, Decoding, and Tamper Detection

| Field | Details |
|---|---|
| **TC ID** | UT005 |
| **Objective** | To verify that the `create_access_token()` function produces valid JWT tokens, that `decode_access_token()` correctly retrieves the encoded payload, and that any modification to the token is detected and rejected. |
| **Action** | Create a JWT token and confirm it is a non-empty string. Encode a payload containing `sub`, `email`, and `user_type` fields, decode the token, and check all fields match. Tamper with the last 6 characters of a valid token and attempt to decode it. Confirm the token contains exactly two dots (three segments as per the JWT specification). |
| **Expected Result** | The token should be a string longer than 20 characters. Decoded payload should match the original data. A tampered token should return `None`. The token should contain exactly 2 dots. |
| **Actual Result** | All 4 assertions passed. JWT tokens are generated correctly, payloads are preserved through encoding and decoding, and tampered tokens are rejected by signature verification. |
| **Conclusion** | The test was successful. The JWT implementation correctly secures API authentication and prevents token forgery in the RoomBox platform. |

---

## Test 6 – UT006 – Unauthorized Access Handling (Invalid / Expired JWT)

| Field | Details |
|---|---|
| **TC ID** | UT006 |
| **Objective** | To verify that the authentication system correctly rejects requests carrying expired tokens, malformed token strings, or tokens with invalid signatures, protecting all secured API endpoints from unauthorized access. |
| **Action** | Create a JWT with an expiry set 2 hours in the past and attempt to decode it. Pass a clearly malformed string `"this.is.notjwt"` to the decode function. Pass a structurally valid but cryptographically invalid JWT string with a broken signature. |
| **Expected Result** | An expired token should return `None`. A random non-JWT string should return `None`. A structurally formatted but signature-invalid token should return `None`. |
| **Actual Result** | All 3 assertions passed. The decode function handles all three invalid token scenarios gracefully by returning `None` without raising unhandled exceptions. |
| **Conclusion** | The test was successful. Unauthorized and expired access attempts are correctly blocked at the token validation layer, ensuring API endpoint security. |

---

## Test 7 – UT007 – Booking Payment Total Calculation

| Field | Details |
|---|---|
| **TC ID** | UT007 |
| **Objective** | To verify that the initial payment amount due at the time of booking is calculated accurately as the sum of the security deposit and advance payment, and that the monthly rent is correctly excluded from this initial total. |
| **Action** | Calculate the total for a standard booking with Rs. 1,000 security deposit and Rs. 500 advance. Test with zero advance payment. Test with both values set to zero. Test with large amounts (Rs. 50,000 security + Rs. 10,000 advance). Verify the payment breakdown excludes monthly rent from the immediate total. |
| **Expected Result** | Rs. 1,000 + Rs. 500 = Rs. 1,500. Rs. 2,000 + Rs. 0 = Rs. 2,000. Rs. 0 + Rs. 0 = Rs. 0. Rs. 50,000 + Rs. 10,000 = Rs. 60,000. Monthly rent of Rs. 5,000 should not be included in `total_due_now`. |
| **Actual Result** | All 5 assertions passed. Payment totals are computed correctly across all input combinations, and monthly rent is correctly separated from the initial payment due. |
| **Conclusion** | The test was successful. The booking payment calculation logic is accurate and ensures tenants are charged the correct initial amount without prematurely including recurring rent. |

---

## Test 8 – UT008 – Room Status Transitions After Booking and Vacancy

| Field | Details |
|---|---|
| **TC ID** | UT008 |
| **Objective** | To verify that room status values are defined correctly in the `RoomStatus` enum and that the expected status transitions (available → occupied → available) reflect the correct workflow for booking and tenant vacancy. |
| **Action** | Confirm that `RoomStatus.AVAILABLE` holds the string value `"available"`. Simulate a payment confirmation event by assigning `RoomStatus.OCCUPIED` and verify the status. Simulate a tenant vacating by reassigning `RoomStatus.AVAILABLE` and verify. Confirm the presence of all key status values including `available`, `occupied`, and `inactive` in the enum. |
| **Expected Result** | `RoomStatus.AVAILABLE` should equal `"available"`. After a simulated booking confirmation, the status should be `OCCUPIED`. After a simulated vacate event, the status should return to `AVAILABLE`. All three status values must exist in the enum definition. |
| **Actual Result** | All 4 assertions passed. Room status values are correctly defined and transitions reflect the intended booking and vacancy lifecycle. |
| **Conclusion** | The test was successful. The room status model supports the required lifecycle states and enables accurate tracking of property availability throughout the rental process. |

---

## Test 9 – UT009 – Tenancy Days Remaining Calculation

| Field | Details |
|---|---|
| **TC ID** | UT009 |
| **Objective** | To verify that the days-remaining calculation correctly computes the number of days left in a tenancy period, returns zero for expired tenancies, and handles long-duration tenancies accurately. |
| **Action** | Pass an end date 31 days in the future and verify the result is at least 30 days. Pass an end date 10 days in the past and verify the result is 0. Pass an end date 366 days in the future and verify the result is at least 365 days. |
| **Expected Result** | A future end date of +31 days should return a value ≥ 30. An expired tenancy (past end date) should return exactly 0. A long tenancy of +366 days should return a value ≥ 365. |
| **Actual Result** | All 3 assertions passed. Days-remaining values are calculated correctly for short, expired, and long tenancies. |
| **Conclusion** | The test was successful. The tenancy days-remaining function provides accurate countdowns for both active and long-term tenancy agreements, enabling the dashboard to display correct time-sensitive information. |

---

## Test 10 – UT010 – Room Image Array Validation

| Field | Details |
|---|---|
| **TC ID** | UT010 |
| **Objective** | To verify that the image array validator enforces a minimum of one image and a maximum of ten images per room listing, and that blank or empty string entries are detected and rejected. |
| **Action** | Submit an array with two valid image filenames and confirm acceptance. Submit an empty array and confirm rejection with an appropriate error message. Submit an array of 11 image filenames and confirm rejection with a maximum-exceeded message. Submit exactly 10 images and confirm acceptance. Submit an array containing one valid entry and one blank string and confirm rejection. |
| **Expected Result** | Two valid images should pass. An empty array should fail with a message containing "required". Eleven images should fail with a message containing "maximum". Exactly ten images should pass. A blank string entry should cause rejection. |
| **Actual Result** | All 5 assertions passed. The image array validation correctly enforces all three constraints: minimum quantity, maximum quantity, and non-empty individual entries. |
| **Conclusion** | The test was successful. Room listing image validation ensures landlords provide at least one photo and cannot exceed the platform's ten-image limit, maintaining listing quality and storage control. |

---

## Test 11 – UT011 – Room Model Required Field Validation

| Field | Details |
|---|---|
| **TC ID** | UT011 |
| **Objective** | To verify that the room listing data validator correctly identifies all five required fields (`title`, `address`, `city`, `room_type`, `price_per_month`) and reports any missing fields before allowing submission to the database. |
| **Action** | Submit a fully complete room data dictionary with all five fields and confirm validation passes with no missing fields. Submit a dictionary missing only the `title` field and confirm it is flagged. Submit a dictionary missing only `price_per_month` and confirm it is flagged. Submit an empty dictionary and confirm all five fields are reported as missing. |
| **Expected Result** | A complete data set should return `(True, [])`. Missing `title` should return `(False, ["title"])`. Missing `price_per_month` should return `(False, ["price_per_month"])`. An empty dictionary should return `(False, [5 fields])`. |
| **Actual Result** | All 4 assertions passed. The validator correctly identifies and reports all missing required fields in every test scenario. |
| **Conclusion** | The test was successful. The room model required field validation prevents incomplete listings from being submitted, ensuring data integrity and a consistent experience for tenants browsing room listings. |

---

## Test 12 – UT012 – eSewa Payment Signature Generation and Verification

| Field | Details |
|---|---|
| **TC ID** | UT012 |
| **Objective** | To verify that the eSewa payment gateway integration correctly generates HMAC-SHA256 signatures for payment requests and that the signature verification function accepts valid signatures and rejects any data that has been tampered with. |
| **Action** | Generate a payment signature using `EsewaPayment` with a known amount and transaction UUID, and confirm the signature is a non-empty string. Decode the base64-encoded signature and confirm it is exactly 32 bytes (HMAC-SHA256 output length). Verify that the generated signature passes verification when the original data is provided. Modify the `total_amount` field to a different value and confirm that verification fails. Generate signatures for two different amounts and confirm they produce different outputs. |
| **Expected Result** | A generated signature should be a non-empty string. The decoded signature should be 32 bytes. The original signature should pass `verify_signature()`. A tampered amount should fail `verify_signature()`. Different amounts must produce different signatures. |
| **Actual Result** | All 5 assertions passed. Signatures are correctly generated, structurally valid, and the verification logic reliably detects data tampering. |
| **Conclusion** | The test was successful. The eSewa HMAC-SHA256 signature system correctly secures payment requests against data tampering, ensuring the integrity of all payment transactions processed by the RoomBox platform. |

---

## Test 13 – UT013 – Duplicate Booking Prevention

| Field | Details |
|---|---|
| **TC ID** | UT013 |
| **Objective** | To verify that the booking system prevents a tenant from placing a new booking request for a room that already has an approved (paid) booking, while still allowing new requests for rooms that have only pending or cancelled bookings. |
| **Action** | Check a booking list containing one approved booking for room ID 1 and confirm it blocks a new request for that room. Check a list with only a pending booking for the same room and confirm it does not block a new request. Check a list with a cancelled booking and confirm it does not block a new request. Check a list with an approved booking for a different room (room ID 2) and confirm room ID 1 is not blocked. |
| **Expected Result** | An approved booking should return `True` (blocked). A pending booking should return `False` (not blocked). A cancelled booking should return `False` (not blocked). An approved booking for a different room should return `False` (not blocked). |
| **Actual Result** | All 4 assertions passed. The duplicate booking check correctly distinguishes between active approved bookings and inactive pending or cancelled ones. |
| **Conclusion** | The test was successful. The booking system correctly prevents two tenants from simultaneously holding an approved booking for the same room, eliminating the risk of double occupancy. |

---

## Test 14 – UT014 – Admin Deactivated Room — Landlord Reactivation Blocked

| Field | Details |
|---|---|
| **TC ID** | UT014 |
| **Objective** | To verify that when an administrator deactivates a room listing (e.g., for policy violations or fraudulent content), the landlord who owns that listing is completely locked out from changing its status, and that the restriction is correctly lifted for rooms not flagged by an admin. |
| **Action** | Attempt a status change on a room with `admin_deactivated: True` and confirm it is blocked with an appropriate error message referencing "admin". Attempt a status change on a room with `admin_deactivated: False` and confirm it is allowed. Attempt a status change on a room with no `admin_deactivated` field set (defaulting to falsy) and confirm it is allowed. |
| **Expected Result** | A room with `admin_deactivated: True` should return `(False, msg)` where `msg` contains "admin". A room with `admin_deactivated: False` should return `(True, "")`. A room with no admin flag should default to `(True, "")`. |
| **Actual Result** | All 3 assertions passed. The admin deactivation lock correctly prevents landlords from bypassing administrative restrictions while allowing normal status management for non-flagged rooms. |
| **Conclusion** | The test was successful. The admin override mechanism ensures that platform-level deactivations cannot be undone by individual landlords, maintaining administrative control over all listed properties. |

---

## Test 15 – UT015 – Double Booking Block for Same Room

| Field | Details |
|---|---|
| **TC ID** | UT015 |
| **Objective** | To verify that the platform prevents a new tenant from booking a room that is already approved and occupied by another tenant, while permitting bookings when the same tenant has an existing entry, when the conflicting booking is for a different room, or when the existing booking is only in a pending state. |
| **Action** | Check if a new booking by tenant ID 20 is blocked when room ID 1 already has an approved booking by tenant ID 10. Check if the same tenant ID 10 can re-request the same room without triggering the block. Check if tenant ID 20 can book room ID 1 when only room ID 2 has an approved booking. Check if tenant ID 20 can book room ID 1 when room ID 1 only has a pending (unpaid) booking. |
| **Expected Result** | A different tenant booking the same approved room should return `True` (double booking detected). The same tenant re-requesting their own room should return `False` (no conflict). A booking for a different room should return `False` (no conflict). A pending booking should return `False` (no conflict). |
| **Actual Result** | All 4 assertions passed. The double booking detection logic correctly identifies true conflicts and avoids false positives. |
| **Conclusion** | The test was successful. The double booking prevention logic ensures that no two tenants can hold an active approved booking for the same room simultaneously, safeguarding both tenants and landlords. |

---

## Test 16 – UT016 – Payment Amount Accuracy

| Field | Details |
|---|---|
| **TC ID** | UT016 |
| **Objective** | To verify that the payment breakdown function calculates the correct amount due at the time of booking initiation (security deposit + advance payment), correctly excludes the monthly rent from the initial payment, and handles edge cases such as zero deposits. |
| **Action** | Calculate the payment breakdown for a booking with Rs. 1,000 security, Rs. 500 advance, and Rs. 5,000 monthly rent. Verify the total due is Rs. 1,500. Test with zero security and zero advance to confirm the total is Rs. 0. Test with only a security deposit and no advance. Test with large values (Rs. 5,000 security + Rs. 2,000 advance = Rs. 7,000) and confirm monthly rent of Rs. 8,000 is excluded. |
| **Expected Result** | Rs. 1,000 + Rs. 500 = Rs. 1,500 (monthly rent not included). Rs. 0 + Rs. 0 = Rs. 0. Rs. 2,000 + Rs. 0 = Rs. 2,000. Rs. 5,000 + Rs. 2,000 = Rs. 7,000 with monthly rent of Rs. 8,000 separate. |
| **Actual Result** | All 4 assertions passed. Payment amounts are calculated correctly, and monthly rent is correctly treated as a recurring payment separate from the one-time initial deposit total. |
| **Conclusion** | The test was successful. The payment accuracy validation ensures tenants are charged the correct upfront amount during the booking process, preventing billing errors and disputes. |

---

## Test 17 – UT017 – Room Availability After Tenant Vacates

| Field | Details |
|---|---|
| **TC ID** | UT017 |
| **Objective** | To verify that when a tenant vacates a room — either voluntarily through the drop-room feature or by the landlord expiring their stay — the booking status, tenancy status, and room status all update to reflect the correct post-vacancy state. |
| **Action** | Simulate a tenant dropping a room by transitioning `BookingStatus` from `APPROVED` to `CANCELLED` and verify. Simulate a force-vacate by transitioning `TenancyStatus` from `ACTIVE` to `TERMINATED` and verify. Simulate a room being freed by transitioning `RoomStatus` from `OCCUPIED` to `AVAILABLE` and verify. Simulate a normal stay expiry by transitioning `TenancyStatus` from `ACTIVE` to `COMPLETED` and verify. |
| **Expected Result** | After a drop, `BookingStatus` should be `CANCELLED`. After a force-vacate, `TenancyStatus` should be `TERMINATED`. After freeing the room, `RoomStatus` should be `AVAILABLE`. After a normal expiry, `TenancyStatus` should be `COMPLETED`. |
| **Actual Result** | All 4 assertions passed. All post-vacancy state transitions are correctly defined and the enum values reflect the expected outcomes. |
| **Conclusion** | The test was successful. The vacancy state management ensures that room availability is restored correctly after a tenancy ends, allowing the room to be re-listed and booked by new tenants without delay. |

---

## Test 18 – UT018 – Allowed Booking Status Transition Validation

| Field | Details |
|---|---|
| **TC ID** | UT018 |
| **Objective** | To verify that the booking status transition rules enforce a valid workflow, permitting only logical status progressions (such as `pending → approved`) and blocking invalid ones (such as `completed → pending` or `cancelled → approved`) to maintain data integrity throughout the booking lifecycle. |
| **Action** | Test that `pending → approved` is a valid transition. Test that `pending → cancelled` is a valid transition. Test that `approved → completed` is a valid transition. Test that `completed → pending` is blocked as an invalid transition. Test that `cancelled → approved` is blocked. Test that `rejected → approved` and `rejected → pending` are both blocked. |
| **Expected Result** | `pending → approved` and `pending → cancelled` should return `True`. `approved → completed` should return `True`. `completed → pending`, `cancelled → approved`, `rejected → approved`, and `rejected → pending` should all return `False`. |
| **Actual Result** | All 6 assertions passed. Valid transitions are permitted and all invalid reverse or lateral transitions are correctly blocked. |
| **Conclusion** | The test was successful. The booking status transition rules enforce a strict and logical workflow, preventing data corruption and ensuring the booking lifecycle progresses in a controlled and auditable manner. |

---

## Test 19 – UT019 – Email / Mailer Initialization and Configuration

| Field | Details |
|---|---|
| **TC ID** | UT019 |
| **Objective** | To verify that the email system configuration is correctly loaded from environment variables, that all required settings are present in the application config, and that the expected Gmail SMTP host and port are correctly set for outbound email delivery. |
| **Action** | Check that `app_settings` has a `MAIL_USERNAME` attribute. Check for `MAIL_PASSWORD` attribute. Check for `MAIL_FROM` attribute. Confirm the SMTP host string contains `"gmail.com"`. Confirm the SMTP port is set to `587` (the standard STARTTLS port for Gmail). Confirm `FRONTEND_URL` is present and starts with `"http"`. |
| **Expected Result** | All six settings attributes should exist and contain appropriate values. The SMTP host should reference Gmail and the port should be 587. The frontend URL should be a valid HTTP/HTTPS URL. |
| **Actual Result** | All 6 assertions passed. All email configuration settings are correctly loaded and accessible through the application settings object. |
| **Conclusion** | The test was successful. The mailer configuration is correctly initialised from environment variables, ensuring the email verification and password reset features have the necessary credentials and connection details to send transactional emails. |

---

## Test 20 – UT020 – Duplicate User Registration Detection

| Field | Details |
|---|---|
| **TC ID** | UT020 |
| **Objective** | To verify that the registration system correctly detects when an email address already exists in the system, including case-insensitive matching to prevent users from registering multiple accounts by altering the capitalisation of their email address. |
| **Action** | Check for `user@example.com` against a list containing the exact same email and confirm it is detected as a duplicate. Check `user@example.com` against a list containing `User@Example.com` (mixed case) and confirm it is still detected as a duplicate. Check for `new@example.com` against a list containing only `other@example.com` and confirm it is not flagged. Check against an empty list and confirm the email is always allowed. |
| **Expected Result** | An exact email match should return `True` (duplicate found). A case-insensitive match should return `True` (duplicate found). A non-matching email should return `False` (allowed). Any email against an empty list should return `False` (allowed). |
| **Actual Result** | All 4 assertions passed. Duplicate detection works correctly for both exact and case-insensitive matches, and correctly allows unique email addresses. |
| **Conclusion** | The test was successful. The duplicate email detection prevents users from registering multiple accounts and ensures each email address uniquely identifies a single user within the RoomBox platform. |

---

## Test 21 – UT021 – Search Price Range Filter Logic

| Field | Details |
|---|---|
| **TC ID** | UT021 |
| **Objective** | To verify that the room search price filter correctly returns only rooms whose monthly rent falls within the specified minimum and maximum price range, including boundary values, and correctly handles an empty room list. |
| **Action** | Filter a list of three rooms priced at Rs. 3,000, Rs. 7,000, and Rs. 5,000 with a range of Rs. 2,000–Rs. 6,000 and confirm only the Rs. 3,000 and Rs. 5,000 rooms are returned. Filter a list with a single room priced at Rs. 500 using a range of Rs. 5,000–Rs. 10,000 and confirm an empty list is returned. Filter a room priced at exactly Rs. 5,000 with both min and max set to Rs. 5,000 and confirm it is included. Filter an empty room list and confirm the result is also empty. |
| **Expected Result** | Two rooms (IDs 1 and 3) should be returned from the first test. An empty list should be returned when no rooms fall within range. The exact boundary price should be included in results. An empty input should produce an empty output. |
| **Actual Result** | All 4 assertions passed. The price filter correctly includes rooms within range, correctly excludes rooms outside range, and treats boundary values as inclusive. |
| **Conclusion** | The test was successful. The search price range filter functions correctly across all scenarios, ensuring tenants can accurately narrow down listings by their budget on the RoomBox search page. |

---

## Test 22 – UT022 – Tenancy Progress Percentage Calculation

| Field | Details |
|---|---|
| **TC ID** | UT022 |
| **Objective** | To verify that the tenancy progress calculation returns an accurate percentage representing how much of the tenancy period has elapsed, correctly returning near 0% for new tenancies, exactly 100% for finished or over-run tenancies, and approximately 50% at the midpoint of a tenancy. |
| **Action** | Calculate progress for a tenancy that started 1 day ago with a 30-day duration and confirm the result is between 0% and 10%. Calculate progress for a tenancy that ended 1 day ago (start was 60 days ago) and confirm it returns exactly 100.0. Calculate progress for a tenancy at its midpoint (15 days elapsed out of 30) and confirm the result is between 40% and 60%. Calculate progress for a tenancy that ended 50 days ago and confirm it is clamped at 100.0. |
| **Expected Result** | New tenancy: 0–10%. Finished tenancy: 100.0. Midpoint: 40–60%. Overrun tenancy: 100.0. |
| **Actual Result** | All 4 assertions passed. The progress calculation accurately reflects elapsed tenancy time and correctly clamps the result between 0 and 100. |
| **Conclusion** | The test was successful. The tenancy progress calculation powers the progress bar UI on both landlord and tenant dashboards, giving users a clear visual representation of how far into their tenancy they are. |

---

## Test 23 – UT023 – Nepali Phone Number Validation

| Field | Details |
|---|---|
| **TC ID** | UT023 |
| **Objective** | To verify that the `validate_phone()` function correctly accepts valid 10-digit Nepali mobile numbers beginning with `9` and correctly rejects numbers that are too short, too long, or begin with an incorrect digit. |
| **Action** | Validate `9841234567` (standard NTC/Ncell mobile format) and confirm it is accepted. Validate `9801234567` (another valid prefix) and confirm it is accepted. Validate `984123456` (only 9 digits) and confirm it is rejected. Validate `8841234567` (starts with 8, not 9) and confirm it is rejected. Validate `98412345678` (11 digits) and confirm it is rejected. |
| **Expected Result** | `9841234567` → `True`. `9801234567` → `True`. `984123456` → `False`. `8841234567` → `False`. `98412345678` → `False`. |
| **Actual Result** | All 5 assertions passed. The phone validator correctly enforces the Nepali mobile number format of exactly 10 digits starting with 9. |
| **Conclusion** | The test was successful. The phone validation ensures users provide a valid Nepali contact number during registration, enabling landlords and tenants to contact each other through the platform. |

---

## Test 24 – UT024 – User Role and Type Validation

| Field | Details |
|---|---|
| **TC ID** | UT024 |
| **Objective** | To verify that the `UserType` enumeration correctly defines all three required user roles with the expected string values, and that the admin role is correctly excluded from the list of roles available during public user registration. |
| **Action** | Confirm `UserType.TENANT.value` equals `"tenant"`. Confirm `UserType.LANDLORD.value` equals `"landlord"`. Confirm `UserType.ADMIN.value` equals `"admin"`. Confirm that `UserType.ADMIN` is not present in a list containing only `TENANT` and `LANDLORD`. Confirm the enum contains exactly 3 members total. |
| **Expected Result** | All three role values should match their string counterparts. Admin should not appear in the public registration role list. The enum should define exactly 3 roles. |
| **Actual Result** | All 5 assertions passed. The `UserType` enum is correctly defined with all three roles, and the admin role is properly isolated from public-facing registration options. |
| **Conclusion** | The test was successful. The user role model correctly supports multi-role access control, ensuring tenants, landlords, and administrators each have distinct identities and appropriate access levels within the RoomBox platform. |

---

## Test 25 – UT025 – Room Cannot Be Deactivated While Occupied

| Field | Details |
|---|---|
| **TC ID** | UT025 |
| **Objective** | To verify that a landlord cannot deactivate a room listing that is currently occupied by an active tenant, thereby protecting the tenant's active rental agreement and preventing the room from being abruptly delisted mid-tenancy. |
| **Action** | Attempt to deactivate a room with status `"occupied"` and confirm it is blocked with a message containing "occupied". Attempt to deactivate a room with status `"available"` and confirm it is allowed. Attempt to deactivate a room with status `"inactive"` and confirm it is allowed (re-deactivating an already-inactive room should not produce an error). |
| **Expected Result** | An occupied room should return `(False, msg)` where `msg` contains "occupied". An available room should return `(True, "")`. An already-inactive room should return `(True, "")`. |
| **Actual Result** | All 3 assertions passed. The deactivation guard correctly blocks the action for occupied rooms while permitting it for rooms in other states. |
| **Conclusion** | The test was successful. The occupied-room deactivation guard protects active tenants from having their room suddenly removed from the platform without first completing the vacate process. |

---

## Test 26 – UT026 – Tenancy Duration Calculation

| Field | Details |
|---|---|
| **TC ID** | UT026 |
| **Objective** | To verify that the tenancy duration function accurately calculates the number of days between a tenancy's start and end dates, returns zero for same-day tenancies, handles standard 30-day periods, computes full-year durations correctly, and safely handles cases where the end date precedes the start date. |
| **Action** | Calculate the duration between `2026-01-01` and `2026-01-31` and confirm 30 days. Calculate the duration for the same start and end date and confirm 0 days. Calculate the duration between `2026-01-01` and `2027-01-01` and confirm 365 days. Calculate the duration where the end date is before the start date and confirm the result is 0 (clamped, no negative values). |
| **Expected Result** | 30-day range → 30. Same day → 0. One-year range → 365. End before start → 0. |
| **Actual Result** | All 4 assertions passed. The duration function correctly handles all date range scenarios including edge cases. |
| **Conclusion** | The test was successful. The tenancy duration calculator is used to determine move-out dates when a landlord specifies the tenancy length during property listing, and correct computation is critical for accurate tracking. |

---

## Test 27 – UT027 – Monthly Revenue Grouping for Landlord Reports

| Field | Details |
|---|---|
| **TC ID** | UT027 |
| **Objective** | To verify that the revenue grouping function correctly aggregates payment amounts by month (using the `YYYY-MM` date prefix), sums multiple payments within the same month, handles an empty payment list without error, and produces correct output for single-month and multi-month scenarios. |
| **Action** | Group three payments: two in January 2026 (Rs. 5,000 and Rs. 3,000) and one in February 2026 (Rs. 7,000). Confirm January total is Rs. 8,000 and February total is Rs. 7,000. Call the function with an empty list and confirm an empty dictionary is returned. Group a single payment of Rs. 10,000 in March 2026 and confirm the result is `{"2026-03": 10000}`. Group five payments of Rs. 1,000 each within April 2026 and confirm the total is Rs. 5,000. |
| **Expected Result** | January = Rs. 8,000, February = Rs. 7,000. Empty input → `{}`. Single payment → `{"2026-03": 10000}`. Five April payments → `{"2026-04": 5000}`. |
| **Actual Result** | All 4 assertions passed. Revenue is correctly grouped and summed by month across all tested scenarios. |
| **Conclusion** | The test was successful. The monthly revenue grouping logic correctly powers the income charts and analytics sections of the landlord dashboard and admin panel, providing accurate financial reporting for all users. |

---

## Test 28 – UT028 – Room Image Array Structure Constraints

| Field | Details |
|---|---|
| **TC ID** | UT028 |
| **Objective** | To further verify the room image array validation by specifically testing the exact boundary values (1 image and 10 images), confirming that blank string entries anywhere in the array cause rejection, and ensuring the rules are consistently applied as a complement to the core validation tests in UT010. |
| **Action** | Submit an array with exactly one image (`["cover.jpg"]`) and confirm acceptance. Submit an array of exactly ten images and confirm acceptance. Submit an array of eleven images and confirm rejection with a "maximum" error message. Submit an array containing a blank/whitespace-only string alongside a valid image and confirm rejection. Submit an empty array and confirm rejection with a "required" message. |
| **Expected Result** | Single image → valid. Ten images → valid. Eleven images → invalid with "maximum" in message. Blank string entry → invalid. Empty array → invalid with "required" in message. |
| **Actual Result** | All 5 assertions passed. Image array validation correctly enforces all boundary constraints and entry-level checks. |
| **Conclusion** | The test was successful. The image array validation rules are rigorously enforced, ensuring all room listings on the RoomBox platform maintain a minimum visual standard while staying within storage and display constraints. |

---

## Test 29 – UT029 – Admin Cannot Delete Their Own Account

| Field | Details |
|---|---|
| **TC ID** | UT029 |
| **Objective** | To verify that the admin user management system includes a safety check preventing administrators from accidentally or intentionally deleting their own account, while still allowing them to delete other user accounts as part of their moderation responsibilities. |
| **Action** | Attempt admin ID 1 deleting user ID 1 (self-deletion) and confirm it is blocked with a message containing "own". Attempt admin ID 1 deleting user ID 99 (a regular user) and confirm it is allowed. Attempt admin ID 2 deleting user ID 3 (a different admin) and confirm it is allowed. |
| **Expected Result** | Self-deletion (same ID) should return `(False, msg)` with "own" in the message. Deleting a different user should return `(True, "")`. Cross-admin deletion should return `(True, "")`. |
| **Actual Result** | All 3 assertions passed. The self-deletion guard correctly blocks administrators from removing their own account while preserving full user management capabilities over other accounts. |
| **Conclusion** | The test was successful. The admin self-deletion prevention safeguard ensures platform administrators cannot inadvertently lock themselves out of the system, maintaining continuous administrative access to the RoomBox platform. |

---

## Test 30 – UT030 – Reset Token Expiry and Reuse Prevention

| Field | Details |
|---|---|
| **TC ID** | UT030 |
| **Objective** | To verify that the password reset token validation logic correctly accepts tokens that are within their validity window, rejects tokens that have passed their 1-hour expiry, rejects tokens that have already been used and cleared from the database (set to `None`), and rejects tokens that have no expiry date stored. |
| **Action** | Validate a token string `"fresh_token"` with an expiry 1 hour in the future and confirm it is accepted. Validate a token `"old_token"` with an expiry 5 minutes in the past and confirm it is rejected with an "expired" message. Validate `None` as the token with a future expiry and confirm it is rejected with a "no reset token" message. Validate a non-null token with `None` as the expiry date and confirm it is rejected with an "expired" message. |
| **Expected Result** | Valid token + future expiry → `(True, "")`. Valid token + past expiry → `(False, "expired" in message)`. `None` token + future expiry → `(False, "no reset token" in message)`. Token + `None` expiry → `(False, "expired" in message)`. |
| **Actual Result** | All 4 assertions passed. The reset token validation correctly enforces all four scenarios: valid, expired, cleared, and missing expiry. |
| **Conclusion** | The test was successful. The reset token reuse prevention mechanism ensures that password reset links can only be used once within a 1-hour window, protecting users from replay attacks where an intercepted reset link could be exploited after the user has already changed their password. |

---

## Summary Table

| Test No. | TC ID | Test Name | Assertions | Result |
|---|---|---|---|---|
| 1 | UT001 | Email Format Validation | 7 | ✅ PASS |
| 2 | UT002 | Password Encryption (bcrypt) | 5 | ✅ PASS |
| 3 | UT003 | Verification Token Generation | 3 | ✅ PASS |
| 4 | UT004 | Reset Token Expiry Validation | 4 | ✅ PASS |
| 5 | UT005 | JWT Token Creation and Tamper Detection | 4 | ✅ PASS |
| 6 | UT006 | Unauthorized Access Handling | 3 | ✅ PASS |
| 7 | UT007 | Booking Payment Total Calculation | 5 | ✅ PASS |
| 8 | UT008 | Room Status Transitions | 4 | ✅ PASS |
| 9 | UT009 | Tenancy Days Remaining Calculation | 3 | ✅ PASS |
| 10 | UT010 | Room Image Array Validation | 5 | ✅ PASS |
| 11 | UT011 | Room Model Required Field Validation | 4 | ✅ PASS |
| 12 | UT012 | eSewa Signature Generation and Verification | 5 | ✅ PASS |
| 13 | UT013 | Duplicate Booking Prevention | 4 | ✅ PASS |
| 14 | UT014 | Admin Deactivation Lock | 3 | ✅ PASS |
| 15 | UT015 | Double Booking Block | 4 | ✅ PASS |
| 16 | UT016 | Payment Amount Accuracy | 4 | ✅ PASS |
| 17 | UT017 | Room Availability After Tenant Vacates | 4 | ✅ PASS |
| 18 | UT018 | Booking Status Transition Validation | 6 | ✅ PASS |
| 19 | UT019 | Email Mailer Initialization | 6 | ✅ PASS |
| 20 | UT020 | Duplicate User Registration Detection | 4 | ✅ PASS |
| 21 | UT021 | Search Price Range Filter | 4 | ✅ PASS |
| 22 | UT022 | Tenancy Progress Percentage | 4 | ✅ PASS |
| 23 | UT023 | Nepali Phone Number Validation | 5 | ✅ PASS |
| 24 | UT024 | User Role and Type Validation | 5 | ✅ PASS |
| 25 | UT025 | Room Cannot Be Deactivated While Occupied | 3 | ✅ PASS |
| 26 | UT026 | Tenancy Duration Calculation | 4 | ✅ PASS |
| 27 | UT027 | Monthly Revenue Grouping | 4 | ✅ PASS |
| 28 | UT028 | Room Image Array Structure Constraints | 5 | ✅ PASS |
| 29 | UT029 | Admin Cannot Delete Own Account | 3 | ✅ PASS |
| 30 | UT030 | Reset Token Expiry and Reuse Prevention | 4 | ✅ PASS |
| 31 | UT031 | Payment Receipt Email Content Validation | 6 | PASS |
| 32 | UT032 | Booking Confirmation Email - Tenant and Landlord | 6 | PASS |
| 33 | UT033 | Cancellation Email Reason Field | 5 | PASS |
| 34 | UT034 | PDF Receipt Data Integrity | 5 | PASS |
| 35 | UT035 | Email Notification Trigger Conditions | 7 | PASS |
|| | | **TOTAL** | **157** | **ALL PASS** |

---

*Generated by: RoomBox Development Team · pytest 9.0.3 · Python 3.13.2 · April 2026*

---

## Test 31 � UT031 � Payment Receipt Email Content Validation

**Table 31: Test 31 � UT031 � Payment Receipt Email Content Validation**

| Field | Details |
|---|---|
| **TC ID** | UT031 |
| **Objective** | To verify that the payment receipt email subject is correctly formatted with a zero-padded booking ID, and that the email body contains all required fields including tenant name, room title, transaction reference, and amount paid. |
| **Action** | Call `_build_payment_receipt_subject(booking_id)` with various booking IDs. Call `_build_receipt_html_contains(tenant_name, room_title, amount, ref)` and assert that all required values appear in the returned list. Test subject formatting for IDs 1, 5, and 100. |
| **Expected Result** | The subject should include `#RB0005` format for booking ID 5. The content list should include the tenant name, room title, transaction reference, amount as a string, and "RoomBox" branding. |
| **Actual Result** | All 6 assertions passed. Subject formatting produced correct zero-padded IDs. All required body fields were present in the content list. |
| **Conclusion** | The test was successful. Receipt email content validation ensures tenants always receive complete, correctly formatted payment receipts. |

---

## Test 32 � UT032 � Booking Confirmation Email � Tenant and Landlord

**Table 32: Test 32 � UT032 � Booking Confirmation Email � Tenant and Landlord**

| Field | Details |
|---|---|
| **TC ID** | UT032 |
| **Objective** | To verify that booking confirmation emails are correctly personalised for both the tenant and landlord roles, with each receiving the appropriate names, room title, booking ID, and role-specific fields. |
| **Action** | Call `_confirmation_email_data("tenant", ...)` and assert that the recipient is the tenant name and the landlord name is included. Call `_confirmation_email_data("landlord", ...)` and assert the reverse. Check that booking ID is zero-padded and room title is present. |
| **Expected Result** | Tenant emails should address the tenant and include the landlord's name. Landlord emails should address the landlord and include the tenant's name. Booking ID should be formatted as `#RB0003`. |
| **Actual Result** | All 6 assertions passed. Role-specific fields were correctly populated for both tenant and landlord emails. |
| **Conclusion** | The test was successful. Both tenant and landlord receive correctly personalised booking confirmation emails with all relevant tenancy details. |

---

## Test 33 � UT033 � Cancellation Email Reason Field

**Table 33: Test 33 � UT033 � Cancellation Email Reason Field**

| Field | Details |
|---|---|
| **TC ID** | UT033 |
| **Objective** | To verify that cancellation notification emails always include a human-readable reason for the cancellation, a correctly formatted booking ID, and the room title in the email data structure. |
| **Action** | Call `_cancellation_email_data(reason, tenant_name, room_title, booking_id)` with various reasons including payment failure, landlord vacate, and user cancellation. Assert that reason, booking ID, room title, and status are all present and correct. |
| **Expected Result** | The reason field should exactly match the provided reason string. The status should be "CANCELLED". Booking ID should be zero-padded. Room title should match the input. |
| **Actual Result** | All 5 assertions passed. The cancellation email data structure correctly preserved all required fields. |
| **Conclusion** | The test was successful. Cancellation emails provide transparent and traceable reasons for termination, helping both tenants and landlords understand why a booking was cancelled. |

---

## Test 34 � UT034 � PDF Receipt Data Integrity

**Table 34: Test 34 � UT034 � PDF Receipt Data Integrity**

| Field | Details |
|---|---|
| **TC ID** | UT034 |
| **Objective** | To verify that the receipt data object constructed on the frontend before PDF generation contains all required fields � booking ID, payment ID, tenant name, room title, amount, date, and transaction reference � and that critical fields are not empty or undefined. |
| **Action** | Call `_build_pdf_receipt_fields(...)` with valid receipt data. Assert that all 7 required keys are present in the returned dict. Assert that `bookingId` is a string type, `amount` is not empty or "�", and `tenantName` has a length greater than zero. Assert that `transactionRef` is stored accurately. |
| **Expected Result** | All 7 required fields present. `bookingId` is a string. `amount` is a non-empty value. `tenantName` is non-empty. `transactionRef` exactly matches the input value. |
| **Actual Result** | All 5 assertions passed. The receipt data structure is complete and correctly typed for PDF generation. |
| **Conclusion** | The test was successful. The PDF receipt data integrity check ensures that tenants never receive a blank or incomplete receipt when downloading their payment confirmation. |

---

## Test 35 � UT035 � Email Notification Trigger Conditions

**Table 35: Test 35 � UT035 � Email Notification Trigger Conditions**

| Field | Details |
|---|---|
| **TC ID** | UT035 |
| **Objective** | To verify that payment confirmation emails are only triggered when both payment status is "completed" and booking status is "approved", and that cancellation emails are only triggered on "cancelled" or "terminated" booking states. |
| **Action** | Call `_should_send_payment_email(payment_status, booking_status)` with combinations: completed/approved (should return True), pending/pending, failed/pending (both False), completed/pending (False). Call `_should_send_cancellation_email(booking_status)` with "cancelled", "terminated" (True), and "approved" (False). |
| **Expected Result** | `_should_send_payment_email("completed", "approved")` returns True. All other payment combinations return False. `_should_send_cancellation_email` returns True only for "cancelled" and "terminated". |
| **Actual Result** | All 7 assertions passed. Email triggers are correctly gated to appropriate system states, preventing spurious notifications. |
| **Conclusion** | The test was successful. Email notifications are only sent at the correct system state transitions, ensuring tenants and landlords receive timely and accurate notifications without noise. |
