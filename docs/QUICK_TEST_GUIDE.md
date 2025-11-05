# Quick Test Guide - Wallet Signature Matrix Authentication

## 🚀 Quick Start Testing

### **Prerequisites**

- ✅ Development server running (`yarn dev`)
- ✅ Keplr or Opera wallet extension installed
- ✅ Wallet connected to testnet

---

## 📝 Test Scenario 1: First-Time User

### **Steps**:

1. **Clear Browser Storage**
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Local Storage" → Select your domain
   - Click "Clear All" button
   - Refresh page

2. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select Keplr or Opera
   - Approve connection in wallet

3. **Navigate to Form**
   - Go to customer form page
   - Fill out all required fields
   - Click "Continue" to review page

4. **Submit Form (Triggers Auth)**
   - Click "Submit" button
   - **Expected**: MatrixAuthModal appears

5. **Authenticate with Wallet**
   - Read the modal explanation
   - Click "Authenticate with Wallet" button
   - **Expected**: Wallet popup appears asking to sign message

6. **Approve Signature**
   - Review the signature request in wallet
   - Click "Approve"
   - **Expected**:
     - Success message appears in modal
     - Modal auto-closes after 1.5 seconds
     - Form submission proceeds automatically

7. **Verify Submission**
   - Check console for logs
   - Should see: "Matrix authentication successful!"
   - Should see: "API response status: 200" (or error if API issue)

---

## 📝 Test Scenario 2: Returning User

### **Steps**:

1. **Keep Storage Intact**
   - Do NOT clear localStorage
   - Refresh page

2. **Connect Wallet**
   - Connect same wallet as before

3. **Submit Form**
   - Fill out form
   - Click Submit
   - **Expected**: Form submits immediately (NO modal)

---

## 📝 Test Scenario 3: Rejected Signature

### **Steps**:

1. Clear localStorage
2. Connect wallet
3. Fill out form, click Submit
4. Modal appears
5. Click "Authenticate with Wallet"
6. **Reject** the signature in wallet
7. **Expected**:
   - Error message appears in modal
   - Modal stays open
   - Can click "Authenticate with Wallet" again to retry

---

## 🔍 What to Look For

### **Console Logs (Success Path)**:

```
Submit button clicked!
No Matrix token found, showing auth modal...
Generating Matrix auth challenge...
Requesting wallet signature...
Signature obtained, generating Matrix credentials...
Logging in to Matrix server...
Matrix authentication successful!
Matrix authentication successful, retrying submission...
Performing submission...
Matrix token available: true
Form data: {...}
Making API request...
API response status: 200
API response data: {...}
```

### **Network Tab**:

- POST to `https://supamoto.claims.bot.testmx.ixo.earth/action`
- Authorization header present
- Request body contains form data

### **Local Storage**:

- Check Application → Local Storage
- Should see encrypted keys (hashed with SHA256)
- Values are encrypted (AES)

---

## ❌ Common Issues & Solutions

### **Issue 1: "Wallet does not support signArbitrary method"**

**Cause**: Wallet doesn't support signing arbitrary messages

**Solution**:

- Update wallet extension to latest version
- Try different wallet (Keplr or Opera)

---

### **Issue 2: "Keplr wallet not found"**

**Cause**: Wallet extension not installed or not loaded

**Solution**:

- Install Keplr or Opera extension
- Refresh page after installation
- Check if extension is enabled

---

### **Issue 3: Modal doesn't appear**

**Cause**: Wallet or chain context not available

**Debug**:

```javascript
// In browser console
console.log('Wallet:', wallet);
console.log('Chain:', chain);
console.log('User:', wallet?.user);
console.log('WalletType:', wallet?.walletType);
console.log('ChainId:', chain?.chainId);
```

**Solution**: Ensure wallet is properly connected

---

### **Issue 4: "Matrix homeserver URL not configured"**

**Cause**: Environment variable missing

**Solution**: Check `.env` file has:

```
NEXT_PUBLIC_MATRIX_HOMESERVER_URL=https://devmx.ixo.earth
```

---

### **Issue 5: Signature succeeds but login fails**

**Cause**: Matrix server issue or network problem

**Debug**:

```javascript
// Test Matrix server connectivity
fetch('https://devmx.ixo.earth/_matrix/client/versions')
  .then((r) => r.json())
  .then((data) => console.log('Matrix server:', data))
  .catch((err) => console.error('Cannot reach Matrix:', err));
```

---

## 🎯 Success Indicators

### **✅ Authentication Successful When**:

- Modal appears on first submit
- Wallet prompts for signature
- Success message shows
- Modal auto-closes
- Form submits automatically
- Console shows "Matrix authentication successful!"
- Token stored in localStorage
- Subsequent submits work without modal

### **✅ Token Persistence Working When**:

- Refresh page
- Reconnect wallet
- Submit form
- NO modal appears (uses stored token)

---

## 🧪 Advanced Testing

### **Test Different Wallets**:

1. Test with Keplr
2. Clear storage
3. Test with Opera
4. Verify both work

### **Test Token Persistence**:

1. Authenticate successfully
2. Close browser completely
3. Reopen browser
4. Connect wallet
5. Submit form
6. Should work without re-auth

### **Test Multiple Accounts**:

1. Authenticate with Account A
2. Disconnect wallet
3. Connect with Account B
4. Submit form
5. Should prompt for new auth (different address)

---

## 📊 Quick Verification Checklist

Before considering implementation complete, verify:

- [ ] Modal appears when no token exists
- [ ] Wallet signature prompt appears
- [ ] Signature approval works
- [ ] Success message shows
- [ ] Modal auto-closes
- [ ] Form submits after auth
- [ ] Token persists after refresh
- [ ] Subsequent submits skip modal
- [ ] Error handling works (rejected signature)
- [ ] Console logs are clear and helpful
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Network request includes Authorization header
- [ ] API receives correct data

---

## 🎬 Video Walkthrough Script

If recording a demo:

1. **Intro** (5 sec)
   - "Testing Matrix authentication with wallet signature"

2. **Clear Storage** (10 sec)
   - Show DevTools
   - Clear localStorage
   - Refresh page

3. **Connect Wallet** (15 sec)
   - Click connect
   - Select Keplr
   - Approve in wallet

4. **Fill Form** (20 sec)
   - Navigate to form
   - Fill fields
   - Click Continue

5. **Trigger Auth** (30 sec)
   - Click Submit
   - Modal appears
   - Explain what's happening
   - Click "Authenticate with Wallet"

6. **Sign Message** (15 sec)
   - Wallet popup appears
   - Show signature request
   - Click Approve

7. **Success** (10 sec)
   - Success message
   - Modal closes
   - Form submits

8. **Verify Persistence** (20 sec)
   - Refresh page
   - Reconnect wallet
   - Submit again
   - No modal (uses stored token)

**Total**: ~2 minutes

---

## 💡 Pro Tips

1. **Keep Console Open**: Watch the logs to understand the flow
2. **Use Network Tab**: Verify API calls are made correctly
3. **Check Application Tab**: See encrypted tokens in localStorage
4. **Test Edge Cases**: Rejected signatures, network errors, etc.
5. **Clear Storage Between Tests**: Ensures clean state

---

## 🆘 Need Help?

If tests fail, check:

1. Console for error messages
2. Network tab for failed requests
3. `.env` file for correct URLs
4. Wallet extension is up to date
5. Connected to correct network (testnet)

Refer to `WALLET_SIGNATURE_AUTH_IMPLEMENTATION.md` for detailed debugging steps.
