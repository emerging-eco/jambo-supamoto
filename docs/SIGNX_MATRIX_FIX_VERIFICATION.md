# SignX Matrix Fix - Quick Verification Checklist

## 🧪 Quick Testing Guide

Use this checklist to verify that the `matrix: true` parameter fix is working correctly.

---

## ✅ Pre-Testing Setup

- [ ] Development server is running (`yarn dev`)
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] IXO Impacts X mobile app installed and ready

---

## 📋 Test 1: Clear Previous State

**Run in Browser Console**:
```javascript
localStorage.clear();
```

**Then refresh page** (Cmd+R or Ctrl+R)

- [ ] localStorage cleared
- [ ] Page refreshed
- [ ] No wallet connected

---

## 📋 Test 2: SignX Login with Matrix Credentials

### **Step 1: Initiate Login**

1. Click "Connect Wallet" button
2. Select "SignX"
3. SignX QR code modal appears

- [ ] QR code displayed
- [ ] Modal shows "SignX Login"

### **Step 2: Complete Login**

1. Scan QR code with IXO Impacts X mobile app
2. Approve login in mobile app
3. Wait for login to complete

- [ ] QR code scanned successfully
- [ ] Login approved in mobile app
- [ ] Modal closes
- [ ] Wallet connected (address visible in UI)

### **Step 3: Verify Console Output**

**Check Console for**:

```
SignX login success: {
  data: {
    name: "...",
    address: "ixo1...",
    did: "did:ixo:...",
    matrix: {                    // ✅ MUST BE PRESENT
      accessToken: "syt_...",
      userId: "@user:...",
      roomId: "!...",
      ...
    }
  }
}
```

- [ ] "SignX login success" message appears
- [ ] Response includes `matrix` field ✅
- [ ] `matrix.accessToken` is present ✅
- [ ] `matrix.userId` is present ✅

**Then check for**:
```
Matrix credentials stored successfully
```

- [ ] "Matrix credentials stored successfully" appears ✅

**If both checks pass, the fix is working!** ✅

---

## 📋 Test 3: Verify localStorage

### **Check Encrypted Matrix Token**

**Run in Console**:
```javascript
localStorage.getItem('jambo-supamoto-secret-key-v1')
```

**Expected**: Encrypted string (e.g., `"U2FsdGVkX1+abc123..."`)

- [ ] Returns encrypted data (not null) ✅

### **Check Wallet Data**

**Run in Console**:
```javascript
JSON.parse(localStorage.getItem('wallet')).user.matrix
```

**Expected**: Matrix credentials object

- [ ] Returns object with `accessToken`, `userId`, etc. ✅

**If both checks pass, Matrix credentials are stored!** ✅

---

## 📋 Test 4: Blockchain Claim Submission - Customer Action

### **Step 1: Navigate to Customer Action**

1. Go to customer action page
2. Fill out customer form:
   - Customer ID (pre-filled)
   - Client Group Type
   - First Name, Last Name
   - National Registration Number
   - Contact Number
   - Delivery Method
   - Profile Image
   - Location Information
3. Click "Continue"

- [ ] Form filled out
- [ ] Review step appears

### **Step 2: Submit Claim**

1. Review data
2. Click "Submit" button
3. Watch console output

**Expected Console Output**:
```
Submit button clicked!
Performing blockchain claim submission...
Matrix token available: true  ✅
Form data: {...}
Customer Collection ID: 478
Collection found: 478
Saving claim data to Matrix bot...
Claim saved with ID: <cid>
MsgSubmitClaim value: {...}
Message created, preparing to sign and broadcast...
Using SignX wallet for broadcasting...
```

- [ ] "Submit button clicked!" appears
- [ ] "Performing blockchain claim submission..." appears ✅
- [ ] "Matrix token available: true" appears ✅
- [ ] "Customer Collection ID: 478" appears
- [ ] "Collection found: 478" appears
- [ ] "Saving claim data to Matrix bot..." appears
- [ ] "Claim saved with ID: <cid>" appears
- [ ] "Using SignX wallet for broadcasting..." appears

### **Step 3: Sign Transaction**

1. SignX QR code modal appears
2. Scan QR code with mobile app
3. Approve transaction in mobile app
4. Wait for transaction to complete

**Expected Console Output**:
```
Transaction successful! Hash: <hash>
```

- [ ] SignX QR code modal appears
- [ ] Transaction approved in mobile app
- [ ] "Transaction successful! Hash: <hash>" appears ✅
- [ ] Result page shows success ✅

**If all checks pass, customer claim submission works!** ✅

---

## 📋 Test 5: Blockchain Claim Submission - Proclamation Action

### **Step 1: Navigate to Proclamation Action**

1. Go to proclamation action page
2. Check the 1000 Day Household checkbox
3. Click "Continue"

- [ ] Checkbox checked
- [ ] Review step appears

### **Step 2: Submit Claim**

1. Review data
2. Click "Submit" button
3. Watch console output

**Expected Console Output**:
```
Submit button clicked!
Performing blockchain proclamation claim submission...
Matrix token available: true  ✅
Form data: {...}
Proclamation Collection ID: 479
Collection found: 479
Saving proclamation claim data to Matrix bot...
Claim saved with ID: <cid>
...
Using SignX wallet for broadcasting...
```

- [ ] "Submit button clicked!" appears
- [ ] "Performing blockchain proclamation claim submission..." appears ✅
- [ ] "Matrix token available: true" appears ✅
- [ ] "Proclamation Collection ID: 479" appears
- [ ] "Collection found: 479" appears
- [ ] "Saving proclamation claim data to Matrix bot..." appears
- [ ] "Claim saved with ID: <cid>" appears
- [ ] "Using SignX wallet for broadcasting..." appears

### **Step 3: Sign Transaction**

1. SignX QR code modal appears
2. Scan QR code with mobile app
3. Approve transaction in mobile app
4. Wait for transaction to complete

**Expected Console Output**:
```
Transaction successful! Hash: <hash>
```

- [ ] SignX QR code modal appears
- [ ] Transaction approved in mobile app
- [ ] "Transaction successful! Hash: <hash>" appears ✅
- [ ] Result page shows success ✅

**If all checks pass, proclamation claim submission works!** ✅

---

## 📊 Final Verification

### **All Tests Passed?**

- [ ] Test 1: localStorage cleared ✅
- [ ] Test 2: SignX login includes matrix credentials ✅
- [ ] Test 3: Matrix credentials stored in localStorage ✅
- [ ] Test 4: Customer claim submission works ✅
- [ ] Test 5: Proclamation claim submission works ✅

**If all checkboxes are checked, the fix is working perfectly!** ✅

---

## 🐛 Troubleshooting

### **Issue: "Matrix credentials stored successfully" NOT shown**

**Possible Causes**:
1. SignX mobile app not updated to latest version
2. Data Vault not configured in mobile app
3. Network/environment issue

**Debug Steps**:
1. Check SignX login response in console - does it include `matrix` field?
2. Update IXO Impacts X mobile app to latest version
3. Verify Data Vault is configured in mobile app settings
4. Try disconnecting and reconnecting wallet

---

### **Issue: "Matrix token available: false"**

**Possible Causes**:
1. Matrix credentials not stored during login
2. localStorage cleared after login

**Debug Steps**:
1. Check localStorage:
   ```javascript
   localStorage.getItem('jambo-supamoto-secret-key-v1')
   ```
2. If null, Matrix credentials were not stored
3. Disconnect and reconnect wallet
4. Verify "Matrix credentials stored successfully" appears

---

### **Issue: Blockchain submission still fails**

**Possible Causes**:
1. Collection IDs not configured
2. Collection not found on blockchain
3. Matrix claim bot API error
4. Network/RPC error

**Debug Steps**:
1. Check `.env.local` has collection IDs:
   - `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=478`
   - `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=479`
2. Check console for specific error message
3. Check Network tab for failed API requests
4. Verify RPC endpoint is accessible

---

## 📝 Expected vs Actual

### **Before Fix**:

**SignX Login Response**:
```json
{
  "data": {
    "address": "ixo1...",
    "did": "did:ixo:...",
    // ❌ NO matrix field
  }
}
```

**Console Output**:
```
Submit button clicked!
// ❌ Nothing else (fails at Matrix token check)
```

**Result**: ❌ "Submission failed"

---

### **After Fix**:

**SignX Login Response**:
```json
{
  "data": {
    "address": "ixo1...",
    "did": "did:ixo:...",
    "matrix": {                    // ✅ PRESENT
      "accessToken": "syt_...",
      "userId": "@user:...",
      ...
    }
  }
}
```

**Console Output**:
```
Submit button clicked!
Performing blockchain claim submission...
Matrix token available: true  ✅
Customer Collection ID: 478
...
Transaction successful! Hash: <hash>
```

**Result**: ✅ "Success! Customer submitted successfully!"

---

## ✅ Success Indicators

**You know the fix is working when you see**:

1. ✅ SignX login response includes `matrix` field
2. ✅ Console shows "Matrix credentials stored successfully"
3. ✅ localStorage contains `jambo-supamoto-secret-key-v1`
4. ✅ Console shows "Matrix token available: true"
5. ✅ Blockchain submission proceeds past Matrix token check
6. ✅ Claims are submitted successfully
7. ✅ Result page shows success message

**If you see all 7 indicators, the fix is working perfectly!** ✅

---

**Testing Time**: ~10 minutes  
**Critical Tests**: 5  
**Success Rate**: Should be 100%  
**Status**: Ready for testing

