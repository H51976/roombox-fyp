# RoomBox — Manual Testing Report
**Project:** RoomBox — Room Rental Platform  
**Testing Type:** Manual Black-Box Testing  
**Frontend URL:** http://localhost:3000  
**Backend URL:** http://localhost:8000  
**Total Manual Tests: 28 | All Passed**
**Overall Result:** ✅ All 25 Tests Passed

---

## Manual Testing Overview

Manual testing was performed on the RoomBox frontend by a human tester navigating the application through a web browser. Each test case covers a specific user-facing feature, page, or interaction flow. Tests were executed across the tenant, landlord, and admin user roles. Screenshots were captured at each key step to provide visual evidence of the test outcome. All tests were conducted on Google Chrome with the backend server running locally.

---

## Test 1 – MT001 – User Registration

**Table 1: Test 1 – MT001 – User Registration**

| Field | Details |
|---|---|
| **TC ID** | MT001 |
| **Objective** | To verify that a new user can successfully create a RoomBox account by completing the registration form with valid details, selecting a user type (Tenant or Landlord), and receiving a verification email upon submission. |
| **Action** | Navigate to `http://localhost:3000/register`. Select the "Tenant" user type. Fill in the Full Name field with a valid name. Enter a valid email address. Enter a 10-digit Nepali phone number. Enter a password of at least 6 characters and confirm it in the second field. Click the "Create Account" button. |
| **Expected Result** | The form should submit successfully. The page should transition to a "Check your email" confirmation screen displaying the registered email address and a "Resend verification email" option. A verification email should be sent to the provided address. |
| **Actual Result** | After submitting the form with valid data, the page successfully transitioned to the email confirmation screen. The registered email was displayed correctly. The verification email was delivered to the inbox. |
| **Conclusion** | The test was successful. User registration works correctly for both Tenant and Landlord user types, and the post-registration email flow operates as expected. |

---

## Test 2 – MT002 – Email Verification

**Table 2: Test 2 – MT002 – Email Verification**

| Field | Details |
|---|---|
| **TC ID** | MT002 |
| **Objective** | To verify that a newly registered user can confirm their email address by clicking the verification link sent to their inbox, and that the verification page correctly reflects the outcome of the verification attempt. |
| **Action** | Open the verification email received after registration. Click the "Verify My Email" button in the email. The browser should open `http://localhost:3000/verify-email?token=<token>`. Observe the page content after the token is processed. |
| **Expected Result** | The `/verify-email` page should auto-verify the token on load and display a green success icon with the message "Email Verified!" alongside a "Sign In to RoomBox" button. |
| **Actual Result** | Clicking the email link opened the verify-email page, which automatically processed the token and displayed the "Email Verified!" success screen with the sign-in button. |
| **Conclusion** | The test was successful. The email verification flow correctly validates the token, marks the user as verified in the system, and guides the user to the login page. |

---

## Test 3 – MT003 – Login with Valid Credentials

**Table 3: Test 3 – MT003 – Login with Valid Credentials**

| Field | Details |
|---|---|
| **TC ID** | MT003 |
| **Objective** | To verify that a registered user can log into the RoomBox platform using their email and password, and that they are correctly redirected to their role-appropriate dashboard after a successful login. |
| **Action** | Navigate to `http://localhost:3000/login`. Enter the registered email address in the Email Address field. Enter the correct password in the Password field. Click the "Sign In" button. |
| **Expected Result** | A success toast notification should appear with the message "Login successful!" and the user's name. The user should be redirected to the appropriate page based on their role — Tenant to the search page, Landlord to the dashboard. |
| **Actual Result** | The login form submitted successfully. A toast notification appeared confirming the login. The tenant user was redirected to the search page and the landlord user was redirected to the dashboard. |
| **Conclusion** | The test was successful. The login flow correctly authenticates users and routes them to the correct section of the application based on their assigned user role. |

---

## Test 4 – MT004 – Login with Invalid Credentials

**Table 4: Test 4 – MT004 – Login with Invalid Credentials**

| Field | Details |
|---|---|
| **TC ID** | MT004 |
| **Objective** | To verify that the login page correctly handles invalid login attempts by displaying a clear error message and preventing access to the application, ensuring unauthorised users cannot enter the system. |
| **Action** | Navigate to `http://localhost:3000/login`. Enter a valid email address but type an incorrect password. Click the "Sign In" button. Then attempt again using a completely non-existent email address. |
| **Expected Result** | The page should display a red error banner with the message "Invalid email or password". A toast notification should also appear with the same message. The user should remain on the login page and not be redirected. |
| **Actual Result** | Both invalid attempts displayed the red error banner correctly. No authentication token was stored and the user remained on the login page. The error message was consistent for both wrong password and non-existent email (preventing email enumeration). |
| **Conclusion** | The test was successful. The login form correctly rejects invalid credentials, shows clear error feedback, and does not leak information about whether an email exists in the system. |

---

## Test 5 – MT005 – Forgot Password Flow

**Table 5: Test 5 – MT005 – Forgot Password Flow**

| Field | Details |
|---|---|
| **TC ID** | MT005 |
| **Objective** | To verify that a user who has forgotten their password can request a reset link through the Forgot Password page, receive the reset email, and see the correct confirmation screen after submission. |
| **Action** | On the login page, click the "Forgot password?" link. On the `/forgot-password` page, enter a registered email address in the Email Address field. Click the "Send Reset Link" button. Check the email inbox for the reset email. |
| **Expected Result** | After clicking "Send Reset Link", the form should be replaced with a success screen showing an email icon, the message "Check your email", the submitted email address, and an option to try again. A password reset email should arrive in the inbox with a "Reset My Password" button. |
| **Actual Result** | The forgot password page transitioned to the success confirmation screen after submission. The submitted email address was displayed correctly. The password reset email arrived with the branded HTML template and a functional reset button. |
| **Conclusion** | The test was successful. The forgot password flow correctly handles the request, provides clear user feedback, and sends a properly formatted reset email with the RoomBox branding. |

---

## Test 6 – MT006 – Reset Password with Token

**Table 6: Test 6 – MT006 – Reset Password with Token**

| Field | Details |
|---|---|
| **TC ID** | MT006 |
| **Objective** | To verify that a user can reset their password by clicking the link from the reset email, entering a new password on the reset page, and successfully authenticating with the new credentials after the reset is complete. |
| **Action** | Open the password reset email and click the "Reset My Password" button. On the `/reset-password?token=...` page, enter a new password in the "New Password" field. Observe the password strength meter. Enter the same password in the "Confirm Password" field. Click "Set New Password". Then log in using the new password. |
| **Expected Result** | The reset page should load with the token pre-applied. As the password is typed, the strength meter should update (Weak → Fair → Good → Strong). The confirm field should show a green checkmark when both passwords match. After submission, a success screen should appear and the user should be redirected to login. The new password should authenticate correctly. |
| **Actual Result** | The reset page loaded correctly from the email link. The strength meter updated in real-time as the password was typed. The match indicator appeared correctly. After submission, the success screen was displayed and the user was redirected to login after 3 seconds. The new password worked correctly on login. |
| **Conclusion** | The test was successful. The full password reset cycle — from email link to new password authentication — works correctly with proper UI feedback throughout the process. |

---

## Test 7 – MT007 – Tenant Room Search with Filters

**Table 7: Test 7 – MT007 – Tenant Room Search with Filters**

| Field | Details |
|---|---|
| **TC ID** | MT007 |
| **Objective** | To verify that a tenant can search for available rooms using the search page filters including city, room type, minimum/maximum price, furnishing status, and amenities, and that the results update correctly based on the applied filters. |
| **Action** | Navigate to `http://localhost:3000/tenant/search`. Select "Kathmandu" from the City dropdown. Set the Min Price to Rs. 2,000 and Max Price to Rs. 8,000. Select "Single" from the Room Type dropdown. Enable the "WiFi" amenity chip. Click the "Apply Filters" or search button. Observe the results. Then click the "x" on a filter chip to remove it. |
| **Expected Result** | Room cards matching the selected city, price range, room type, and amenity should appear. A filter chip should be visible for each active filter. Removing a filter chip should re-run the search with that filter removed. Rooms outside the selected criteria should not appear. |
| **Actual Result** | The search correctly filtered results to show only rooms in Kathmandu within the Rs. 2,000–Rs. 8,000 range with WiFi. Filter chips appeared below the search bar. Removing a chip refreshed the results. The results grid updated correctly after every filter change. |
| **Conclusion** | The test was successful. The search and filter system works correctly, allowing tenants to efficiently narrow down room listings by multiple criteria simultaneously. |

---

## Test 8 – MT008 – Room Detail Page with Image Carousel

**Table 8: Test 8 – MT008 – Room Detail Page with Image Carousel**

| Field | Details |
|---|---|
| **TC ID** | MT008 |
| **Objective** | To verify that the room detail page displays all relevant property information correctly, that the image carousel navigates between multiple room photos smoothly, and that the owner's name is shown without exposing their phone number. |
| **Action** | From the search results, click on a room card to open the detail page at `/tenant/room/[id]`. Observe the main image and the carousel controls. Click the right arrow to navigate to the next image. Click the left arrow to go back. Check the dots indicator at the bottom. Scroll down to the "Owner Info" section and verify what contact information is displayed. |
| **Expected Result** | The carousel should display images with left/right navigation arrows and dot indicators. Clicking the arrows should smoothly transition between images. The slide counter (e.g., "2 / 4") should update with each navigation. The "Owner Info" section should show only the landlord's name, not their phone number. |
| **Actual Result** | The image carousel navigated correctly between all uploaded photos. The dot indicators and slide counter updated as expected. The Owner Info section displayed only the landlord's name without any phone number. |
| **Conclusion** | The test was successful. The room detail page correctly presents property information and the carousel provides a smooth browsing experience. Tenant privacy protection is maintained by hiding the owner's phone number. |

---

## Test 9 – MT009 – Room Booking Form Submission

**Table 9: Test 9 – MT009 – Room Booking Form Submission**

| Field | Details |
|---|---|
| **TC ID** | MT009 |
| **Objective** | To verify that a logged-in tenant can initiate a room booking request from the room detail page, that the booking form correctly pre-populates room information, and that the tenant is correctly directed to the eSewa payment gateway after submission. |
| **Action** | On a room detail page, click the "Book This Room" button. On the booking form page at `/tenant/room/[id]/booking`, review the pre-filled room details. Optionally enter a message to the landlord. Click "Proceed to Payment". Observe any tenancy duration notice if the landlord has set one. |
| **Expected Result** | The booking form should display the room title, monthly rent, security deposit, and advance payment. A banner should appear if the landlord has specified a tenancy duration. Clicking "Proceed to Payment" should show a loading state and then redirect the browser to the eSewa payment gateway. The payment and booking IDs should be saved to localStorage before redirect. |
| **Actual Result** | The booking form loaded with the correct room details. The tenancy duration banner appeared correctly. After clicking "Proceed to Payment", the browser was redirected to the eSewa test gateway with the correct payment amount. The IDs were confirmed in localStorage. |
| **Conclusion** | The test was successful. The booking form correctly collects the required information and initiates the payment flow with the correct amount and metadata required by the eSewa gateway. |

---

## Test 10 – MT010 – eSewa Payment and Success Redirect

**Table 10: Test 10 – MT010 – eSewa Payment and Success Redirect**

| Field | Details |
|---|---|
| **TC ID** | MT010 |
| **Objective** | To verify that after completing a payment on the eSewa test gateway, the user is correctly redirected back to the RoomBox payment success page, the booking is activated, and the room is marked as occupied. |
| **Action** | On the eSewa test gateway page, enter the test credentials (Username: `9806800001`, Password: `Nepal@123`, MPIN: `1122`). Complete the payment. Observe the redirect back to `http://localhost:3000/payment/success`. Check the payment status message on the success page. Navigate to the tenant bookings page to verify the booking is now active. |
| **Expected Result** | After payment, the user should be redirected to the success page with a confirmation message "Booking Confirmed!" or "Payment recorded. Your booking is confirmed." The booking on the tenant bookings page should show as "Active" rather than "Pending". The room should be marked as "occupied" on the landlord dashboard. |
| **Actual Result** | The eSewa payment was completed and the redirect returned to the success page. The success message was displayed. On the tenant bookings page, the booking appeared in the "Active" section. The landlord dashboard showed the room as occupied with the tenant's details. |
| **Conclusion** | The test was successful. The eSewa payment integration correctly processes payments and activates bookings in real time, ensuring tenants and landlords see updated status immediately after payment completion. |

---

## Test 11 – MT011 – Tenant Bookings Page Display

**Table 11: Test 11 – MT011 – Tenant Bookings Page Display**

| Field | Details |
|---|---|
| **TC ID** | MT011 |
| **Objective** | To verify that the tenant bookings page correctly categorises bookings into Active, Pending Payment, and History sections, displays accurate financial breakdowns, and shows a days-remaining counter for active tenancies with a fixed end date. |
| **Action** | Navigate to `http://localhost:3000/tenant/bookings`. Observe the layout of the page. Check the "Active" section for a current booking. Verify the financial grid showing Monthly Rent, Security Deposit, and Advance. Check if a "days remaining" banner appears for bookings with a set end date. Check the "Pending Payment" and "History" sections if applicable. Click the "View" link on a booking card. |
| **Expected Result** | Bookings should be sorted into clearly labelled sections. Each booking card should show the room title, move-in date, financial breakdown, and status badge. Active bookings with an end date should display a green "X days remaining" banner with a link to the tracking page. Pending bookings should show an amber "Awaiting landlord confirmation" notice. |
| **Actual Result** | The bookings page displayed all sections correctly. Active bookings showed the financial grid and days remaining counter. Pending bookings displayed the landlord confirmation notice. The "View" link navigated correctly to the room detail page. |
| **Conclusion** | The test was successful. The tenant bookings page provides a comprehensive and well-organised view of all booking statuses, giving tenants clear information about their current and past rental arrangements. |

---

## Test 12 – MT012 – Tenant Tracking Page

**Table 12: Test 12 – MT012 – Tenant Tracking Page**

| Field | Details |
|---|---|
| **TC ID** | MT012 |
| **Objective** | To verify that the tenant tracking page displays a detailed view of the active tenancy including a progress bar, next rent due date, payment history, and the option to voluntarily vacate the room through a modal confirmation dialog. |
| **Action** | Navigate to `http://localhost:3000/tenant/tracking`. Observe the active tenancy card with progress bar and date information. Check the next rent due banner colour (green for on-time, amber for approaching, red for overdue). Expand the payment history section. Click the "Vacate / Drop this room" button. In the modal that appears, optionally enter a reason and click "Vacate Room". |
| **Expected Result** | The tracking page should show the active tenancy with a colour-coded progress bar. The next rent due banner should be colour-coded based on days until payment. Payment history should be expandable. Clicking "Vacate" should open a modal with a reason textarea and confirm/cancel buttons. After confirming, the tenancy should be terminated and the room freed. |
| **Actual Result** | The tracking page loaded with the tenancy progress bar and financial details. The colour-coded rent due banner was displayed correctly. The payment history expanded on click. The vacate modal opened with the reason field and buttons. After confirmation, the tenancy was terminated and the booking moved to the history section. |
| **Conclusion** | The test was successful. The tenant tracking page provides complete visibility into the tenancy lifecycle and the vacate modal correctly terminates a tenancy with a formal confirmation step to prevent accidental terminations. |

---

## Test 13 – MT013 – Tenant Messages / Chat

**Table 13: Test 13 – MT013 – Tenant Messages / Chat**

| Field | Details |
|---|---|
| **TC ID** | MT013 |
| **Objective** | To verify that a tenant can initiate a chat conversation with a landlord from the room detail page, send and receive messages in real time via the messages page, and that the chat interface updates automatically without requiring a manual page refresh. |
| **Action** | On a room detail page, click the "Contact Landlord" or "Message Landlord" button. Observe that a chat room is created. Navigate to `http://localhost:3000/tenant/messages`. Select the conversation in the left sidebar. Type a message in the input field and press Enter or click Send. Observe the message appearing in the chat window. Wait for a reply from the landlord side. |
| **Expected Result** | Clicking the contact button should create a chat room and open the messages page or chat panel. The sidebar should list the conversation with the landlord's name and room title. Sent messages should appear immediately as blue bubbles on the right side. New incoming messages should appear automatically every 2 seconds via polling without refreshing the page. |
| **Actual Result** | The contact button successfully created a chat room. The messages page loaded with the conversation in the sidebar. Messages sent by the tenant appeared as blue bubbles. Replies from the landlord appeared automatically within 2 seconds of being sent. |
| **Conclusion** | The test was successful. The tenant-landlord messaging system functions correctly with HTTP polling for near-real-time updates, enabling fluid communication without the complexity of persistent WebSocket connections. |

---

## Test 14 – MT014 – Landlord Dashboard Overview Tab

**Table 14: Test 14 – MT014 – Landlord Dashboard Overview Tab**

| Field | Details |
|---|---|
| **TC ID** | MT014 |
| **Objective** | To verify that the landlord dashboard's Overview tab displays accurate key performance indicators including total listings, occupied rooms, available rooms, total income, and alerts for tenants whose stay is expiring or has expired. |
| **Action** | Log in as a landlord and navigate to `http://localhost:3000/landlord/dashboard`. Ensure the Overview tab is selected. Observe the four stat cards at the top. Check for any expiry or warning alert banners. Scroll to the recent payments section. Click on different tabs (Listings, Tenants, Bookings, Income, Messages) to confirm they load. |
| **Expected Result** | The four stat cards should show correct counts for Total Listings, Occupied, Available, and Total Income. If any tenants are within 30 days of expiry or already expired, amber or red banners should appear. The Payments section should list recent completed payments. All six tabs should load their respective content without errors. |
| **Actual Result** | The stat cards displayed accurate figures matching the database. An amber alert appeared for a tenant with 20 days remaining. Recent payments were listed correctly. All six dashboard tabs loaded without errors and displayed the correct content. |
| **Conclusion** | The test was successful. The landlord dashboard overview provides all the critical at-a-glance metrics a landlord needs to manage their properties, with proactive alerts for tenancy renewals and expirations. |

---

## Test 15 – MT015 – Landlord List New Property

**Table 15: Test 15 – MT015 – Landlord List New Property**

| Field | Details |
|---|---|
| **TC ID** | MT015 |
| **Objective** | To verify that a landlord can successfully create a new room listing by completing the property listing form with all required details including title, location, pricing, room type, amenities, and tenancy duration, and that the listing appears on the search page after creation. |
| **Action** | From the landlord dashboard, click "List New Property" or navigate to `http://localhost:3000/landlord/list-property`. Fill in the Title, Description, Room Type, City, Address, Price Per Month, Security Deposit, Advance Payment, and Tenancy Duration fields. Toggle relevant amenities (Kitchen, WiFi, Parking). Click the "List Property" button. Navigate to the tenant search page to find the newly created listing. |
| **Expected Result** | All form fields should accept input. The tenancy duration field should accept a numeric value in days. After submission, a success message should appear and the landlord should be redirected or shown a confirmation. The new listing should appear in search results on the tenant search page with the correct details. |
| **Actual Result** | The form accepted all inputs. After submission, a success toast appeared and the listing was created. The new listing appeared in the tenant search results with the correct title, price, city, and amenities displayed. |
| **Conclusion** | The test was successful. The property listing creation form works correctly across all fields including the tenancy duration setting, allowing landlords to efficiently publish new room listings to the platform. |

---

## Test 16 – MT016 – Landlord Tenant Management (Renew & Vacate)

**Table 16: Test 16 – MT016 – Landlord Tenant Management**

| Field | Details |
|---|---|
| **TC ID** | MT016 |
| **Objective** | To verify that a landlord can manage active tenants from the Tenants tab of the dashboard, including extending a tenant's stay through the renewal modal and vacating a tenant using the modal confirmation dialog, with the room status updating correctly after each action. |
| **Action** | Navigate to the Tenants tab of the landlord dashboard. Observe occupied rooms with their tenancy progress bars and days remaining. Click the "Renew / Extend Stay" button on an active tenant's card. In the modal, enter the number of extra days (e.g., 30) and click "Extend". Verify the end date updates. Next, click the "Vacate Tenant" button on the same or a different card. In the confirmation modal, click "Yes, Vacate Now". Check that the room's status returns to available. |
| **Expected Result** | The Tenants tab should list all occupied rooms with progress bars, dates, and rent amounts. The renewal modal should accept a day count and extend the end date. The vacate modal should show tenant name, room title, and a warning before confirming. After vacating, the room should no longer appear in the Tenants tab and should show as "available" in the Listings tab. |
| **Actual Result** | The Tenants tab loaded correctly with all occupied rooms. The renewal modal updated the end date after extending by 30 days. The vacate modal displayed the confirmation prompt and, after confirmation, the tenancy was terminated and the room appeared as "available" in the Listings tab. |
| **Conclusion** | The test was successful. The landlord tenant management tools — renewal and vacate — function correctly with proper modal confirmations, giving landlords full control over their tenancy lifecycle. |

---

## Test 17 – MT017 – Landlord Bookings Tab — Confirm Payment

**Table 17: Test 17 – MT017 – Landlord Bookings Confirmation**

| Field | Details |
|---|---|
| **TC ID** | MT017 |
| **Objective** | To verify that the landlord can view pending booking requests in the Bookings tab with full financial details, and can confirm payment receipt using the "Confirm Payment Received" button, which activates the booking and marks the room as occupied. |
| **Action** | Navigate to the Bookings tab of the landlord dashboard. Observe any pending bookings with amber status indicators. Check the financial breakdown shown (Monthly Rent, Security Deposit, Advance, Amount Paid by Tenant). Click the "Confirm Payment Received" button on a pending booking. In the confirmation dialog, click "OK". Navigate to the Listings tab to verify the room status changed. |
| **Expected Result** | Pending bookings should display with amber status bars and a clear payment summary. An amber info banner should appear at the top of the tab explaining the confirmation process. After confirming, a success toast "Payment confirmed — booking is now active!" should appear. The booking status should change to "Active" and the room should become "occupied". |
| **Actual Result** | The Bookings tab displayed the pending booking with correct financial details. The confirm button opened the browser confirmation dialog. After confirming, the success toast appeared and the booking moved to active status. The room appeared as "occupied" in the Listings tab. |
| **Conclusion** | The test was successful. The landlord can manually confirm payments from their dashboard, giving them control over booking activation and ensuring both parties are satisfied before the tenancy is officially started. |

---

## Test 18 – MT018 – Landlord Chat Inbox

**Table 18: Test 18 – MT018 – Landlord Chat Inbox**

| Field | Details |
|---|---|
| **TC ID** | MT018 |
| **Objective** | To verify that the landlord can view all incoming chat conversations from tenants in the Messages tab of the dashboard, open a specific conversation, read messages, and reply to a tenant — with unread message counts displayed on each conversation entry. |
| **Action** | Navigate to the Messages tab of the landlord dashboard. Observe the list of conversations with tenant names, room titles, and last message previews. Note the blue badge showing unread message count on conversations with new messages. Click on a conversation to open the Chat modal. Read the messages in the chat window. Type a reply and click Send. Verify the message is sent and appears in the chat. |
| **Expected Result** | The Messages tab should list all conversations with tenant name, room title, last message preview, and unread count badge. Clicking a conversation should open the Chat modal with the full message history. Sending a message should make it appear immediately as a blue bubble on the right side. The unread count badge should update after reading. |
| **Actual Result** | The Messages tab displayed all conversations with correct metadata and unread badges. Clicking a conversation opened the chat modal with full history. Sent messages appeared immediately. The chat polled for new messages and displayed tenant replies automatically. |
| **Conclusion** | The test was successful. The landlord chat inbox provides a functional and organised communication centre, enabling landlords to manage conversations with multiple tenants from a single interface within their dashboard. |

---

## Test 19 – MT019 – Admin Login

**Table 19: Test 19 – MT019 – Admin Login**

| Field | Details |
|---|---|
| **TC ID** | MT019 |
| **Objective** | To verify that only users with the admin role can access the admin panel, that the admin login page at `/admin/login` correctly authenticates admin credentials, and that non-admin users are denied access even if they know the admin login URL. |
| **Action** | Navigate to `http://localhost:3000/admin/login`. Enter the admin email address and password. Click "Sign In". Observe the redirect. Then attempt to log in using a regular tenant or landlord account's credentials on the same admin login page. |
| **Expected Result** | Valid admin credentials should successfully log in and redirect to the admin dashboard at `/admin`. Attempting to log in with a non-admin account should fail with an "Invalid email or password" error. The admin token should be stored separately as `admin_token` in localStorage. |
| **Actual Result** | The admin login accepted the correct credentials and redirected to the admin dashboard. Attempting to log in with a regular user account on the admin login page returned an error message and did not grant access. The `admin_token` was confirmed in localStorage. |
| **Conclusion** | The test was successful. The admin authentication system correctly separates admin access from regular user access, preventing unauthorised users from accessing the administration panel even if they attempt to use the admin login URL directly. |

---

## Test 20 – MT020 – Admin User Management

**Table 20: Test 20 – MT020 – Admin User Management**

| Field | Details |
|---|---|
| **TC ID** | MT020 |
| **Objective** | To verify that an administrator can view all registered users on the Users management page, filter them by user type (Tenant, Landlord, All), search by name or email, and perform moderation actions such as deactivating or reactivating a user account. |
| **Action** | After logging in as admin, navigate to `http://localhost:3000/admin/users`. Observe the user table with columns for name, email, user type, and status. Use the search field to filter by name. Select "Landlord" from the user type filter. Click the action button on a user row and select "Deactivate". Confirm the action. Verify the user's status updates to "Inactive". Then reactivate the user. |
| **Expected Result** | All users should be listed in a paginated table. Search and type filters should narrow the results in real time. Deactivating a user should update their status badge to "Inactive". Reactivating should restore "Active" status. A success toast should confirm each action. |
| **Actual Result** | The user list loaded with all accounts. Search filtering worked correctly. Selecting "Landlord" showed only landlord accounts. Deactivating a user updated the badge to "Inactive" with a confirmation toast. Reactivation restored the "Active" status successfully. |
| **Conclusion** | The test was successful. The admin user management panel provides full control over platform accounts, enabling administrators to moderate users and respond to policy violations efficiently. |

---

## Test 21 – MT021 – Admin Room Deactivation with Reason

**Table 21: Test 21 – MT021 – Admin Room Deactivation**

| Field | Details |
|---|---|
| **TC ID** | MT021 |
| **Objective** | To verify that an administrator can deactivate a room listing by providing a mandatory reason, that the deactivated room displays a visible "Admin ban" badge with the reason as a tooltip, and that the landlord is completely prevented from reactivating the room from their own dashboard. |
| **Action** | Log in as admin and navigate to `http://localhost:3000/admin/rooms`. Find an active room listing. Click the action menu and select "Admin Deactivate (with reason)". In the deactivation modal, enter a reason such as "Fraudulent listing - photos do not match property." Click "Deactivate". Observe the badge on the room. Log in as the landlord who owns that room and attempt to change the room's status from the dashboard. |
| **Expected Result** | The deactivation modal should require a non-empty reason before allowing submission. After deactivation, the room should show a red "Admin ban" badge in the admin rooms table. The landlord attempting to change the status should receive an error message indicating the room is locked by admin. |
| **Actual Result** | The modal required a reason and refused to submit if left empty. After providing a reason, the room was deactivated with the badge appearing. Logging in as the landlord and attempting to toggle the room status returned an error: "Room is locked by admin." |
| **Conclusion** | The test was successful. The admin deactivation system with mandatory reason logging ensures accountability and prevents landlords from overriding administrative moderation decisions. |

---

## Test 22 – MT022 – Admin Analytics Dashboard

**Table 22: Test 22 – MT022 – Admin Analytics Dashboard**

| Field | Details |
|---|---|
| **TC ID** | MT022 |
| **Objective** | To verify that the admin analytics dashboard at `/admin` correctly displays platform-wide statistics including total users, rooms, bookings, and revenue across three tabs (Overview, Analytics, Payments), with functional bar charts and donut charts. |
| **Action** | Log in as admin and navigate to `http://localhost:3000/admin`. Observe the Overview tab's stat cards. Check the bar charts for user registrations and bookings over the last 6 months. Observe the donut charts for user type, room status, and booking status breakdowns. Switch to the Analytics tab and review the monthly revenue bar chart. Switch to the Payments tab and review the recent payments table. |
| **Expected Result** | The Overview tab should display stat cards with accurate totals. Bar charts should render with correctly labelled months. Donut charts should show proportional segments with legends. The Analytics tab should display a monthly revenue chart and top landlords. The Payments tab should list transactions with status, amount, and date. |
| **Actual Result** | All stat cards displayed correct counts from the database. Bar charts rendered correctly for the last 6 months. Donut charts displayed proportional breakdowns. The monthly revenue chart was visible in the Analytics tab. The Payments tab listed all transactions with correct details. |
| **Conclusion** | The test was successful. The admin analytics dashboard provides comprehensive platform visibility through multiple chart types and data tables, enabling administrators to monitor platform health and financial performance at a glance. |

---

## Test 23 – MT023 – Admin Payments Page

**Table 23: Test 23 – MT023 – Admin Payments Management**

| Field | Details |
|---|---|
| **TC ID** | MT023 |
| **Objective** | To verify that the dedicated admin payments page at `/admin/payments` correctly lists all payment records with pagination, allows filtering by payment status, and displays summary statistics including the total completed revenue shown at the top of the page. |
| **Action** | Log in as admin and navigate to `http://localhost:3000/admin/payments`. Observe the summary cards at the top (payments shown, completed amount, total records). Observe the payments table with columns for ID, booking, room, tenant, amount, type, status, and date. Select "Completed" from the status filter dropdown. Use the pagination controls to navigate to the next page. |
| **Expected Result** | Summary cards should show accurate totals. The payments table should list all payments with correct data in each column. Filtering by "Completed" should show only completed payments. The total completed amount should match the sum of filtered records. Pagination should work correctly and display the correct page information. |
| **Actual Result** | Summary cards showed accurate payment totals. The payments table loaded with all records. The "Completed" filter showed only completed payments and updated the summary card. Pagination navigated correctly between pages and displayed the correct page number. |
| **Conclusion** | The test was successful. The admin payments page provides a complete and filterable audit trail of all financial transactions on the platform, giving administrators full visibility into revenue and payment activity. |

---

## Test 24 – MT024 – Mobile Responsive Design

**Table 24: Test 24 – MT024 – Mobile Responsive Design**

| Field | Details |
|---|---|
| **TC ID** | MT024 |
| **Objective** | To verify that the RoomBox frontend renders correctly and remains fully usable on mobile screen sizes, with navigation menus adapting to smaller viewports, cards stacking vertically, and touch-friendly buttons remaining accessible without horizontal scrolling. |
| **Action** | Open Chrome DevTools and switch to a mobile device emulation (e.g., iPhone 14 Pro — 393px width). Navigate through the following pages: Login, Register, Tenant Search, Room Detail, Tenant Bookings, Landlord Dashboard, and Admin Dashboard. Observe layout, navigation, and button sizes on each page. Test the landlord dashboard tabs on mobile. Check the search filter panel on mobile. |
| **Expected Result** | All pages should display without horizontal overflow. Navigation should adapt to mobile (hamburger or stacked links). Room cards should stack in a single column. Buttons should be large enough to tap comfortably. The landlord dashboard should show a scrollable tab strip. Filter panels should expand and collapse correctly. |
| **Actual Result** | All tested pages rendered correctly at 393px width without horizontal scrolling. Navigation links stacked correctly. Room cards displayed in a single-column layout. Buttons were tap-friendly. The landlord dashboard tabs scrolled horizontally on mobile. The admin panel's sidebar collapsed into a top navigation strip on smaller screens. |
| **Conclusion** | The test was successful. The RoomBox frontend is fully responsive across mobile viewports, ensuring tenants and landlords can use the platform comfortably on smartphone devices without loss of functionality. |

---

## Test 25 – MT025 – Logout Functionality
| 26 | MT026 | Payment Receipt Email on Booking Completion | `/payment/success` + Email | PASS |
| 27 | MT027 | Landlord Notification Email on New Booking | Email Inbox | PASS |
| 28 | MT028 | Download PDF Receipt from Payment Success Page | `/payment/success` | PASS |

**Table 25: Test 25 – MT025 – Logout Functionality**
| 26 | MT026 | Payment Receipt Email on Booking Completion | `/payment/success` + Email | PASS |
| 27 | MT027 | Landlord Notification Email on New Booking | Email Inbox | PASS |
| 28 | MT028 | Download PDF Receipt from Payment Success Page | `/payment/success` | PASS |

| Field | Details |
|---|---|
| **TC ID** | MT025 |
| **Objective** | To verify that a user can log out of the RoomBox platform from any page that provides a logout option, that all authentication data is cleared from localStorage upon logout, and that the user is redirected to the home or login page and cannot access protected routes after logging out. |
| **Action** | Log in as a tenant. Navigate to the tenant bookings page. Click the Logout button (in the dashboard or profile menu). Observe the redirect. Open the browser's DevTools and check localStorage for `auth_token` and `user` keys. Manually navigate back to `http://localhost:3000/tenant/bookings`. Log in as a landlord and repeat by clicking Logout from the dashboard header. Log in as admin and log out from the admin panel. |
| **Expected Result** | Clicking Logout should display a "Logged out successfully" toast notification. The user should be redirected to the home page (`/`). The `auth_token` and `user` keys should be removed from localStorage. Attempting to navigate to a protected route after logout should redirect back to the login page. |
| **Actual Result** | Logout worked correctly for all three user roles. Toast notifications confirmed each logout. Both `auth_token` and `user` were removed from localStorage. Attempting to access the tenant bookings page after logout redirected to the login page as expected. Admin logout cleared the `admin_token` and redirected to the admin login page. |
| **Conclusion** | The test was successful. The logout mechanism correctly clears all session data across all user roles and enforces authentication protection on all secured routes, preventing session persistence or unauthorised post-logout access. |

---

## Summary Table

| Test No. | TC ID | Feature Tested | Page / Route | Result |
|---|---|---|---|---|
| 1 | MT001 | User Registration | `/register` | ✅ PASS |
| 2 | MT002 | Email Verification | `/verify-email` | ✅ PASS |
| 3 | MT003 | Login with Valid Credentials | `/login` | ✅ PASS |
| 4 | MT004 | Login with Invalid Credentials | `/login` | ✅ PASS |
| 5 | MT005 | Forgot Password Flow | `/forgot-password` | ✅ PASS |
| 6 | MT006 | Reset Password with Token | `/reset-password` | ✅ PASS |
| 7 | MT007 | Tenant Room Search with Filters | `/tenant/search` | ✅ PASS |
| 8 | MT008 | Room Detail Page with Image Carousel | `/tenant/room/[id]` | ✅ PASS |
| 9 | MT009 | Room Booking Form Submission | `/tenant/room/[id]/booking` | ✅ PASS |
| 10 | MT010 | eSewa Payment and Success Redirect | `/payment/success` | ✅ PASS |
| 11 | MT011 | Tenant Bookings Page Display | `/tenant/bookings` | ✅ PASS |
| 12 | MT012 | Tenant Tracking Page | `/tenant/tracking` | ✅ PASS |
| 13 | MT013 | Tenant Messages / Chat | `/tenant/messages` | ✅ PASS |
| 14 | MT014 | Landlord Dashboard Overview Tab | `/landlord/dashboard` | ✅ PASS |
| 15 | MT015 | Landlord List New Property | `/landlord/list-property` | ✅ PASS |
| 16 | MT016 | Landlord Tenant Management | `/landlord/dashboard` → Tenants | ✅ PASS |
| 17 | MT017 | Landlord Bookings — Confirm Payment | `/landlord/dashboard` → Bookings | ✅ PASS |
| 18 | MT018 | Landlord Chat Inbox | `/landlord/dashboard` → Messages | ✅ PASS |
| 19 | MT019 | Admin Login | `/admin/login` | ✅ PASS |
| 20 | MT020 | Admin User Management | `/admin/users` | ✅ PASS |
| 21 | MT021 | Admin Room Deactivation with Reason | `/admin/rooms` | ✅ PASS |
| 22 | MT022 | Admin Analytics Dashboard | `/admin` | ✅ PASS |
| 23 | MT023 | Admin Payments Page | `/admin/payments` | ✅ PASS |
| 24 | MT024 | Mobile Responsive Design | All pages | ✅ PASS |
| 25 | MT025 | Logout Functionality | All dashboards | ✅ PASS |
| 26 | MT026 | Payment Receipt Email on Booking Completion | `/payment/success` + Email | PASS |
| 27 | MT027 | Landlord Notification Email on New Booking | Email Inbox | PASS |
| 28 | MT028 | Download PDF Receipt from Payment Success Page | `/payment/success` | PASS |

---

*Generated by: RoomBox Development Team · Manual Testing · April 2026*


---

## Test 26 � MT026 � Payment Receipt Email on Booking Completion

**Table 26: Test 26 � MT026 � Payment Receipt Email**

| Field | Details |
|---|---|
| **TC ID** | MT026 |
| **Objective** | To verify that after a successful eSewa payment and booking confirmation, the tenant automatically receives a branded HTML payment receipt email containing the booking ID, room name, transaction reference, amount paid, and tenancy dates. |
| **Action** | Complete a booking payment via eSewa test gateway. Navigate to `http://localhost:3000/payment/success`. Observe the success state. Open the tenant's email inbox (the email registered during account creation). Verify the receipt email contents. |
| **Expected Result** | A payment receipt email should arrive in the tenant's inbox within seconds of payment. The email should display the RoomBox branding header, booking ID (#RB000X format), room title, transaction reference from eSewa, amount paid, move-in date, and a footer note. |
| **Actual Result** | The receipt email arrived in the inbox within a few seconds of the booking being confirmed. All fields were present and correctly formatted with the RoomBox branded HTML template. The amount and booking ID matched the transaction. |
| **Conclusion** | The test was successful. Tenants receive a professional payment receipt immediately after booking completion, providing a permanent record of their transaction. |

---

## Test 27 � MT027 � Landlord Notification Email on New Booking

**Table 27: Test 27 � MT027 � Landlord Booking Notification Email**

| Field | Details |
|---|---|
| **TC ID** | MT027 |
| **Objective** | To verify that when a tenant successfully completes payment and their booking is confirmed, the landlord also receives an automatic email notification containing the tenant's name, email, room title, amount paid, and tenancy dates. |
| **Action** | After a tenant completes a booking payment on the RoomBox platform, log in to the landlord's email account. Check the inbox for a "New Tenant Confirmed" email. Verify the contents include the tenant's details and payment amount. |
| **Expected Result** | The landlord should receive a "New Tenant Confirmed � [Room Title] � RoomBox" email showing: tenant name, tenant email, room title, booking ID, monthly rent, amount paid via eSewa, move-in date, and a link to the landlord dashboard. |
| **Actual Result** | The landlord received the notification email with all correct tenant and payment details. The email clearly identified the amount received and prompted the landlord to log into their dashboard. |
| **Conclusion** | The test was successful. Landlords are automatically notified of new confirmed tenants, keeping them informed without needing to check the dashboard manually. |

---

## Test 28 � MT028 � Download PDF Receipt from Payment Success Page

**Table 28: Test 28 � MT028 � PDF Receipt Download**

| Field | Details |
|---|---|
| **TC ID** | MT028 |
| **Objective** | To verify that after a successful payment, a tenant can download a PDF payment receipt directly from the payment success page, and that the downloaded PDF contains all key payment details in a clean, printable format. |
| **Action** | After a successful eSewa payment, observe the payment success page at `http://localhost:3000/payment/success`. Locate the green "Download PDF Receipt" button. Click the button. Observe the browser behaviour. Review the opened print/PDF preview window. |
| **Expected Result** | Clicking "Download PDF Receipt" should open a new browser tab showing a formatted HTML receipt with the RoomBox logo, booking ID, tenant name, room title, transaction reference, payment date, payment method (eSewa), and total amount paid. The browser print dialog should allow saving as PDF. |
| **Actual Result** | Clicking the button opened a new tab with the formatted receipt. The print dialog appeared automatically, allowing the user to save as PDF. All details including the transaction reference, amount, and booking ID were correctly displayed. |
| **Conclusion** | The test was successful. Tenants can instantly download a printable PDF receipt from the payment success page, providing an offline record of their booking payment. |
