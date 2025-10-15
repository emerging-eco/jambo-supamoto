# Runtime Error Fix - Testing Guide

## 🧪 How to Test the Fixes

This guide helps you verify that the runtime errors have been fixed.

---

## ✅ Quick Verification (2 minutes)

### **Test 1: Clean Start**

```bash
# 1. Clean build artifacts
rm -rf .next

# 2. Start dev server
yarn dev

# 3. Open browser to http://localhost:3000
```

**Expected Result**:
- ✅ Page loads without errors
- ✅ No console errors about "Chains changed"
- ✅ No TypeError about removeAllListeners

---

### **Test 2: Simulate Chain Mismatch**

```bash
# 1. Open browser console (F12)

# 2. Set stale wallet data with wrong chain ID
localStorage.setItem('wallet', JSON.stringify({
  user: {
    address: 'ixo1test',
    chainId: 'wrong-chain-id'
  }
}));

# 3. Refresh page
```

**Expected Result**:
- ✅ Page loads successfully
- ✅ Console shows warning: "Chain ID mismatch detected. Clearing stale wallet data."
- ✅ No crash or error
- ✅ Wallet data is cleared automatically

---

### **Test 3: Production Build + Dev Server**

```bash
# 1. Run production build
yarn build

# 2. Start dev server (without clearing .next)
yarn dev

# 3. Open browser to http://localhost:3000
```

**Expected Result**:
- ✅ Page loads without errors
- ✅ No chain mismatch errors
- ✅ App functions normally

---

## 🔍 Detailed Testing Scenarios

### **Scenario 1: Fresh Installation**

**Steps**:
1. Clone repository
2. Install dependencies: `yarn install`
3. Start dev server: `yarn dev`
4. Open http://localhost:3000

**Expected**:
- ✅ App loads successfully
- ✅ No errors in console
- ✅ Can navigate pages

---

### **Scenario 2: After Environment Change**

**Steps**:
1. Change `.env` file (e.g., switch chain network)
2. Restart dev server: `yarn dev`
3. Open http://localhost:3000

**Expected**:
- ✅ App loads successfully
- ✅ If wallet was connected, it may show chain mismatch warning
- ✅ Can reconnect wallet with new chain

---

### **Scenario 3: Wallet Connection Flow**

**Steps**:
1. Open app
2. Click "Connect Wallet"
3. Select SignX wallet
4. Complete connection

**Expected**:
- ✅ Wallet connects successfully
- ✅ No errors during initialization
- ✅ User data is stored correctly

---

### **Scenario 4: Chain Switching**

**Steps**:
1. Connect wallet on mainnet
2. Change environment to testnet
3. Refresh page

**Expected**:
- ✅ App detects chain mismatch
- ✅ Shows warning in console
- ✅ Clears stale wallet data
- ✅ Allows reconnection with testnet

---

## 🐛 What to Look For

### **Console Messages**

**Good (Expected)**:
```
✅ "Chain ID mismatch detected. Clearing stale wallet data."
✅ "Initializing wallets..."
✅ Normal Next.js compilation messages
```

**Bad (Should NOT appear)**:
```
❌ "Error: Chains changed, please logout and login again"
❌ "TypeError: Cannot read properties of undefined (reading 'removeAllListeners')"
❌ "ERROR::initializeSignX::" (unless there's a real error)
```

---

### **Network Tab**

**Check**:
- ✅ No failed requests on page load
- ✅ API calls complete successfully
- ✅ No 500 errors

---

### **Application State**

**Check**:
- ✅ Page renders correctly
- ✅ Navigation works
- ✅ Wallet connection available
- ✅ No blank screens or crashes

---

## 🔧 Troubleshooting

### **Issue: Still seeing errors**

**Solution**:
```bash
# 1. Clear everything
rm -rf .next
rm -rf node_modules/.cache

# 2. Clear browser data
# - Open DevTools (F12)
# - Application tab
# - Clear storage
# - Refresh

# 3. Restart dev server
yarn dev
```

---

### **Issue: Wallet won't connect**

**Solution**:
```javascript
// In browser console
localStorage.clear();
// Then refresh page and try again
```

---

### **Issue: Chain mismatch persists**

**Check**:
1. `.env` file has correct chain configuration
2. localStorage is cleared
3. Dev server was restarted after .env changes

---

## 📊 Test Checklist

Before considering the fix complete, verify:

- [ ] Fresh start works (no errors)
- [ ] Chain mismatch handled gracefully
- [ ] Production build + dev server works
- [ ] Wallet connection works
- [ ] No TypeError on removeAllListeners
- [ ] Console shows appropriate warnings
- [ ] App doesn't crash on initialization
- [ ] Can navigate all pages
- [ ] Matrix authentication still works
- [ ] No regression in existing features

---

## 🎯 Success Criteria

**All tests pass when**:
- ✅ No runtime errors on page load
- ✅ Chain mismatch handled automatically
- ✅ Wallet initialization completes
- ✅ App remains functional
- ✅ User experience is smooth

---

## 📝 Reporting Issues

If you find any issues:

1. **Check console for errors**
2. **Note the exact steps to reproduce**
3. **Check localStorage contents**:
   ```javascript
   console.log('Storage:', {
     wallet: localStorage.getItem('wallet'),
     chainId: localStorage.getItem('chainId'),
   });
   ```
4. **Report with**:
   - Error message
   - Steps to reproduce
   - Browser and version
   - Environment (dev/prod)

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Test Matrix Authentication**:
   - Follow `QUICK_TEST_GUIDE.md`
   - Verify wallet signature auth works
   - Test form submission

2. **Test Production Build**:
   ```bash
   yarn build
   yarn start
   ```

3. **Deploy to Staging**:
   - Test in staging environment
   - Verify all features work
   - Check for any environment-specific issues

---

**Testing Time**: ~10 minutes  
**Critical Tests**: 3  
**Optional Tests**: 4  
**Success Rate**: Should be 100%

