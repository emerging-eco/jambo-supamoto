# Matrix Token Extraction - Testing Guide

## 🧪 Quick Testing Checklist

Use this guide to verify that Matrix token extraction is working correctly.

---

## ✅ Pre-Testing Setup

- [ ] SignX mobile app (IXO Impacts X) installed on phone
- [ ] SignX account configured with Data Vault access
- [ ] Development server running (`yarn dev`)
- [ ] Browser DevTools open (F12 or Cmd+Option+I)
- [ ] Console tab visible

---

## 📋 Test 1: SignX Login and Matrix Token Storage

### **Step 1: Clear Previous State**

1. **Open Browser Console** (F12)
2. **Run**:
   ```javascript
   localStorage.clear();
   ```
3. **Refresh page** (Cmd+R or Ctrl+R)
4. **Verify**: Page loads, no wallet connected

---

### **Step 2: Connect SignX Wallet**

1. **Click "Connect Wallet"** button (or wallet icon in UI)
2. **Select "SignX"** from wallet options
3. **SignX QR code modal appears**
4. **Scan QR code** with IXO mobile app
5. **Approve login** in mobile app

---

### **Step 3: Verify Console Output**

**Expected Console Logs**:

```
SignX login success: {data: {...}}
Matrix credentials stored successfully  ✅
```

**If you see this**, Matrix token extraction is working! ✅

**If you DON'T see "Matrix credentials stored successfully"**:

- ❌ Check console for errors
- ❌ Check if user.matrix exists in login response
- ❌ Verify SignX account has Data Vault access

---

### **Step 4: Verify localStorage**

**Run in Console**:

```javascript
localStorage.getItem('jambo-supamoto-secret-key-v1');
```

**Expected Result**:

```
"U2FsdGVkX1+abc123..." // Encrypted data
```

**If null or undefined**:

- ❌ Matrix credentials were not stored
- ❌ Check console for errors during login

---

### **Step 5: Verify Matrix Token Accessible**

**Run in Console**:

```javascript
// Check if secret utility can decrypt token
const secretKey = localStorage.getItem('jambo-supamoto-secret-key-v1');
console.log('Encrypted data exists:', !!secretKey);

// The actual token is accessed via secret.accessToken in the code
// You can't easily access it from console due to module imports
// But if localStorage has encrypted data, the token is stored correctly
```

---

## 📋 Test 2: Blockchain Claim Submission

### **Prerequisites**:

- [ ] SignX wallet connected
- [ ] Matrix credentials stored (verified in Test 1)
- [ ] Collection IDs configured in `.env.local`

---

### **Test Customer Action**:

1. **Navigate to customer action**
2. **Fill out customer form**:
   - Customer ID (pre-filled)
   - Client Group Type
   - First Name, Last Name
   - National Registration Number
   - Contact Number
   - Delivery Method
   - Profile Image
   - Location Information
3. **Click "Continue"** to review step
4. **Click "Submit"** button

**Expected Console Output**:

```
Submit button clicked!
Performing blockchain claim submission...
Matrix token available: true  ✅
Customer Collection ID: <id>
Collection found: <id>
Saving claim data to Matrix bot...
Claim saved with ID: <cid>
MsgSubmitClaim value: {...}
Message created, preparing to sign and broadcast...
Using SignX wallet for broadcasting...
```

**Then**:

- SignX QR code modal appears
- Scan QR code with mobile app
- Approve transaction
- Transaction successful! Hash: <hash>

**If you see "Matrix token available: true"**, the fix is working! ✅

---

### **Test Proclamation Action**:

1. **Navigate to proclamation action**
2. **Check the 1000 Day Household checkbox**
3. **Click "Continue"** to review step
4. **Click "Submit"** button

**Expected Console Output**:

```
Submit button clicked!
Performing blockchain proclamation claim submission...
Matrix token available: true  ✅
Proclamation Collection ID: <id>
...
```

---

## 📋 Test 3: Error Handling

### **Test 3.1: SignX Without Data Vault Access**

If your SignX account is NOT configured with Data Vault access:

**Expected Error**:

```
Error: Data Vault credentials not found. Please ensure your IXO mobile app is properly configured with a Data Vault account.
```

**Console Output**:

```
Matrix credentials incomplete: {accessToken: undefined, userId: undefined}
Initializing wallets error: Error: Data Vault credentials not found...
```

This is the **correct behavior** - the error message is descriptive and helpful.

---

### **Test 3.2: Submission Without Matrix Token**

1. **Clear localStorage**:
   ```javascript
   localStorage.clear();
   ```
2. **Refresh page**
3. **Try to submit a claim** (without connecting wallet)

**Expected Error**:

```
Wallet not connected. Please connect your wallet.
```

**If you connect wallet but Matrix token is missing**:

```
Matrix authentication required. Please authenticate with Matrix first.
```

---

## 📊 Success Checklist

### **SignX Login**:

- [ ] QR code appears
- [ ] Can scan with mobile app
- [ ] Login succeeds
- [ ] Console shows: "SignX login success"
- [ ] Console shows: "Matrix credentials stored successfully" ✅
- [ ] localStorage contains encrypted data
- [ ] Wallet address appears in UI

### **Matrix Token Storage**:

- [ ] localStorage.getItem('jambo-supamoto-secret-key-v1') returns encrypted data
- [ ] No errors in console during login
- [ ] Matrix credentials validated (accessToken and userId exist)

### **Blockchain Submission**:

- [ ] Console shows: "Matrix token available: true" ✅
- [ ] Console shows: "Customer/Proclamation Collection ID: <id>"
- [ ] Console shows: "Saving claim data to Matrix bot..."
- [ ] Console shows: "Claim saved with ID: <cid>"
- [ ] SignX QR code modal appears for transaction signing
- [ ] Transaction succeeds after approval

---

## 🐛 Troubleshooting

### **Issue: "Matrix credentials stored successfully" NOT shown**

**Possible Causes**:

1. SignX account not configured with Data Vault
2. SignX SDK not returning matrix credentials
3. Code error in wallet context

**Debug Steps**:

1. Check console for errors
2. Check if `user.matrix` exists:
   ```javascript
   // Add temporary log in contexts/wallet.tsx
   console.log('User object:', user);
   console.log('Matrix credentials:', user?.matrix);
   ```
3. Verify SignX mobile app is up to date
4. Contact IXO support about Data Vault access

---

### **Issue: "Matrix token available: false"**

**Possible Causes**:

1. Matrix credentials not stored during login
2. localStorage cleared after login
3. Encryption/decryption error

**Debug Steps**:

1. Check localStorage:
   ```javascript
   localStorage.getItem('jambo-supamoto-secret-key-v1');
   ```
2. If null, Matrix credentials were not stored
3. Disconnect and reconnect wallet
4. Check console for storage errors

---

### **Issue: Blockchain submission still fails**

**Possible Causes**:

1. Collection IDs not configured
2. Collection not found on blockchain
3. Network/RPC error
4. Claim bot API error

**Debug Steps**:

1. Check `.env.local` has collection IDs
2. Verify collection IDs are correct
3. Check console for specific error message
4. Check Network tab for failed API requests

---

## 📝 Expected Console Output (Complete Flow)

### **Successful Flow**:

```
// 1. SignX Login
SignX login success: {data: {address: "ixo1...", did: "did:x:...", matrix: {...}}}
Matrix credentials stored successfully

// 2. Navigate to Action
[User navigates to customer or proclamation action]

// 3. Fill Out Form
[User fills out form and clicks Continue]

// 4. Review Step
[User reviews data and clicks Submit]

// 5. Blockchain Submission
Submit button clicked!
Performing blockchain claim submission...
Matrix token available: true
Form data: {...}
Customer Collection ID: <collection-id>
Collection found: <collection-id>
Saving claim data to Matrix bot...
Claim saved with ID: <claim-id>
MsgSubmitClaim value: {adminAddress: "...", agentAddress: "...", ...}
Message created, preparing to sign and broadcast...
Using SignX wallet for broadcasting...

// 6. Transaction Signing
[SignX QR code modal appears]
[User scans and approves in mobile app]

// 7. Success
Transaction successful! Hash: <tx-hash>
```

---

## ✅ Final Verification

After completing all tests:

- [ ] SignX login works
- [ ] "Matrix credentials stored successfully" appears in console
- [ ] localStorage contains encrypted Matrix token
- [ ] Blockchain submission shows "Matrix token available: true"
- [ ] Claims can be submitted successfully
- [ ] Transactions appear on blockchain

**If all checkboxes are checked**, the Matrix token extraction is working correctly! ✅

---

**Testing Time**: ~15 minutes  
**Critical Tests**: 2 (SignX login + Blockchain submission)  
**Success Rate**: Should be 100%  
**Status**: Ready for testing
