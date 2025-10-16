# Separate Collection IDs - Update Summary

## ✅ Update Complete

Successfully updated the blockchain claim submission implementation to use separate collection IDs for customer and proclamation actions.

---

## 📋 Changes Made

### **1. Environment Variables (.env.local.example)**

**BEFORE**:
```bash
# Collection ID (get from SupaMoto team or blockchain)
# This is the collection ID for the claims being submitted
NEXT_PUBLIC_COLLECTION_ID=
```

**AFTER**:
```bash
# Collection IDs (get from SupaMoto team or blockchain)
# Customer Collection ID - for customer claims
NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=

# Proclamation Collection ID - for 1000 Day Household proclamation claims
NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=
```

**Rationale**: Each action type (customer and proclamation) requires its own collection ID on the blockchain.

---

### **2. CustomerFormReview.tsx (Line 67-73)**

**BEFORE**:
```typescript
// 3. Get collection ID from environment
const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID;
if (!collectionId) {
  throw new Error('Collection ID not configured. Please set NEXT_PUBLIC_COLLECTION_ID environment variable.');
}

console.log('Collection ID:', collectionId);
```

**AFTER**:
```typescript
// 3. Get customer collection ID from environment
const collectionId = process.env.NEXT_PUBLIC_CUSTOMER_COLLECTION_ID;
if (!collectionId) {
  throw new Error('Customer Collection ID not configured. Please set NEXT_PUBLIC_CUSTOMER_COLLECTION_ID environment variable.');
}

console.log('Customer Collection ID:', collectionId);
```

**Changes**:
- ✅ Changed environment variable from `NEXT_PUBLIC_COLLECTION_ID` to `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID`
- ✅ Updated error message to reference the correct variable name
- ✅ Updated console log to indicate "Customer Collection ID"

---

### **3. ProclamationFormReview.tsx (Line 67-73)**

**BEFORE**:
```typescript
// 3. Get collection ID from environment
const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID;
if (!collectionId) {
  throw new Error('Collection ID not configured. Please set NEXT_PUBLIC_COLLECTION_ID environment variable.');
}

console.log('Collection ID:', collectionId);
```

**AFTER**:
```typescript
// 3. Get proclamation collection ID from environment
const collectionId = process.env.NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID;
if (!collectionId) {
  throw new Error('Proclamation Collection ID not configured. Please set NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID environment variable.');
}

console.log('Proclamation Collection ID:', collectionId);
```

**Changes**:
- ✅ Changed environment variable from `NEXT_PUBLIC_COLLECTION_ID` to `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID`
- ✅ Updated error message to reference the correct variable name
- ✅ Updated console log to indicate "Proclamation Collection ID"

---

### **4. Documentation Updates**

Updated the following documentation files:
- ✅ `BLOCKCHAIN_CLAIM_SUBMISSION_IMPLEMENTATION.md` - Updated environment variables section and code examples
- ✅ `BLOCKCHAIN_SUBMISSION_TESTING_CHECKLIST.md` - Updated pre-testing setup and error test cases

---

## 📊 Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **Environment Variables** | 1 variable (`NEXT_PUBLIC_COLLECTION_ID`) | 2 variables (`NEXT_PUBLIC_CUSTOMER_COLLECTION_ID`, `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID`) |
| **Customer Action** | Uses `NEXT_PUBLIC_COLLECTION_ID` | Uses `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID` |
| **Proclamation Action** | Uses `NEXT_PUBLIC_COLLECTION_ID` | Uses `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID` |
| **Error Messages** | Generic "Collection ID not configured" | Specific "Customer Collection ID not configured" or "Proclamation Collection ID not configured" |
| **Console Logs** | Generic "Collection ID: <id>" | Specific "Customer Collection ID: <id>" or "Proclamation Collection ID: <id>" |

---

## 🎯 Benefits

1. **Clarity**: Each action clearly uses its own collection ID
2. **Flexibility**: Different collections can be configured for different claim types
3. **Error Messages**: More specific error messages help with debugging
4. **Console Logs**: Easier to identify which collection ID is being used
5. **Maintainability**: Easier to update collection IDs independently

---

## 🔍 How It Works

### **Customer Action Flow**:
1. User fills out customer form
2. User reviews and clicks "Submit"
3. System reads `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID` from environment
4. System creates MsgSubmitClaim with customer collection ID
5. Transaction is broadcasted to blockchain
6. Claim is recorded in customer collection

### **Proclamation Action Flow**:
1. User fills out proclamation form
2. User reviews and clicks "Submit"
3. System reads `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID` from environment
4. System creates MsgSubmitClaim with proclamation collection ID
5. Transaction is broadcasted to blockchain
6. Claim is recorded in proclamation collection

---

## ✅ Verification

### **Files Modified**: 4
1. `.env.local.example` - Added two separate collection ID variables
2. `steps/CustomerFormReview.tsx` - Updated to use `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID`
3. `steps/ProclamationFormReview.tsx` - Updated to use `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID`
4. `BLOCKCHAIN_CLAIM_SUBMISSION_IMPLEMENTATION.md` - Updated documentation
5. `BLOCKCHAIN_SUBMISSION_TESTING_CHECKLIST.md` - Updated testing guide

### **Lines Changed**: ~20 lines total

---

## 🧪 Testing Instructions

### **Setup**:
1. Get both collection IDs from SupaMoto team:
   - Customer Collection ID
   - Proclamation Collection ID

2. Create or update `.env.local`:
   ```bash
   NEXT_PUBLIC_MATRIX_CLAIM_BOT_URL=https://supamoto.claims.bot.testmx.ixo.earth
   NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=<customer-collection-id>
   NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=<proclamation-collection-id>
   NEXT_PUBLIC_CHAIN_RPC_URL=https://rpc.testnet.ixo.earth
   ```

3. Restart development server:
   ```bash
   yarn dev
   ```

### **Test Customer Action**:
1. Navigate to customer action
2. Fill out form and submit
3. Check console logs:
   - Should see: "Customer Collection ID: <customer-id>"
   - Should NOT see: "Proclamation Collection ID"
4. Verify transaction uses customer collection ID

### **Test Proclamation Action**:
1. Navigate to proclamation action
2. Fill out form and submit
3. Check console logs:
   - Should see: "Proclamation Collection ID: <proclamation-id>"
   - Should NOT see: "Customer Collection ID"
4. Verify transaction uses proclamation collection ID

### **Test Error Messages**:

**Missing Customer Collection ID**:
1. Remove `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID` from `.env.local`
2. Restart server
3. Try to submit customer claim
4. Expected error: "Customer Collection ID not configured. Please set NEXT_PUBLIC_CUSTOMER_COLLECTION_ID environment variable."

**Missing Proclamation Collection ID**:
1. Remove `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID` from `.env.local`
2. Restart server
3. Try to submit proclamation claim
4. Expected error: "Proclamation Collection ID not configured. Please set NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID environment variable."

---

## 📝 Important Notes

### **Environment Variables**:
- Both collection IDs must be set in `.env.local`
- Each action will fail if its specific collection ID is missing
- Error messages clearly indicate which collection ID is missing

### **Collection IDs**:
- Customer and proclamation actions use different collections
- Each collection has its own admin, schema, and rules
- Claims are stored separately in their respective collections

### **Backward Compatibility**:
- The old `NEXT_PUBLIC_COLLECTION_ID` variable is no longer used
- If you have an existing `.env.local` with the old variable, you need to:
  1. Rename it to `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID`
  2. Add `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID` with the proclamation collection ID

---

## 🚀 Next Steps

1. **Get Collection IDs** from SupaMoto team:
   - Request customer collection ID
   - Request proclamation collection ID

2. **Update .env.local**:
   ```bash
   NEXT_PUBLIC_CUSTOMER_COLLECTION_ID=<customer-id>
   NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID=<proclamation-id>
   ```

3. **Restart Server**:
   ```bash
   yarn dev
   ```

4. **Test Both Actions**:
   - Test customer action with customer collection ID
   - Test proclamation action with proclamation collection ID
   - Verify correct collection IDs are used in console logs
   - Verify transactions are recorded in correct collections

5. **Verify on Blockchain**:
   - Check customer claims in customer collection
   - Check proclamation claims in proclamation collection
   - Ensure no cross-contamination

---

## 📚 Reference

### **Environment Variable Names**:
- `NEXT_PUBLIC_CUSTOMER_COLLECTION_ID` - Customer claims collection
- `NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID` - Proclamation claims collection

### **Error Messages**:
- "Customer Collection ID not configured. Please set NEXT_PUBLIC_CUSTOMER_COLLECTION_ID environment variable."
- "Proclamation Collection ID not configured. Please set NEXT_PUBLIC_PROCLAMATION_COLLECTION_ID environment variable."

### **Console Logs**:
- "Customer Collection ID: <id>" - When submitting customer claim
- "Proclamation Collection ID: <id>" - When submitting proclamation claim

---

**Date**: 2025-10-15  
**Status**: ✅ COMPLETE  
**Impact**: Medium - Separates collection IDs for different claim types  
**Testing**: Required - Test both actions with separate collection IDs

