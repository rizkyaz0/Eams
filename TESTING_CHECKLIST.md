# ✅ EAMS Testing Checklist

## 🧪 Quick Testing Guide

### Pre-Test Setup

- [ ] Dev server running (`npm run dev`)
- [ ] Browser open at `http://localhost:3000`
- [ ] Logged in as admin (`admin@eams.com` / `admin123`)
- [ ] Browser console open (F12)

---

## 1. ✅ Asset Management Tests

### List View

- [ ] Navigate to `/assets`
- [ ] See list of assets (if database has data)
- [ ] Search box berfungsi
- [ ] Status filter berfungsi
- [ ] Category filter berfungsi
- [ ] Pagination berfungsi (Previous/Next buttons)

### Create Asset

- [ ] Click "Add Asset" button
- [ ] Dialog opens
- [ ] Fill required fields:
  - Asset Name: "Test Laptop"
  - Tag Number: "TST-001"
  - Category: Select any
  - Purchase Date: Select date
- [ ] Click "Create Asset"
- [ ] **Expected**: Green toast "Asset created successfully"
- [ ] **Expected**: Asset appears in table
- [ ] **Actual**:

### Edit Asset

- [ ] Click ⋮ menu on any asset
- [ ] Click "Edit"
- [ ] Dialog opens with pre-filled data
- [ ] Change name to "Updated Name"
- [ ] Click "Update Asset"
- [ ] **Expected**: Green toast "Asset updated successfully"
- [ ] **Expected**: Name updated in table
- [ ] **Actual**:

### View Asset Detail

- [ ] Click ⋮ menu → "View Details"
- [ ] Redirected to `/assets/[id]`
- [ ] Full asset info displayed
- [ ] QR code section visible
- [ ] Edit & Delete buttons visible
- [ ] **Actual**:

### Delete Asset

- [ ] Click ⋮ menu → "Delete"
- [ ] Confirmation dialog opens
- [ ] Click "Delete"
- [ ] **Expected**: Green toast "Asset deleted successfully"
- [ ] **Expected**: Asset removed from table
- [ ] **Actual**:

---

## 2. ✅ BAST Management Tests

### List View

- [ ] Navigate to `/bast`
- [ ] See list of BAsts (if any exist)
- [ ] Search by BAST number works
- [ ] Type filter works
- [ ] Status filter works
- [ ] Pagination works

### Create BAST - STEP 1

- [ ] Click "Create BAST" button
- [ ] Dialog opens showing "Step 1 of 2"
- [ ] Fill fields:
  - BAST Type: Select "Handover"
  - Recipient Name: "John Doe"
  - Recipient Position: "Manager"
  - Notes: "Test BAST"
- [ ] Click "Next"
- [ ] **Expected**: Progress to Step 2
- [ ] **Actual**:

### Create BAST - STEP 2

- [ ] See "Step 2 of 2: Select Assets"
- [ ] See list of AVAILABLE assets
- [ ] Click checkbox on 1+ assets
- [ ] Counter shows "X asset(s) selected"
- [ ] Click "Create BAST"
- [ ] **Expected**: Green toast "BAST created successfully"
- [ ] **Expected**: Dialog closes, table refreshes
- [ ] **Actual**:

**IF ERROR OCCURS:**

- [ ] Take screenshot of:
  - Error toast message
  - Browser console (F12)
  - Network tab → Failed request (if any)
- [ ] Note which step error occurred:

### View BAST Detail

- [ ] Click "View" button on any BAST
- [ ] Redirected to `/bast/[id]`
- [ ] BAST info displayed
- [ ] Assets table displayed
- [ ] Status badges visible
- [ ] **Actual**:

### Approve/Reject BAST

- [ ] Open BAST with status "PENDING"
- [ ] See "Approve" and "Reject" buttons
- [ ] Click "Approve"
- [ ] Confirmation dialog opens
- [ ] Click "Approve" again
- [ ] **Expected**: Green toast "BAST approved successfully"
- [ ] **Expected**: Status changed to "APPROVED"
- [ ] **Expected**: "Download PDF" button appears
- [ ] **Actual**:

---

## 3. ✅ Dashboard Tests

- [ ] Navigate to `/dashboard`
- [ ] Statistics cards display numbers
- [ ] Chart displays with data
- [ ] Recent BAST section shows items
- [ ] No loading skeletons stuck
- [ ] **Actual**:

---

## 4. ✅ UI/UX Tests

### Sidebar Navigation

- [ ] Click "Dashboard" - highlighted?
- [ ] Click "Assets" - highlighted?
- [ ] Click "BAST" - highlighted?
- [ ] Active menu has:
  - [ ] Background colored
  - [ ] Bold font
- [ ] **Actual**:

### Toast Notifications

- [ ] Success toast: Green border, checkmark
- [ ] Error toast: Red border, X icon
- [ ] Toast auto-dismisses after ~5 seconds
- [ ] Multiple toasts stack correctly
- [ ] **Actual**:

### Responsive Design

- [ ] Resize browser to mobile width
- [ ] Sidebar becomes offcanvas (hamburger menu)
- [ ] Tables scroll horizontally
- [ ] Buttons stack vertically
- [ ] **Actual**:

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Cannot read property of undefined"

**Likely Cause**: Database empty or API not returning expected structure
**Fix**:

1. Check terminal for API errors
2. Run: `npx prisma studio` → Verify data exists
3. Check browser Network tab for failed requests

### Issue: "Failed to fetch"

**Likely Cause**: Dev server not running or crashed
**Fix**:

1. Check terminal - is `npm run dev` still running?
2. If crashed, restart: `npm run dev`
3. Check for port conflicts (killport 3000)

### Issue: Dialog doesn't open

**Likely Cause**: State management or component mount issue
**Fix**:

1. Hard refresh: Ctrl+Shift+R
2. Clear cache: Ctrl+Shift+Delete
3. Check console for React errors

### Issue: Form submission does nothing

**Likely Cause**: Validation failing silently or API endpoint issue
**Fix**:

1. Open Network tab (F12 → Network)
2. Submit form
3. Check if POST request sent
4. Click failed request → Preview response
5. Note error message

---

## 📊 Test Results Summary

| Feature        | Status | Notes |
| -------------- | ------ | ----- |
| Asset List     | ⬜     |       |
| Asset Create   | ⬜     |       |
| Asset Edit     | ⬜     |       |
| Asset Delete   | ⬜     |       |
| Asset Detail   | ⬜     |       |
| BAST List      | ⬜     |       |
| BAST Create    | ⬜     |       |
| BAST Detail    | ⬜     |       |
| BAST Approve   | ⬜     |       |
| Dashboard      | ⬜     |       |
| Sidebar Active | ⬜     |       |
| Toast Notif    | ⬜     |       |

Legend: ✅ Pass | ❌ Fail | ⬜ Not Tested

---

## 📝 Report Template

**Tested By**: ******\_\_\_******
**Date**: ******\_\_\_******
**Browser**: ******\_\_\_******
**Screen Size**: ******\_\_\_******

**Critical Issues Found**:

1.
2.
3.

**Minor Issues Found**:

1.
2.

**Screenshots Attached**: [ ] Yes [ ] No

---

**Next Steps After Testing:**

1. Report any failures to development team
2. Provide screenshots of errors
3. Share browser console logs
4. Note steps to reproduce issues
