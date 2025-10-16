# SurveyJS Forms Update - Testing Guide

## 🧪 Quick Testing Steps

This guide helps you verify that both updated SurveyJS forms work correctly.

---

## ✅ Test 1: Customer Form (Action 1)

### **Steps**:

1. **Navigate to Customer Action**:
   - Open http://localhost:3001
   - Click on the "Customer" action card

2. **Verify Form Loads**:
   - Form should load without errors
   - Title: "SupaMoto Existing Customer Claim"
   - All fields should be visible

3. **Check Customer ID**:
   - Customer ID field should be pre-filled with a generated ID
   - Field should be editable (you can change it)

4. **Fill Out Form**:
   - **Client Group Type**: Select from dropdown (e.g., "Utility")
   - **First Name**: Enter a first name
   - **Last Name**: Enter a last name
   - **National Registration Number**: Enter in format `123456/12/1`
   - **Contact Number**: Enter a phone number
   - **Alternative Contact Number**: Enter another phone number
   - **Delivery Method**: Select one option (e.g., "Home Delivery")
   - **Profile Image**: Click to upload or take photo
   - **Location Information**:
     - Country: Enter country name
     - Address: Enter address
     - Latitude: Enter latitude (e.g., `-26.2041`)
     - Longitude: Enter longitude (e.g., `28.0473`)

5. **Test Validation**:
   - Try submitting without required fields - should show errors
   - Try invalid National ID format - should show error
   - Try uploading non-image file - should show error

6. **Submit Form**:
   - Click "Continue" button
   - Should navigate to review page
   - All entered data should be displayed correctly

### **Expected Console Output**:
```
Loading survey from URL...
Survey loaded successfully
Survey model created
Form data: { ... all your entered data ... }
```

### **Expected Behavior**:
- ✅ Form loads quickly (< 2 seconds)
- ✅ All fields display correctly
- ✅ Customer ID is pre-filled
- ✅ Validation works
- ✅ File upload works
- ✅ Navigation to review page works
- ✅ No console errors

---

## ✅ Test 2: Proclamation Form (Action 2)

### **Steps**:

1. **Navigate to Proclamation Action**:
   - Open http://localhost:3001
   - Click on the "Proclamation" action card

2. **Verify Form Loads**:
   - Form should load without errors
   - Title: "1000 Day Household"
   - Description should be visible
   - Single checkbox should be displayed

3. **Read Description**:
   - Description: "A 1,000-day household is a family with a pregnant or breastfeeding mother, or a child younger than two years old."
   - Checkbox text: "I understand the definition of a 1,000-day household and confirm that my household is a 1,000-day household."

4. **Test Checkbox**:
   - Try clicking "Continue" without checking - should show error
   - Check the checkbox
   - Click "Continue" - should proceed

5. **Submit Form**:
   - Click "Continue" button
   - Should navigate to next step or home page

### **Expected Console Output**:
```
Loading survey from URL...
Survey loaded successfully
Survey model created
Form data: { "ecs:1000DayHousehold": ["1000DayHousehold"] }
```

### **Expected Behavior**:
- ✅ Form loads quickly (< 2 seconds)
- ✅ Title and description display correctly
- ✅ Checkbox displays correctly
- ✅ Validation works (checkbox required)
- ✅ Navigation works
- ✅ No console errors

---

## 🔍 What to Check in Browser Console

### **Good Signs (Expected)**:
```
✅ "Loading survey from URL..."
✅ "Survey loaded successfully"
✅ "Survey model created"
✅ No errors about missing fields
✅ No 404 errors for survey URLs
```

### **Bad Signs (Should NOT appear)**:
```
❌ "Error loading survey"
❌ "Failed to fetch survey"
❌ "404 Not Found" for survey URLs
❌ "TypeError: Cannot read properties of undefined"
❌ "Survey model is null"
```

---

## 🔍 What to Check in Network Tab

### **Survey Loading**:

1. **Open DevTools → Network tab**
2. **Navigate to action**
3. **Look for requests to**:
   - Customer: `https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/UWRpYxNSeMJeRmAgBIIFNkCq`
   - Proclamation: `https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/HJhNWZWdMIdKEysvAKJWDEQU`

4. **Verify**:
   - Status: 200 OK
   - Response: JSON with survey definition
   - Size: ~2-5 KB

---

## 📊 Field-by-Field Verification

### **Customer Form Fields**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Customer ID | Text | Yes | Pre-filled, editable |
| Client Group Type | Dropdown | Yes | Multiple options |
| First Name | Text | Yes | - |
| Last Name | Text | Yes | - |
| National Registration Number | Text | Yes | Format: `xxxxxx/xx/x` |
| Contact Number | Text | Yes | - |
| Alternative Contact Number | Text | No | - |
| Delivery Method | Radio | Yes | 3 options |
| Profile Image | File | Yes | JPEG/PNG only |
| Country | Text | No | In location panel |
| Address | Text | No | In location panel |
| Latitude | Text | No | In location panel |
| Longitude | Text | No | In location panel |

### **Proclamation Form Fields**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| 1000 Day Household | Checkbox | Yes | Single option |

---

## 🐛 Troubleshooting

### **Issue: Form doesn't load**

**Check**:
1. Network tab - is the survey URL returning 200?
2. Console - any errors about CORS or network?
3. Survey URL is correct in the component

**Fix**:
```javascript
// In browser console
fetch('https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/UWRpYxNSeMJeRmAgBIIFNkCq')
  .then(r => r.json())
  .then(console.log);
```

---

### **Issue: Customer ID not pre-filled**

**Check**:
```javascript
// In CustomerFormEntry.tsx, check if customerId is generated
console.log('Customer ID:', customerId);
```

**Expected**: Should show a UUID-like string

---

### **Issue: File upload doesn't work**

**Check**:
1. Browser permissions for camera/file access
2. File type is JPEG or PNG
3. File size is reasonable (< 10MB)

**Test**:
- Try uploading a small test image
- Try using camera (on mobile)
- Check console for errors

---

### **Issue: Validation not working**

**Check**:
1. Required fields are marked with asterisk
2. Error messages appear when invalid
3. Form won't submit with errors

**Test**:
- Leave required fields empty
- Enter invalid National ID format
- Try to submit - should show errors

---

### **Issue: Proclamation action not found**

**Check**:
1. `config.json` has proclamation action defined
2. Routing is updated in `[actionId].tsx`
3. Component is imported correctly

**Verify**:
```javascript
// In browser console
import config from '@constants/config.json';
console.log('Actions:', config.actions);
// Should show both customer and proclamation
```

---

## 🎯 Success Criteria

**All tests pass when**:
- ✅ Customer form loads and displays all fields
- ✅ Customer ID is pre-filled
- ✅ All validations work correctly
- ✅ File upload works
- ✅ Form submission navigates to review page
- ✅ Proclamation form loads and displays correctly
- ✅ Proclamation checkbox validation works
- ✅ Both forms submit successfully
- ✅ No console errors
- ✅ No network errors

---

## 📝 Test Results Template

Use this template to record your test results:

```
## Customer Form Test Results

Date: ___________
Tester: ___________

- [ ] Form loads without errors
- [ ] Customer ID pre-filled: ___________
- [ ] All fields display correctly
- [ ] Client Type dropdown works
- [ ] Delivery Method radio buttons work
- [ ] File upload works
- [ ] Location panel displays
- [ ] Validation works:
  - [ ] Required fields
  - [ ] National ID format
  - [ ] File type
- [ ] Form submission works
- [ ] Data passes to review page
- [ ] No console errors

Issues found: ___________

---

## Proclamation Form Test Results

Date: ___________
Tester: ___________

- [ ] Form loads without errors
- [ ] Title displays correctly
- [ ] Description displays correctly
- [ ] Checkbox displays correctly
- [ ] Checkbox validation works
- [ ] Form submission works
- [ ] No console errors

Issues found: ___________
```

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Test with Real Data**:
   - Use actual customer information
   - Upload real profile images
   - Submit to API

2. **Test Matrix Authentication**:
   - Ensure SignX auth still works
   - Ensure Keplr/Opera auth still works
   - Verify tokens are generated

3. **Test on Different Devices**:
   - Desktop browsers (Chrome, Firefox, Safari)
   - Mobile browsers (iOS Safari, Android Chrome)
   - Different screen sizes

4. **Test Production Build**:
   ```bash
   yarn build
   yarn start
   ```

5. **Deploy to Staging**:
   - Test in staging environment
   - Verify all features work
   - Check for any environment-specific issues

---

**Testing Time**: ~15 minutes  
**Critical Tests**: 2  
**Success Rate**: Should be 100%  
**Status**: Ready for testing

