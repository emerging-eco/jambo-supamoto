# Blockchain Claim Submission - Testing Checklist

## 🧪 Complete Testing Guide

Use this checklist to verify that blockchain claim submission works correctly.

---

## ✅ Pre-Testing Setup

- [ ] Get Collection IDs from SupaMoto team:
  - [ ] Customer Collection ID
  - [ ] Proclamation Collection ID
- [ ] Create `.env.local` file (copy from `.env.local.example`)
- [ ] Add `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=<customer-collection-id>` to `.env.local`
- [ ] Add `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=<proclamation-collection-id>` to `.env.local`
- [ ] Verify `NEXT_PUBLIC_MATRIX_CLAIM_BOT_URL` is set
- [ ] Verify `NEXT_PUBLIC_CHAIN_RPC_URL` is set
- [ ] Restart development server (`yarn dev`)
- [ ] Browser cache cleared (Cmd+Shift+R or Ctrl+Shift+R)
- [ ] Wallet is connected (SignX, Keplr, or Opera)
- [ ] Matrix authentication completed (for claim bot access)

---

## 📋 Test 1: Customer Action with SignX Wallet

### **Setup**:

- [ ] SignX wallet connected
- [ ] SignX mobile app installed and ready
- [ ] Matrix authentication completed

### **Entry Step**:

- [ ] Navigate to http://localhost:3000
- [ ] Click "Customer" action card
- [ ] Customer form loads correctly
- [ ] Fill out all required fields:
  - [ ] Customer ID (pre-filled)
  - [ ] Client Group Type
  - [ ] First Name, Last Name
  - [ ] National Registration Number
  - [ ] Contact Number
  - [ ] Delivery Method
  - [ ] Profile Image
  - [ ] Location Information
- [ ] Click "Continue"

### **Review Step**:

- [ ] Review page loads
- [ ] All form data is displayed correctly
- [ ] Form is in read-only mode
- [ ] "Submit" button is visible in Footer
- [ ] Click "Submit" button

### **Blockchain Submission**:

- [ ] Console shows: "Performing blockchain claim submission..."
- [ ] Console shows: "Matrix token available: true"
- [ ] Console shows: "Collection ID: <id>"
- [ ] Console shows: "Collection found: <id>"
- [ ] Console shows: "Saving claim data to Matrix bot..."
- [ ] Console shows: "Claim saved with ID: <cid>"
- [ ] Console shows: "MsgSubmitClaim value: {...}"
- [ ] Console shows: "Message created, preparing to sign and broadcast..."
- [ ] Console shows: "Using SignX wallet for broadcasting..."
- [ ] **SignX QR code modal appears** ✅
- [ ] QR code is displayed
- [ ] Scan QR code with SignX mobile app
- [ ] Approve transaction in mobile app
- [ ] Modal closes after approval
- [ ] Console shows: "Transaction successful! Hash: <hash>"

### **Result Step**:

- [ ] Result page loads
- [ ] Success message is displayed
- [ ] Transaction hash is shown
- [ ] Claim ID is shown
- [ ] "Done" button is visible
- [ ] Click "Done" returns to home page

### **Blockchain Verification**:

- [ ] Copy transaction hash
- [ ] Open blockchain explorer (e.g., https://blockscan.testnet.ixo.earth)
- [ ] Search for transaction hash
- [ ] Transaction is found
- [ ] Transaction status is "Success"
- [ ] MsgSubmitClaim is visible in transaction details

---

## 📋 Test 2: Customer Action with Keplr Wallet

### **Setup**:

- [ ] Keplr wallet connected
- [ ] Keplr extension installed
- [ ] Matrix authentication completed

### **Entry Step**:

- [ ] Navigate to http://localhost:3000
- [ ] Click "Customer" action card
- [ ] Fill out customer form
- [ ] Click "Continue"

### **Review Step**:

- [ ] Review page loads
- [ ] All data is correct
- [ ] Click "Submit" button

### **Blockchain Submission**:

- [ ] Console shows blockchain submission logs
- [ ] Console shows: "Using Keplr/Opera wallet for broadcasting..."
- [ ] **Keplr approval popup appears** ✅
- [ ] Transaction details are shown in popup
- [ ] Fee is displayed
- [ ] Click "Approve" in Keplr
- [ ] Popup closes after approval
- [ ] Console shows: "Transaction successful! Hash: <hash>"

### **Result Step**:

- [ ] Result page loads with success message
- [ ] Transaction hash is displayed
- [ ] Verify transaction on blockchain explorer

---

## 📋 Test 3: Proclamation Action with SignX Wallet

### **Setup**:

- [ ] SignX wallet connected
- [ ] Matrix authentication completed

### **Entry Step**:

- [ ] Navigate to http://localhost:3000
- [ ] Click "1,000 Day Household" action card
- [ ] Proclamation form loads
- [ ] Check the 1000 Day Household checkbox
- [ ] Click "Continue"

### **Review Step**:

- [ ] Review page loads
- [ ] Checkbox is pre-checked and read-only
- [ ] Click "Submit" button

### **Blockchain Submission**:

- [ ] Console shows: "Performing blockchain proclamation claim submission..."
- [ ] Console shows claim bot and collection logs
- [ ] Console shows: "Using SignX wallet for broadcasting..."
- [ ] **SignX QR code modal appears** ✅
- [ ] Scan QR code with mobile app
- [ ] Approve transaction
- [ ] Console shows: "Transaction successful! Hash: <hash>"

### **Result Step**:

- [ ] Result page loads with success
- [ ] Transaction hash is displayed
- [ ] Verify on blockchain explorer

---

## 📋 Test 4: Proclamation Action with Keplr Wallet

### **Setup**:

- [ ] Keplr wallet connected
- [ ] Matrix authentication completed

### **Entry Step**:

- [ ] Navigate to http://localhost:3000
- [ ] Click "1,000 Day Household" action
- [ ] Check the checkbox
- [ ] Click "Continue"

### **Review Step**:

- [ ] Review page loads
- [ ] Click "Submit" button

### **Blockchain Submission**:

- [ ] Console shows blockchain submission logs
- [ ] Console shows: "Using Keplr/Opera wallet for broadcasting..."
- [ ] **Keplr approval popup appears** ✅
- [ ] Approve transaction in Keplr
- [ ] Console shows success

### **Result Step**:

- [ ] Result page loads with success
- [ ] Transaction hash is displayed

---

## 📋 Test 5: Error Handling

### **Test 5.1: No Wallet Connected**:

- [ ] Disconnect wallet
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **Expected**: Error message "Wallet not connected. Please connect your wallet."
- [ ] Result page shows error
- [ ] No blockchain submission attempted

### **Test 5.2: No Matrix Token**:

- [ ] Clear localStorage (or use incognito mode)
- [ ] Connect wallet
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **Expected**: Error message "Matrix authentication required. Please authenticate with Matrix first."
- [ ] Result page shows error

### **Test 5.3: Invalid Customer Collection ID**:

- [ ] Set `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=invalid-id` in `.env.local`
- [ ] Restart dev server
- [ ] Connect wallet and authenticate with Matrix
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **Expected**: Error message "Collection not found on blockchain"
- [ ] Result page shows error

### **Test 5.4: Invalid Proclamation Collection ID**:

- [ ] Set `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=invalid-id` in `.env.local`
- [ ] Restart dev server
- [ ] Connect wallet and authenticate with Matrix
- [ ] Navigate to proclamation action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **Expected**: Error message "Collection not found on blockchain"
- [ ] Result page shows error

### **Test 5.5: User Rejects Transaction (SignX)**:

- [ ] Connect SignX wallet
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] SignX QR code modal appears
- [ ] **Reject transaction** in mobile app (or close modal)
- [ ] **Expected**: Error message about transaction rejection
- [ ] Result page shows error

### **Test 5.6: User Rejects Transaction (Keplr)**:

- [ ] Connect Keplr wallet
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] Keplr approval popup appears
- [ ] **Click "Reject"** in Keplr
- [ ] **Expected**: Error message about transaction rejection
- [ ] Result page shows error

### **Test 5.7: Network Error**:

- [ ] Disconnect internet
- [ ] Connect wallet and authenticate with Matrix
- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **Expected**: Error message about network failure
- [ ] Result page shows error
- [ ] Reconnect internet

---

## 📋 Test 6: Back Navigation

### **Test 6.1: Back from Review to Entry**:

- [ ] Navigate to customer action
- [ ] Fill out form
- [ ] Click "Continue" to review
- [ ] Click "Back" button
- [ ] **Expected**: Returns to entry step
- [ ] **Expected**: Form data is preserved
- [ ] Modify some fields
- [ ] Click "Continue" again
- [ ] **Expected**: Review shows updated data

### **Test 6.2: Back Button Disabled During Submission**:

- [ ] Navigate to customer action
- [ ] Fill out form and continue to review
- [ ] Click "Submit"
- [ ] **During submission** (while QR code is shown or Keplr popup is open):
  - [ ] **Expected**: "Back" button is disabled
  - [ ] **Expected**: Cannot navigate away
- [ ] Complete or cancel transaction
- [ ] **Expected**: "Back" button is enabled again

---

## 📋 Test 7: Console Logs Verification

### **Expected Console Logs (Success Flow)**:

```
Submit button clicked!
Performing blockchain claim submission...
Matrix token available: true
Form data: {...}
Collection ID: <collection-id>
Collection found: <collection-id>
Saving claim data to Matrix bot...
Claim saved with ID: <claim-id>
MsgSubmitClaim value: {...}
Message created, preparing to sign and broadcast...
Using SignX wallet for broadcasting... (or Keplr/Opera)
Transaction successful! Hash: <tx-hash>
```

### **Expected Console Logs (Error Flow)**:

```
Submit button clicked!
Performing blockchain claim submission...
Blockchain submission error: <error-message>
```

---

## 📋 Test 8: UI/UX Verification

### **Submit Button States**:

- [ ] Before submission: "Submit" button is enabled
- [ ] During submission: Button shows "Submitting..."
- [ ] During submission: Button is disabled
- [ ] After success: Navigates to result page
- [ ] After error: Navigates to result page with error

### **Loading States**:

- [ ] Survey loads correctly in review step
- [ ] No flickering or layout shifts
- [ ] Smooth transition between steps

### **Error Messages**:

- [ ] Error messages are user-friendly
- [ ] Error messages are specific (not generic)
- [ ] Error messages suggest next steps

---

## 📊 Summary Checklist

### **Customer Action**:

- [ ] SignX wallet - Success flow works
- [ ] SignX wallet - Error handling works
- [ ] Keplr wallet - Success flow works
- [ ] Keplr wallet - Error handling works

### **Proclamation Action**:

- [ ] SignX wallet - Success flow works
- [ ] SignX wallet - Error handling works
- [ ] Keplr wallet - Success flow works
- [ ] Keplr wallet - Error handling works

### **Error Scenarios**:

- [ ] No wallet connected - Error shown
- [ ] No Matrix token - Error shown
- [ ] Invalid collection ID - Error shown
- [ ] User rejects transaction - Error shown
- [ ] Network error - Error shown

### **Navigation**:

- [ ] Back button works
- [ ] Back button disabled during submission
- [ ] Done button returns to home

### **Blockchain Verification**:

- [ ] Transactions appear on blockchain
- [ ] Transaction hashes are correct
- [ ] Claims are recorded correctly

---

## ✅ Final Verification

- [ ] All tests passed
- [ ] No console errors (except expected errors in error tests)
- [ ] No TypeScript compilation errors
- [ ] No runtime errors
- [ ] User experience is smooth
- [ ] Error messages are helpful
- [ ] Blockchain transactions are successful
- [ ] Claims are verifiable on blockchain

---

**Testing Time**: ~60 minutes  
**Critical Tests**: 8 (4 success flows + 4 error scenarios)  
**Success Rate**: Should be 100%  
**Status**: Ready for testing
