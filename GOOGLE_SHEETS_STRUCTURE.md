# Google Sheets Structure for DoggyPaddle

## Required Tabs and Columns

Your Google Sheet must have **8 tabs** with the following exact structure:

### 1. TimeSlots Tab

| Column | Description |
|--------|-------------|
| id | Unique slot identifier (e.g., slot-1234567890) |
| date | Session date (e.g., 2025-11-22) |
| time | Session time (e.g., 10:00 AM) |
| duration | Duration in minutes (default: 20) |
| status | available, booked, or blocked |
| createdAt | ISO timestamp when created |

**Example row:**
```
slot-1732291200000 | 2025-11-22 | 10:00 AM | 20 | available | 2025-11-22T10:00:00.000Z
```

---

### 2. Bookings Tab

| Column | Description |
|--------|-------------|
| bookingId | Unique booking identifier |
| firstName | Customer first name |
| lastName | Customer last name |
| email | Customer email |
| phone | Customer phone number |
| dogNames | Names of dogs (comma-separated) |
| dogBreeds | Breeds of dogs (comma-separated) |
| numDogs | Number of dogs (1 or 2) |
| sessionTime | Booked session date/time |
| ownershipConfirmed | Yes/No |
| waiverAck | Yes/No |
| timestamp | ISO timestamp of booking |
| paymentStatus | pending, paid, subscription |
| slotId | Reference to TimeSlots tab |
| isSubscription | Yes/No |
| subscriptionEmail | Email if subscription booking |

**Example row:**
```
booking-1732291200000 | John | Doe | john@example.com | 555-1234 | Buddy, Max | Golden Retriever, Lab | 2 | 2025-11-22 10:00 AM | Yes | Yes | 2025-11-22T09:30:00.000Z | paid | slot-1732291200000 | No |
```

---

### 3. Products Tab

| Column | Description |
|--------|-------------|
| id | Unique product identifier |
| name | Product name |
| description | Product description |
| price | Price in USD (e.g., 12.99) |
| category | Treats, Accessories, Toys |
| imageUrl | URL to product image |
| inStock | true/false |
| quantity | Current stock quantity |
| lowStockThreshold | Alert when stock below this |
| createdAt | ISO timestamp when created |

**Example row:**
```
prod-1 | Dog Treats - Peanut Butter | Delicious all-natural treats | 12.99 | Treats | /assets/products/treats1.jpg | true | 50 | 10 | 2025-11-22T10:00:00.000Z
```

---

### 4. Photos Tab

| Column | Description |
|--------|-------------|
| id | Unique photo identifier |
| customerName | Name of submitter |
| email | Email of submitter |
| dogName | Name of dog in photo |
| imageUrl | URL to hosted image |
| caption | Photo caption/description |
| status | pending, approved, or rejected |
| createdAt | ISO timestamp when submitted |
| sessionDate | Date of swimming session |

**Note:** Featured photos are marked with a note "featured" on the status cell.

**Example row:**
```
photo-1732291200000 | Sarah | sarah@example.com | Remi | https://example.com/remi.jpg | First time swimming! | approved | 2025-11-22T10:00:00.000Z | 2025-11-22
```

---

### 5. Orders Tab

| Column | Description |
|--------|-------------|
| orderId | Unique order identifier |
| customerName | Customer name |
| email | Customer email |
| phone | Customer phone |
| items | JSON array of order items |
| total | Total price |
| timestamp | ISO timestamp of order |
| paymentStatus | pending, paid, shipped |
| shippingAddress | Address or "Pickup" |

**Example row:**
```
order-1732291200000 | John Doe | john@example.com | 555-1234 | [{"id":"prod-1","name":"Treats","qty":2,"price":12.99}] | 25.98 | 2025-11-22T10:00:00.000Z | pending | Pickup
```

---

### 6. Waivers Tab

| Column | Description |
|--------|-------------|
| waiverId | Unique waiver identifier |
| fullName | Signer's full name |
| date | Date signed |
| initials1 | Initials for section 1 |
| initials2 | Initials for section 2 |
| initials3 | Initials for section 3 |
| initials4 | Initials for section 4 |
| initials5 | Initials for section 5 |
| timestamp | ISO timestamp when signed |
| ipAddress | IP address of signer |
| signature | "Signature captured" note |

**Example row:**
```
waiver-1732291200000 | John Doe | 2025-11-22 | JD | JD | JD | JD | JD | 2025-11-22T10:00:00.000Z | 192.168.1.1 | Signature captured
```

---

### 7. Subscriptions Tab

| Column | Description |
|--------|-------------|
| subscriptionId | Unique subscription identifier |
| email | Subscriber email |
| status | active, paused, or cancelled |
| sessionsRemaining | Number of sessions left |
| createdAt | ISO timestamp when created |

**Example row:**
```
sub-1732291200000 | john@example.com | active | 4 | 2025-11-22T10:00:00.000Z
```

---

### 8. Registrations Tab

| Column | Description |
|--------|-------------|
| registrationId | Unique registration identifier |
| email | User email |
| name | User full name |
| phone | User phone number |
| status | pending, approved, or rejected |
| createdAt | ISO timestamp when registered |

**Example row:**
```
reg-1732291200000 | john@example.com | John Doe | 555-1234 | approved | 2025-11-22T10:00:00.000Z
```

---

## How to Verify Your Sheet Structure

### Option 1: Run the Initialize Function

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. In the function dropdown, select **initializeSheets**
4. Click **Run**
5. This will automatically create all 8 tabs with proper structure

### Option 2: Manual Verification

1. Check that your Google Sheet has all 8 tabs listed above
2. Verify the first row of each tab contains the column headers (in order)
3. Make sure column names match exactly (case-sensitive)

## Next Steps

After verifying the structure:

1. **Fix the "Access Denied" error** by updating your Google Apps Script deployment (see QUICK_START.md)
2. **Test the API** by visiting: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getProducts`
3. **Expected response:** JSON with status: "success" and product data

If you see "Access denied", the deployment permissions need to be set to "Anyone".
