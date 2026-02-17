# Frontend Developer Guide: Elvet Clinic API

## 🚀 Overview

This guide covers all API endpoints for the Elvet Clinic management system with a focus on the **new nurse-driven task workflow** and **moderator salary reporting**.

## 🔐 Authentication

All endpoints require JWT authentication except where noted.

**Login Endpoint:**

```
POST /api/auth/jwt/token/
```

**Request:**

```json
{
  "phone_number": "+998991234567",
  "password": "yourpassword"
}
```

**Response:**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Usage:**
Include the access token in all subsequent requests:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

---

## 👥 User Roles & Permissions

| Role      | Code        | Key Abilities                                              |
| --------- | ----------- | ---------------------------------------------------------- |
| Admin     | `ADMIN`     | Full system access                                         |
| Moderator | `MODERATOR` | Payments, feed sales, salary reports, client management    |
| Doctor    | `DOCTOR`    | Create medical cards, prescribe medicines/services         |
| Nurse     | `NURSE`     | **View medical cards**, **create own tasks**, execute care |
| Client    | `CLIENT`    | View own medical records                                   |

---

## 📋 Medical Cards API

Medical cards are the core clinical record created by doctors.

### List Medical Cards

```
GET /api/v1/medical-cards/
```

**Permissions:**

- **Doctors**: See all cards
- **Moderators/Admins**: See all cards
- **Nurses**: ✨ **NEW** - Can now see all cards (to create tasks)
- **Clients**: See only their own cards

**Query Parameters:**

- `doctor=<id>` - Filter by doctor
- `client=<id>` - Filter by client
- `pet=<id>` - Filter by pet
- `status=<status>` - Filter by status (`OPEN`, `WAITING_FOR_PAYMENT`, `PARTLY_PAID`, `FULLY_PAID`)
- `created_at__gte=<date>` - Created after date
- `created_at__lte=<date>` - Created before date

**Response:**

```json
{
  "count": 150,
  "next": "http://api/v1/medical-cards/?page=2",
  "previous": null,
  "results": [
    {
      "id": 15,
      "client": 23,
      "pet": 42,
      "doctor": 5,
      "weight": 12.5,
      "body_temperature": 38.5,
      "diagnosis": "Gastroenteritis",
      "analyze": "Mild dehydration, prescribe fluids",
      "recommended_feed_text": "Royal Canin Gastrointestinal Low Fat",
      "services_fee": "50000.00",
      "medicines_fee": "25000.00",
      "total_fee": "75000.00",
      "status": "WAITING_FOR_PAYMENT",
      "created_at": "2026-02-06T10:30:00Z",
      "medicine_usages": [...],
      "service_usages": [...]
    }
  ]
}
```

### Get Single Medical Card

```
GET /api/v1/medical-cards/{id}/
```

**Use Case for Nurses:**
Nurses should call this endpoint to view full card details (medicines, services, diagnosis) before creating tasks.

---

### Create Medical Card

```
POST /api/v1/medical-cards/
```

**Permissions:** Only **Doctors**

**Request:**

```json
{
  "client": 23,
  "pet": 42,
  "weight": 12.5,
  "blood_pressure": "120/80",
  "mucous_membrane": "Pink",
  "heart_rate": 90,
  "respiratory_rate": 25,
  "general_condition": "Alert",
  "chest_condition": "Clear",
  "body_temperature": 38.5,
  "analyze": "Mild dehydration observed",
  "diagnosis": "Gastroenteritis",
  "recommended_feed_text": "Royal Canin Gastrointestinal",
  "notes": "Monitor for 24 hours",
  "revisit_date": "2026-02-10T14:00:00Z"
}
```

### Medical Card - Nested Endpoints

#### Get Attachments (X-rays, Prescriptions)

```
GET /api/v1/medical-cards/{id}/attachments/
```

#### Upload Attachments

```
POST /api/v1/medical-cards/{id}/attachments/
Content-Type: multipart/form-data
```

**Form Data:**

- `files` (multiple): The files to upload
- `types` (array, optional): Attachment types for each file (`XRAY`, `PRESCRIPTION`, `OTHER`)

**Example (using FormData in JS):**

```javascript
const formData = new FormData();
formData.append("files", xrayFile);
formData.append("files", prescriptionFile);
formData.append("types", "XRAY");
formData.append("types", "PRESCRIPTION");

fetch("/api/v1/medical-cards/15/attachments/", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

#### Confirm Payment (Admin/Moderator only)

```
POST /api/v1/medical-cards/{id}/confirm-payment/
```

**Request:**

```json
{
  "method": "CASH",
  "note": "Full payment received"
}
```

Sets card to `FULLY_PAID` and closes it.

#### Receive Partial Payment

```
POST /api/v1/medical-cards/{id}/receive-payment/
```

**Request:**

```json
{
  "amount": "30000.00",
  "method": "CARD",
  "note": "Partial payment"
}
```

---

## 🏥 Services & Medicines

### List Services

```
GET /api/v1/services/
```

**Response:**

```json
[
  {
    "id": 3,
    "name": "Vaccination",
    "price": "15000.00",
    "doctor_share_percent": "30.00",
    "nurse_share_percent": "10.00"
  }
]
```

### List Medicines

```
GET /api/v1/medicines/
```

**Response:**

```json
[
  {
    "id": 8,
    "name": "Amoxicillin 500mg",
    "price": "5000.00",
    "quantity": 150,
    "expire_date": "2027-12-31"
  }
]
```

### Add Medicine to Medical Card

```
POST /api/v1/medicine-usages/
```

**Request:**

```json
{
  "medical_card": 15,
  "medicine": 8,
  "dosage": "500mg twice daily",
  "quantity": 14
}
```

Stock is automatically decremented.

### Add Service to Medical Card

```
POST /api/v1/service-usages/
```

**Request:**

```json
{
  "medical_card": 15,
  "service": 3,
  "description": "Annual rabies vaccine",
  "quantity": 1
}
```

Doctor and nurse earnings are auto-calculated.

---

## ✨ Tasks API (NEW WORKFLOW)

### 🔥 Critical Changes for Frontend:

1. **Nurses now CREATE tasks** (not doctors)
2. **Nurses link tasks to medical cards** (not just schedules)
3. **Auto-assignment**: When a nurse creates a task, they are automatically assigned

### List All Tasks

```
GET /api/v1/tasks/
```

**Query Parameters:**

- `assigned_nurse=<id>` - Filter by nurse
- `medical_card=<id>` - ✨ **NEW** - Filter by medical card
- `status=<status>` - `TODO`, `IN_PROGRESS`, `DONE`
- `due_date__gte=<datetime>` - Due after
- `due_date__lte=<datetime>` - Due before

**Response:**

```json
[
  {
    "id": 42,
    "title": "Administer IV fluids",
    "description": "500ml saline over 2 hours",
    "assigned_nurse": 8,
    "service": 12,
    "medical_card": 15,
    "schedule": null,
    "due_date": "2026-02-07T10:00:00Z",
    "status": "TODO",
    "created_at": "2026-02-06T14:30:00Z"
  }
]
```

### ✨ Create Task (Nurse Workflow)

```
POST /api/v1/tasks/
```

**Permissions:** **Nurses**, Moderators, Admins

**Request (Nurse creating task):**

```json
{
  "medical_card": 15,
  "service": 3,
  "title": "Administer rabies vaccine",
  "description": "According to medical card prescription",
  "due_date": "2026-02-07T14:00:00Z"
}
```

**Note:**

- `assigned_nurse` is **auto-filled** with the logged-in nurse's ID
- Nurses should first view the medical card to see prescribed services, then create tasks

**UI Flow for Nurses:**

1. Navigate to "Medical Cards" page
2. Click on a medical card to view details
3. See prescribed services in `service_usages` array
4. Click "Create Task" button
5. Select service from dropdown (populated from card's services)
6. Fill in title, description, due date
7. Submit → Task is created and assigned to them

### Update Task Status

```
PATCH /api/v1/tasks/{id}/
```

**Request:**

```json
{
  "status": "DONE"
}
```

### Get Nurse's To-Do Tasks

```
GET /api/v1/payment-transactions/to-do/by_id/{nurse_id}/
```

Returns tasks that are `TODO` or `IN_PROGRESS` for the nurse.

### Get Nurse's Completed Tasks

```
GET /api/v1/payment-transactions/done/by_id/{nurse_id}/
```

### Get Tasks Completed Today

```
GET /api/v1/payment-transactions/done/today/by_id/{nurse_id}/
```

---

## 💰 Salary API

### ✨ Get Staff Daily Salary Summary (NEW - Moderators Only)

```
GET /api/v1/salary/daily/staff-summary/
```

**Permissions:** **Moderators** and **Admins** only

**Response:**

```json
{
  "date": "2026-02-06",
  "staff_salaries": [
    {
      "user_id": 5,
      "name": "Dr. John Smith",
      "role": "DOCTOR",
      "amount": "250000.00"
    },
    {
      "user_id": 8,
      "name": "Nurse Jane Doe",
      "role": "NURSE",
      "amount": "75000.00"
    },
    {
      "user_id": 12,
      "name": "Dr. Sarah Johnson",
      "role": "DOCTOR",
      "amount": "180000.00"
    }
  ]
}
```

**Use Case:**
Moderators can use this endpoint to display a dashboard showing today's earnings for all doctors and nurses.

### Get Individual Salary History

```
GET /api/v1/salary/history/{user_id}/daily/
```

Daily earnings breakdown for a specific user.

```
GET /api/v1/salary/history/{user_id}/weekly/
```

Weekly earnings.

```
GET /api/v1/salary/history/{user_id}/monthly/
```

Monthly earnings.

**Permissions:**

- Doctors/Nurses can only view their own (`user_id` must match logged-in user)
- Moderators/Admins can view anyone's salary

---

## 🐾 Pet Feed Sales

### Create Feed Sale (Moderators Only)

```
POST /api/v1/feed-sales/
```

**Request:**

```json
{
  "client": 23,
  "pet": 42,
  "items": [
    {
      "feed": 5,
      "quantity_kg": "10.5"
    }
  ]
}
```

Stock is auto-decremented and totals calculated.

### Record Payment for Feed Sale

```
POST /api/v1/feed-sales/{id}/pay/
```

**Request:**

```json
{
  "amount": "50000.00"
}
```

---

## 📅 Schedules

### List Schedules

```
GET /api/v1/schedules/
```

### Create Schedule

```
POST /api/v1/schedules/
```

**Request:**

```json
{
  "medical_card": 15,
  "date": "2026-02-10T14:00:00Z",
  "status": "PENDING"
}
```

Doctor, client, and pet are auto-filled from the medical card.

---

## 🔑 Key Workflow Changes Summary

### Before:

```
Doctor → Creates Medical Card
Doctor → Creates Tasks → Assigns to Nurse
Nurse → Executes Tasks
```

### After (CURRENT):

```
Doctor → Creates Medical Card ONLY
Nurse → Views Medical Card
Nurse → Creates Own Tasks (auto-assigned)
Nurse → Executes Tasks
Moderator → Views Staff Salaries
```

---

## 📊 Recommended UI Pages

### For Nurses:

1. **Medical Cards Dashboard** - List all cards, filterable
2. **Medical Card Detail** - View full card with "Create Task" button
3. **My Tasks** - List of self-created tasks
4. **Task Detail** - View/edit task status

### For Moderators:

1. **Staff Salary Dashboard** - Display `/salary/daily/staff-summary/` results
2. **Payment Management** - Receive/confirm payments
3. **Feed Sales** - Manage feed sales

### For Doctors:

1. **Create Medical Card** - Form to create cards
2. **My Medical Cards** - Filter by `doctor={current_user_id}`

---

## 🚨 Important Notes

1. **Nurse Task Creation**: Nurses can now `POST /api/v1/tasks/` - this is the biggest change
2. **Medical Card Access**: Nurses can now `GET /api/v1/medical-cards/` to view all cards
3. **Auto-Assignment**: When nurses create tasks, `assigned_nurse` is automatically set
4. **Salary Endpoint**: Moderators use `/salary/daily/staff-summary/` for staff monitoring
5. **Doctor Restriction**: Doctors can NO LONGER create tasks (will get `403 Forbidden` if they try)

---

## 🧪 Testing Endpoints

Use these credentials (if available in your .env):

**Admin:**

- Phone: `+99899-111-22-33`
- Password: `pythondev1`

**Instructor (if applicable):**

- Phone: `+99899444-55-66`
- Password: `pythondev1`

---

## 📞 Support

For questions about API implementation, contact the backend team or refer to:

- [`implementation_plan.md`](file:///home/benn/.gemini/antigravity/brain/ec15076b-402f-41f0-88f3-5447a4c8fb58/implementation_plan.md)
- [`walkthrough.md`](file:///home/benn/.gemini/antigravity/brain/ec15076b-402f-41f0-88f3-5447a4c8fb58/walkthrough.md)
