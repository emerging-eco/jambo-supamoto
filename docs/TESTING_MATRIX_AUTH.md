# Testing Matrix Authentication Implementation

## Quick Verification Tests

### Test 1: Verify Infrastructure is Working

Open browser console (F12) and run:

```javascript
// Test 1: Check if secret object is accessible
import { secret, isAuthenticated } from '@utils/secrets';

console.log('Secret object:', secret);
console.log('Access token:', secret.accessToken);
console.log('Is authenticated:', isAuthenticated());
```

**Expected Result**:

- ✅ `secret` object exists
- ✅ `secret.accessToken` returns `null` (not yet authenticated)
- ✅ `isAuthenticated()` returns `false`

---

### Test 2: Verify Storage Functions Work

```javascript
import { secureSave, secureGet, secureRemove } from '@utils/storage';

// Save a test value
secureSave('test-key', 'test-value');

// Retrieve it
const value = secureGet('test-key');
console.log('Retrieved value:', value); // Should be 'test-value'

// Remove it
secureRemove('test-key');

// Verify it's gone
const removed = secureGet('test-key');
console.log('After removal:', removed); // Should be null
```

**Expected Result**:

- ✅ Value is saved and encrypted in localStorage
- ✅ Value can be retrieved and decrypted
- ✅ Value can be removed

---

### Test 3: Test Matrix Username Generation

```javascript
import { generateUsernameFromAddress } from '@utils/matrix';

const address = 'ixo1abc123def456';
const username = generateUsernameFromAddress(address);

console.log('Generated username:', username);
// Expected: 'did-ixo-ixo1abc123def456'
```

**Expected Result**:

- ✅ Username format: `did-ixo-{address}`

---

### Test 4: Test Matrix Password Generation

```javascript
import { generatePasswordFromMnemonic } from '@utils/matrix';

const mnemonic = 'test mnemonic phrase for password generation';
const password = generatePasswordFromMnemonic(mnemonic);

console.log('Generated password:', password);
// Expected: MD5 hash of the mnemonic
```

**Expected Result**:

- ✅ Password is a 32-character MD5 hash

---

### Test 5: Test Form Submission (Will Fail as Expected)

1. Navigate to the customer form
2. Fill out the form
3. Click "Continue" to go to review page
4. Click "Submit"
5. Check browser console

**Expected Console Output**:

```
Submit button clicked!
Matrix token available: false
Form data: { ... }
Submission error: Error: Matrix access token not found. Please authenticate with Matrix first.
```

**Expected Result**:

- ✅ Submit button works
- ✅ Error is caught and logged
- ✅ Error message is clear
- ✅ No "property doesn't exist" errors

---

## Manual Matrix Login Test

To test the full authentication flow manually:

```javascript
import { loginOrRegisterMatrixAccount, generateUsernameFromAddress, generatePasswordFromMnemonic } from '@utils/matrix';
import { secret } from '@utils/secrets';

// Replace with your actual wallet address and mnemonic
const address = 'ixo1abc123...';
const mnemonic = 'your twelve word mnemonic phrase here';

// Generate credentials
const username = generateUsernameFromAddress(address);
const password = generatePasswordFromMnemonic(mnemonic);

console.log('Username:', username);
console.log('Password:', password);

// Attempt login/registration
try {
  const result = await loginOrRegisterMatrixAccount({
    homeServerUrl: 'https://devmx.ixo.earth',
    username: username,
    password: password,
  });

  console.log('Login successful!');
  console.log('Access Token:', result.accessToken);
  console.log('User ID:', result.userId);
  console.log('Device ID:', result.deviceId);

  // Verify token is stored
  console.log('Token from storage:', secret.accessToken);
} catch (error) {
  console.error('Login failed:', error);
}
```

**Expected Result (Success)**:

- ✅ Login or registration succeeds
- ✅ Access token is returned
- ✅ Token is stored in secure storage
- ✅ `secret.accessToken` returns the token

**Expected Result (Failure)**:

- ⚠️ Error message explains the issue
- ⚠️ Check if Matrix server is accessible
- ⚠️ Check if credentials are correct

---

## Test the useMatrixAuth Hook

```javascript
import { useMatrixAuth } from '@hooks/useMatrixAuth';

function TestComponent() {
  const { authenticateWithMatrix, getAccessToken, isAuthenticated, loading, error } = useMatrixAuth();

  const handleAuth = async () => {
    try {
      const address = 'ixo1abc123...';
      const mnemonic = 'your twelve word mnemonic phrase';

      const result = await authenticateWithMatrix(address, mnemonic);
      console.log('Authenticated:', result);

      const token = getAccessToken();
      console.log('Token:', token);

      const isAuth = isAuthenticated();
      console.log('Is authenticated:', isAuth);
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  return (
    <div>
      <button onClick={handleAuth}>Authenticate</button>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <p>Authenticated: {isAuthenticated() ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

## Verify Environment Variables

```javascript
console.log('Matrix Homeserver:', process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL);
console.log('Matrix Room Bot:', process.env.NEXT_PUBLIC_MATRIX_ROOM_BOT_URL);
```

**Expected Output**:

```
Matrix Homeserver: https://devmx.ixo.earth
Matrix Room Bot: https://matrix-room-bot.testmx.ixo.earth
```

---

## Check Secure Storage in Browser

1. Open DevTools (F12)
2. Go to Application tab
3. Expand Local Storage
4. Look for encrypted keys

**Expected**:

- Keys are hashed (SHA256)
- Values are encrypted (AES)
- Cannot read values directly

---

## Network Tab Verification

When you click Submit on the review page:

1. Open DevTools Network tab
2. Click Submit button
3. Check for requests

**Current Expected Behavior**:

- ❌ No network request (error thrown before fetch)
- ✅ Console shows error about missing token

**After Matrix Login**:

- ✅ POST request to `https://supamoto.claims.bot.testmx.ixo.earth/action`
- ✅ Authorization header present
- ✅ Request body contains form data

---

## Troubleshooting

### Issue: "Cannot find module '@utils/secrets'"

**Solution**: This is a TypeScript path alias issue. The Next.js build system handles it correctly. Ignore this error if the app runs fine.

---

### Issue: "secret.accessToken is null"

**Cause**: User hasn't authenticated with Matrix yet.

**Solution**: Implement Matrix login flow or manually authenticate using the test above.

---

### Issue: "Failed to login or register"

**Possible Causes**:

1. Matrix server is down
2. Network connectivity issue
3. Invalid credentials
4. CORS issue

**Debug**:

```javascript
// Test Matrix server connectivity
fetch('https://devmx.ixo.earth/_matrix/client/versions')
  .then((r) => r.json())
  .then((data) => console.log('Matrix server versions:', data))
  .catch((err) => console.error('Cannot reach Matrix server:', err));
```

---

### Issue: "Encryption/Decryption fails"

**Cause**: SecureStorage might have issues in some browsers.

**Debug**:

```javascript
import { secureSave, secureGet } from '@utils/storage';

// Test encryption
secureSave('test', 'hello');
const result = secureGet('test');
console.log('Encryption test:', result === 'hello' ? 'PASS' : 'FAIL');
```

---

## Success Checklist

Before proceeding to implement the login flow, verify:

- [ ] Development server runs without errors
- [ ] `secret.accessToken` is accessible (returns null)
- [ ] `isAuthenticated()` returns false
- [ ] Storage functions work (save/get/remove)
- [ ] Username generation works
- [ ] Password generation works
- [ ] Environment variables are set
- [ ] CustomerFormReview uses `secret.accessToken`
- [ ] Submit button triggers handleSubmit
- [ ] Error is caught and logged correctly
- [ ] No "property doesn't exist" errors

---

## Next Steps

Once all tests pass, you're ready to implement the Matrix login flow. Choose one of these approaches:

1. **Add mnemonic input step** - Prompt user for mnemonic after wallet connection
2. **Use wallet signature** - Sign a challenge with wallet instead of using mnemonic
3. **Manual token entry** - Add settings page to paste Matrix token (testing only)

Refer to `MATRIX_AUTH_IMPLEMENTATION_SUMMARY.md` for detailed implementation options.
