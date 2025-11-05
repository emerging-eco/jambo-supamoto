# SignX Matrix Authentication - Testing Guide

## 🧪 Quick Testing Steps

This guide helps you verify that SignX Matrix authentication works correctly.

---

## ✅ Test 1: SignX Wallet - First Time Authentication

### **Steps**:

1. **Clear browser storage** (to simulate first-time user):

   ```javascript
   // In browser console (F12)
   localStorage.clear();
   ```

2. **Refresh page** and connect SignX wallet

3. **Fill out the customer form**:
   - Navigate to the form
   - Fill in all required fields
   - Click "Continue" to review page

4. **Click "Submit" button**

### **Expected Console Output**:

```
Submit button clicked!
No Matrix token found
SignX wallet detected - authenticating with address-based credentials...
SignX Matrix authentication starting for address: ixo1abc123...
Generated Matrix username: did-ixo-ixo1abc123...
Login failed, attempting registration: [error message]
SignX Matrix authentication successful!
SignX Matrix authentication successful, proceeding with submission...
Performing submission...
Matrix token available: true
Form data: {...}
Making API request...
API response status: 200
API response data: {...}
```

### **Expected Behavior**:

- ✅ **No modal appears** (this is key!)
- ✅ Form submits automatically after brief pause
- ✅ Success or error page shows based on API response
- ✅ No errors in console (except expected API errors if any)

### **What's Happening Behind the Scenes**:

1. System detects no Matrix token
2. Detects wallet type is 'signX'
3. Automatically generates Matrix credentials from address
4. Registers/logs in to Matrix server
5. Stores token in encrypted localStorage
6. Proceeds with form submission

---

## ✅ Test 2: SignX Wallet - Returning User

### **Steps**:

1. **Keep localStorage intact** (don't clear it)
2. **Refresh page**
3. **Reconnect SignX wallet**
4. **Fill out form and submit**

### **Expected Console Output**:

```
Submit button clicked!
Performing submission...
Matrix token available: true
Form data: {...}
Making API request...
```

### **Expected Behavior**:

- ✅ Form submits **immediately**
- ✅ No authentication step (token already exists)
- ✅ No modal
- ✅ Faster submission

---

## ✅ Test 3: Keplr/Opera Wallet - Modal Still Works

### **Steps**:

1. **Clear localStorage**
2. **Disconnect SignX wallet**
3. **Connect Keplr or Opera wallet**
4. **Fill out form and submit**

### **Expected Behavior**:

- ✅ MatrixAuthModal **appears**
- ✅ Shows "Authenticate with Wallet" button
- ✅ Clicking button prompts wallet for signature
- ✅ After approval, modal closes
- ✅ Form submits automatically

### **Verification**:

This confirms that the existing modal-based authentication for Keplr/Opera wallets is **not broken** by the SignX changes.

---

## ✅ Test 4: Error Handling

### **Test 4a: No Wallet Address**

**Simulate**: Wallet connected but no address available

**Expected**:

- ✅ Error message: "Wallet address not found. Please reconnect your wallet."
- ✅ No crash
- ✅ User can retry

### **Test 4b: Network Error**

**Steps**:

1. Disconnect internet
2. Clear localStorage
3. Connect SignX wallet
4. Try to submit form

**Expected**:

- ✅ Error message about Matrix authentication failure
- ✅ Clear error in console
- ✅ No crash

### **Test 4c: Matrix Server Down**

**Expected**:

- ✅ Error message displayed
- ✅ User can retry later
- ✅ App remains functional

---

## 🔍 What to Check in Browser Console

### **Good Signs (Expected)**:

```
✅ "SignX wallet detected - authenticating with address-based credentials..."
✅ "SignX Matrix authentication successful!"
✅ "Matrix token available: true"
✅ "API response status: 200"
```

### **Bad Signs (Should NOT appear)**:

```
❌ "Unsupported wallet type: signX"
❌ "TypeError: Cannot read properties of undefined"
❌ "Matrix access token not found. Please authenticate with Matrix first."
❌ MatrixAuthModal appearing for SignX users
```

---

## 🔍 What to Check in Network Tab

### **After SignX Authentication**:

1. **Open DevTools → Network tab**
2. **Submit form**
3. **Look for POST request** to:

   ```
   https://supamoto.claims.bot.testmx.ixo.earth/action
   ```

4. **Check Request Headers**:

   ```
   Authorization: Bearer syt_...
   Content-Type: application/json
   ```

5. **Check Request Payload**:
   ```json
   {
     "action": "submit-existing-customer-claim",
     "flags": { ... }
   }
   ```

---

## 🔍 What to Check in Application Tab

### **localStorage Verification**:

1. **Open DevTools → Application tab**
2. **Expand Local Storage**
3. **Look for encrypted keys**:
   - Keys are hashed (SHA256)
   - Values are encrypted (AES)
   - Should see Matrix-related keys

4. **Verify token exists**:
   ```javascript
   // In console
   import { secret } from '@utils/secrets';
   console.log('Access Token:', secret.accessToken);
   console.log('User ID:', secret.userId);
   console.log('Device ID:', secret.deviceId);
   ```

**Expected Output**:

```
Access Token: syt_abc123...
User ID: @did-ixo-ixo1abc123...:devmx.ixo.earth
Device ID: ABCDEF123456
```

---

## 📊 Test Results Checklist

Before considering the implementation complete, verify:

### **SignX Wallet**:

- [ ] No modal appears on first submission
- [ ] Authentication happens automatically
- [ ] Form submits successfully
- [ ] Matrix token is stored
- [ ] Subsequent submissions use stored token
- [ ] Console shows correct authentication flow
- [ ] No errors in console

### **Keplr/Opera Wallet**:

- [ ] Modal appears on first submission
- [ ] Wallet signature prompt works
- [ ] Modal closes after authentication
- [ ] Form submits after modal closes
- [ ] Token is stored
- [ ] Subsequent submissions skip modal

### **Error Handling**:

- [ ] Missing address handled gracefully
- [ ] Network errors show clear messages
- [ ] User can retry after errors
- [ ] No crashes or blank screens

### **General**:

- [ ] Development server runs without errors
- [ ] No TypeScript compilation errors
- [ ] No breaking changes to existing features
- [ ] API requests include Authorization header

---

## 🐛 Troubleshooting

### **Issue: Modal still appears for SignX**

**Check**:

```javascript
// In console during form submission
console.log('Wallet type:', wallet?.walletType);
```

**Expected**: Should show `'signX'`

**If different**: The wallet type detection is wrong. Check wallet connection.

---

### **Issue: "Wallet address not found"**

**Check**:

```javascript
// In console
console.log('Wallet user:', wallet?.user);
console.log('Address:', wallet?.user?.address);
```

**Expected**: Should show the wallet address

**If undefined**: Wallet not properly connected. Reconnect wallet.

---

### **Issue: Authentication fails**

**Check**:

1. Environment variable is set:

   ```bash
   # In .env
   NEXT_PUBLIC_MATRIX_HOMESERVER_URL=https://devmx.ixo.earth
   ```

2. Matrix server is accessible:

   ```javascript
   // In console
   fetch('https://devmx.ixo.earth/_matrix/client/versions')
     .then((r) => r.json())
     .then(console.log);
   ```

3. Network connectivity

---

### **Issue: Token not persisting**

**Check**:

1. localStorage is enabled in browser
2. No browser extensions blocking storage
3. Not in incognito/private mode

**Fix**:

```javascript
// Clear and retry
localStorage.clear();
// Reconnect wallet and submit again
```

---

## 🎯 Success Criteria

**All tests pass when**:

- ✅ SignX users authenticate automatically
- ✅ No modal for SignX users
- ✅ Keplr/Opera users see modal
- ✅ All wallet types can submit forms
- ✅ Tokens persist across sessions
- ✅ Error handling works correctly
- ✅ No console errors
- ✅ API requests succeed

---

## 📝 Reporting Issues

If you encounter problems:

1. **Capture console output**:
   - Right-click in console
   - "Save as..." to save logs

2. **Note the exact steps**:
   - What wallet type?
   - What did you click?
   - What happened vs. what was expected?

3. **Check browser and version**:
   - Chrome, Firefox, Safari?
   - Version number?

4. **Include localStorage state**:
   ```javascript
   console.log('Storage keys:', Object.keys(localStorage));
   ```

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Test with real API**:
   - Verify form submissions reach the backend
   - Check API responses are correct

2. **Test on different browsers**:
   - Chrome
   - Firefox
   - Safari
   - Mobile browsers

3. **Test production build**:

   ```bash
   yarn build
   yarn start
   ```

4. **Deploy to staging**:
   - Test in staging environment
   - Verify all features work

---

**Testing Time**: ~15 minutes  
**Critical Tests**: 4  
**Success Rate**: Should be 100%  
**Status**: Ready for testing
