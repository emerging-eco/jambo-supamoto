# Chain Network Selection Fix - Testing Guide

## Quick Start Testing

### 1. Verify Environment Configuration
```bash
# Check current environment variables
cat .env.local | grep -E "NEXT_PUBLIC_ENABLE_DEVELOPER_MODE|NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK"
```

**Expected Output**:
```
NEXT_PUBLIC_ENABLE_DEVELOPER_MODE=1
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=devnet
```

### 2. Start Development Server
```bash
npm run dev
# or
yarn dev
```

### 3. Browser Console Verification

Open browser DevTools (F12) and check the console for:

**Expected Log Output** (when submitting a form):
```
Using RPC URL: https://devnet.ixo.earth/rpc/
```

**NOT Expected** (this would indicate the bug):
```
Using RPC URL: https://testnet.ixo.earth/rpc/
```

### 4. React DevTools Verification

1. Install React DevTools browser extension (if not already installed)
2. Open React DevTools (Components tab)
3. Find `ChainProvider` component
4. Inspect the `chain` object in the context
5. Verify `chainNetwork` property shows `'devnet'`

**Expected**:
```javascript
chain: {
  chainId: "devnet-1",
  chainNetwork: "devnet",
  chainLoading: false
}
```

**NOT Expected** (this would indicate the bug):
```javascript
chain: {
  chainId: "pandora-8",
  chainNetwork: "testnet",
  chainLoading: false
}
```

## Functional Testing

### Test 1: Customer Form Submission

1. Navigate to the dApp home page
2. Select "Customer Form" action
3. Fill out all required fields
4. Click "Next" to proceed through steps
5. Reach the "Review Your Information" page
6. **Check Console**: Verify RPC URL is `https://devnet.ixo.earth/rpc/`
7. Click "Submit" button
8. **Expected**: Transaction submitted successfully to devnet
9. **Verify**: Check transaction hash in devnet block explorer

### Test 2: Proclamation Form Submission

1. Navigate to the dApp home page
2. Select "Proclamation Form" action
3. Fill out all required fields
4. Click "Next" to proceed through steps
5. Reach the "Review Your Information" page
6. **Check Console**: Verify RPC URL is `https://devnet.ixo.earth/rpc/`
7. Click "Submit" button
8. **Expected**: Transaction submitted successfully to devnet
9. **Verify**: Check transaction hash in devnet block explorer

## Environment Variable Testing

### Test 3: Explicit Network Override

**Test with Testnet**:
```bash
# Update .env.local
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=testnet

# Restart dev server
npm run dev
```

**Verify**:
- Console should show: `Using RPC URL: https://testnet.ixo.earth/rpc/`
- React DevTools should show: `chainNetwork: "testnet"`

**Test with Mainnet**:
```bash
# Update .env.local
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=mainnet

# Restart dev server
npm run dev
```

**Verify**:
- Console should show: `Using RPC URL: https://impacthub.ixo.world/rpc/`
- React DevTools should show: `chainNetwork: "mainnet"`

**Restore to Devnet**:
```bash
# Update .env.local back to
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=devnet

# Restart dev server
npm run dev
```

### Test 4: Developer Mode Disabled

```bash
# Update .env.local
NEXT_PUBLIC_ENABLE_DEVELOPER_MODE=0
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=devnet

# Restart dev server
npm run dev
```

**Verify**:
- Should default to mainnet (since developer mode is disabled)
- Console should show: `Using RPC URL: https://impacthub.ixo.world/rpc/`
- React DevTools should show: `chainNetwork: "mainnet"`

**Restore**:
```bash
# Update .env.local back to
NEXT_PUBLIC_ENABLE_DEVELOPER_MODE=1
NEXT_PUBLIC_DEFAULT_CHAIN_NETWORK=devnet
```

## Debugging Tips

### Enable Detailed Logging

Add this to `steps/CustomerFormReview.tsx` temporarily for debugging:

```typescript
const performSubmission = async () => {
  console.log('=== BLOCKCHAIN SUBMISSION DEBUG ===');
  console.log('Chain Network:', chain?.chainNetwork);
  console.log('Chain ID:', chain?.chainId);
  console.log('RPC URL:', getChainRpcUrl(chain?.chainNetwork));
  console.log('Wallet Address:', wallet?.user?.address);
  console.log('===================================');
  // ... rest of function
};
```

### Check Network in Browser

1. Open DevTools Network tab
2. Look for requests to the RPC endpoint
3. Verify the domain matches the expected network:
   - devnet: `devnet.ixo.earth`
   - testnet: `testnet.ixo.earth`
   - mainnet: `impacthub.ixo.world`

### Verify Blockchain Explorer

After successful submission, verify the transaction:

**Devnet Explorer**: https://devnet-blockscan.ixo.earth/
**Testnet Explorer**: https://blockscan-pandora.ixo.earth/
**Mainnet Explorer**: https://blockscan.ixo.earth/

Search for the transaction hash returned by the submission.

## Troubleshooting

### Issue: Still seeing testnet RPC URL

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Hard refresh browser (Ctrl+Shift+R)
4. Check `.env.local` file is saved correctly

### Issue: Chain selector shows wrong network

**Solution**:
1. Check React DevTools for actual `chainNetwork` value
2. Verify environment variables are set correctly
3. Restart dev server
4. Check browser console for any errors

### Issue: Transaction fails with "Collection not found"

**Possible Causes**:
1. Wrong RPC URL (verify in console)
2. Collection ID doesn't exist on selected network
3. Wallet not connected to correct network

**Solution**:
1. Verify RPC URL in console
2. Check collection ID in environment variables
3. Ensure wallet is connected to correct chain

## Success Criteria

✅ All tests pass when:
- [ ] Console shows correct RPC URL for selected network
- [ ] React DevTools shows correct `chainNetwork` value
- [ ] Customer form submission succeeds
- [ ] Proclamation form submission succeeds
- [ ] Transactions appear on correct blockchain explorer
- [ ] Environment variables are respected
- [ ] Network can be changed via environment variable

## Rollback Instructions

If issues occur, revert changes:

```bash
# Revert constants/chains.ts
git checkout constants/chains.ts

# Revert steps/CustomerFormReview.tsx
git checkout steps/CustomerFormReview.tsx

# Restart dev server
npm run dev
```

