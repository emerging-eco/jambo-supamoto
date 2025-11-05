# Proclamation Action - Testing Checklist

## 🧪 Complete Testing Guide

Use this checklist to verify that the proclamation action works correctly.

---

## ✅ Pre-Testing Setup

- [ ] Development server is running (`yarn dev`)
- [ ] Browser cache cleared (Cmd+Shift+R or Ctrl+Shift+R)
- [ ] Wallet is connected (SignX, Keplr, or Opera)
- [ ] Matrix homeserver is accessible

---

## 📋 Step 1: Entry Form Testing

### **Navigation**:

- [ ] Navigate to http://localhost:3000
- [ ] "1,000 Day Household" action card is visible
- [ ] Click on the action card
- [ ] Page loads without errors

### **Form Display**:

- [ ] Title: "1000 Day Household" is visible
- [ ] Description is visible: "A 1,000-day household is a family with a pregnant or breastfeeding mother, or a child younger than two years old."
- [ ] Single checkbox is displayed
- [ ] Checkbox text: "I understand the definition of a 1,000-day household and confirm that my household is a 1,000-day household."
- [ ] "Continue" button is visible

### **Form Interaction**:

- [ ] Can check the checkbox
- [ ] Can uncheck the checkbox
- [ ] "Continue" button is clickable
- [ ] Validation works (can't proceed without checking)

### **Form Submission**:

- [ ] Check the checkbox
- [ ] Click "Continue"
- [ ] No console errors
- [ ] Navigates to review step

### **Console Output** (Expected):

```
Loading survey from URL...
Survey loaded successfully
Survey model created
```

---

## 📋 Step 2: Review Form Testing

### **Page Load**:

- [ ] Review page loads without errors
- [ ] Title: "Review Your Proclamation" is visible
- [ ] Subtitle: "Please review your information before submitting" is visible
- [ ] Form is displayed

### **Form Display**:

- [ ] Same form structure as entry step
- [ ] Checkbox is pre-checked (from step 1)
- [ ] Checkbox is read-only (can't uncheck)
- [ ] Form is in display mode (grayed out)
- [ ] "Submit" button is visible
- [ ] "Back" button is visible

### **Back Navigation**:

- [ ] Click "Back" button
- [ ] Returns to entry step
- [ ] Entry form still has checkbox checked
- [ ] Click "Continue" again to return to review

### **Matrix Authentication** (SignX):

- [ ] Click "Submit" button
- [ ] Console shows: "SignX wallet detected - authenticating with address-based credentials..."
- [ ] Console shows: "SignX Matrix authentication successful, proceeding with submission..."
- [ ] No modal appears (automatic authentication)
- [ ] Proceeds to API submission

### **Matrix Authentication** (Keplr/Opera):

- [ ] Click "Submit" button
- [ ] MatrixAuthModal appears
- [ ] Modal shows "Authenticate with Wallet" button
- [ ] Click "Authenticate with Wallet"
- [ ] Wallet prompts for signature
- [ ] Sign the challenge in wallet
- [ ] Modal closes after successful authentication
- [ ] Proceeds to API submission

### **API Submission**:

- [ ] Console shows: "Performing submission..."
- [ ] Console shows: "Matrix token available: true"
- [ ] Console shows: "Making API request..."
- [ ] Console shows: "API response status: <status>"
- [ ] Console shows: "API response data: <data>"
- [ ] Navigates to result step

### **Console Output** (Expected):

```
Submit button clicked!
Matrix token available: true (or authentication flow)
Performing submission...
Form data: { "ecs:1000DayHousehold": ["1000DayHousehold"] }
Making API request...
API response status: 200
API response data: {...}
```

---

## 📋 Step 3: Result Form Testing

### **Success State**:

- [ ] Result page loads without errors
- [ ] Green checkmark (✓) is visible
- [ ] Title: "Success!" is displayed
- [ ] Message: "Proclamation submitted successfully!" is shown
- [ ] Details: "Your 1,000 Day Household proclamation has been recorded successfully." is visible
- [ ] "Done" button is visible

### **Error State** (if API fails):

- [ ] Result page loads without errors
- [ ] Red X (✗) is visible
- [ ] Title: "Submission Failed" is displayed
- [ ] Error message is shown
- [ ] Error details are shown (if available)
- [ ] Suggestion: "Please try again or contact support if the problem persists." is visible
- [ ] "Done" button is visible

### **Navigation**:

- [ ] Click "Done" button
- [ ] Returns to home page (http://localhost:3000)
- [ ] No errors in console

---

## 🔍 Browser Console Checks

### **No Errors**:

- [ ] No red errors in console
- [ ] No TypeScript compilation errors
- [ ] No 404 errors for survey URLs
- [ ] No authentication errors (unless expected)

### **Expected Logs**:

```
✅ Loading survey from URL...
✅ Survey loaded successfully
✅ Survey model created
✅ Submit button clicked!
✅ SignX wallet detected... (or Matrix auth modal shown)
✅ Performing submission...
✅ Matrix token available: true
✅ Making API request...
✅ API response status: 200
```

---

## 🔍 Network Tab Checks

### **Survey Loading**:

- [ ] Request to `https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/UWRpYxNSeMJeRmAgBIIFNkCq`
- [ ] Status: 200 OK
- [ ] Response: JSON with survey definition
- [ ] Response includes: "1000 Day Household" title

### **API Submission**:

- [ ] Request to `<API_URL>/action`
- [ ] Method: POST
- [ ] Headers include: `Authorization: Bearer <token>`
- [ ] Body includes: `{ "action": "submit-1000-day-household-proclamation", "flags": {...} }`
- [ ] Status: 200 OK (or appropriate error status)
- [ ] Response: JSON with result data

---

## 🧪 Edge Case Testing

### **Test 1: Without Matrix Token**:

- [ ] Clear localStorage
- [ ] Start proclamation flow
- [ ] Complete entry step
- [ ] On review step, click "Submit"
- [ ] **SignX**: Should auto-authenticate
- [ ] **Keplr/Opera**: Should show auth modal
- [ ] After authentication, submission proceeds

### **Test 2: With Existing Matrix Token**:

- [ ] Complete flow once (token is stored)
- [ ] Start proclamation flow again
- [ ] Complete entry step
- [ ] On review step, click "Submit"
- [ ] Should proceed directly to submission (no auth needed)

### **Test 3: Back Navigation**:

- [ ] Complete entry step
- [ ] On review step, click "Back"
- [ ] Modify entry (uncheck and recheck)
- [ ] Click "Continue"
- [ ] Review should show updated data

### **Test 4: API Error Handling**:

- [ ] Disconnect internet or use invalid API URL
- [ ] Complete entry and review steps
- [ ] Click "Submit"
- [ ] Should show error result page
- [ ] Error message should be clear
- [ ] "Done" button should work

---

## 📊 Comparison Testing

### **Compare with Customer Action**:

- [ ] Both actions have 3 steps
- [ ] Both have entry → review → result flow
- [ ] Both use Matrix authentication
- [ ] Both make API requests
- [ ] Both show success/error results
- [ ] Both return to home on "Done"

### **Differences** (Expected):

- [ ] Customer has multi-field form, Proclamation has single checkbox
- [ ] Customer uses different API endpoint
- [ ] Customer has more complex data structure

---

## ✅ Final Verification

### **Complete Flow**:

- [ ] Can complete entire flow from start to finish
- [ ] All 3 steps work correctly
- [ ] Navigation works (forward and back)
- [ ] Matrix authentication works
- [ ] API submission works
- [ ] Result display works
- [ ] Return to home works

### **No Regressions**:

- [ ] Customer action still works
- [ ] Other actions still work
- [ ] Wallet connection still works
- [ ] Matrix authentication still works for other actions

---

## 🐛 Known Issues to Watch For

### **Potential Issues**:

- [ ] Survey URL returns 404 (check URL is correct)
- [ ] Matrix authentication fails (check homeserver URL)
- [ ] API endpoint not found (check API URL in .env)
- [ ] CORS errors (check API CORS configuration)
- [ ] TypeScript errors (check type definitions)

### **If Issues Found**:

1. Note the exact error message
2. Note the step where it occurred
3. Check browser console for details
4. Check network tab for failed requests
5. Report with reproduction steps

---

## 📝 Test Results Template

```
## Proclamation Action Test Results

Date: ___________
Tester: ___________
Browser: ___________
Wallet Type: ___________

### Step 1: Entry
- [ ] Form loads correctly
- [ ] Checkbox works
- [ ] Validation works
- [ ] Navigation to review works

### Step 2: Review
- [ ] Form displays correctly
- [ ] Data is pre-filled
- [ ] Read-only mode works
- [ ] Matrix auth works
- [ ] API submission works
- [ ] Navigation to result works

### Step 3: Result
- [ ] Success/error displays correctly
- [ ] "Done" button works
- [ ] Returns to home

### Overall
- [ ] Complete flow works end-to-end
- [ ] No console errors
- [ ] No network errors
- [ ] User experience is smooth

Issues Found: ___________

Notes: ___________
```

---

## 🎯 Success Criteria

**All tests pass when**:

- ✅ All 3 steps load and display correctly
- ✅ Navigation works in both directions
- ✅ Matrix authentication works for all wallet types
- ✅ API submission succeeds
- ✅ Result page shows appropriate message
- ✅ No console errors
- ✅ No network errors
- ✅ User can complete full flow

---

**Testing Time**: ~20 minutes  
**Critical Tests**: 3 (one per step)  
**Edge Cases**: 4  
**Success Rate**: Should be 100%  
**Status**: Ready for testing
