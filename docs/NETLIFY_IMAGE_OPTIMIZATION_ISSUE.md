# Netlify Image Optimization Issue - Analysis & Solution

## Problem Summary

**Status**: 🔴 **IDENTIFIED**

The application is experiencing HTTP 500 errors when loading wallet images on Netlify deployment:

- Error endpoint: `/_next/image?url=...&w=96&q=75`
- Affected images: `/images/wallets/signX.png`, `/images/wallets/keplr.png`, etc.
- Works fine in local development
- Only fails on Netlify production deployment

## Root Cause Analysis

### Issue 1: Next.js 12 Image Optimization on Netlify Edge Runtime

**Problem**:

- The application uses `next.config.js` with `experimental: { runtime: 'edge' }`
- Next.js 12 image optimization is **not compatible** with Netlify Edge Runtime
- When `NEXT_USE_NETLIFY_EDGE=true` is set in `netlify.toml`, the image optimization pipeline fails

**Why It Fails**:

1. Next.js image optimization requires Node.js runtime (uses Sharp library)
2. Edge Runtime is a lightweight, serverless environment without Node.js capabilities
3. The `/_next/image` endpoint tries to run in Edge Runtime but fails because Sharp isn't available
4. Result: HTTP 500 error

### Issue 2: Missing Image Dimensions

**Problem**:

- Some images use `layout='fill'` without explicit width/height
- The `ImageWithFallback` component doesn't always provide required dimensions
- This can cause issues with image optimization

**Example**:

```typescript
// In Swiper.tsx - uses layout='fill' without width/height
<ImageWithFallback
  fallbackSrc='/images/actions/fallback.png'
  src={`/images/actions/${action.image}`}
  alt={action.name}
  layout='fill'  // ← Requires parent container sizing
  className={styles.actionImage}
/>
```

## Solution Strategy

### Option 1: Disable Image Optimization (Recommended for Netlify)

- Disable Next.js image optimization entirely
- Serve images as static files
- Pros: Simple, reliable, no runtime overhead
- Cons: No image optimization benefits

### Option 2: Use Netlify Functions Instead of Edge Runtime

- Keep image optimization but use Node.js runtime
- Requires more configuration
- Pros: Keeps optimization benefits
- Cons: More complex, slower cold starts

### Option 3: Upgrade to Next.js 13+

- Newer versions have better Netlify support
- Requires significant dependency updates
- Pros: Better performance, modern features
- Cons: Breaking changes, extensive testing needed

## Recommended Fix: Option 1 (Disable Image Optimization)

### Why This Is Best:

1. **Simplest**: One-line configuration change
2. **Reliable**: No runtime dependencies
3. **Fast**: Static file serving is optimized
4. **Safe**: No breaking changes
5. **Appropriate**: For a dApp with limited image optimization needs

### Implementation

**File**: `next.config.js`

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  experimental: {
    runtime: 'edge',
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // ← ADD THIS LINE
    domains: ['raw.githubusercontent.com', 'app.osmosis.zone', 's3.amazonaws.com'],
  },
};

module.exports = nextConfig;
```

### What `unoptimized: true` Does:

- Disables Next.js image optimization pipeline
- Images are served as-is from `/public` directory
- No `/_next/image` endpoint calls
- No Sharp library dependency
- Works perfectly with Netlify Edge Runtime

## Alternative: Update netlify.toml (Option 2)

If you want to keep image optimization, modify `netlify.toml`:

```toml
[build]
  command = "yarn run build"
  publish = ".next"
  base = "."

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[plugins]]
  package = "@netlify/plugin-lighthouse"

[build.environment]
  # REMOVE THIS LINE:
  # NEXT_USE_NETLIFY_EDGE = "true"
  NETLIFY_USE_YARN = "true"
```

**Note**: This uses Node.js runtime instead of Edge Runtime, which is slower but supports image optimization.

## Implementation Plan

### Step 1: Update next.config.js

Add `unoptimized: true` to images configuration

### Step 2: Test Locally

```bash
npm run build
npm run start
# Verify images load without optimization
```

### Step 3: Deploy to Netlify

Push changes and trigger new deployment

### Step 4: Verify on Production

- Check wallet images load correctly
- Check action images load correctly
- Verify no 500 errors in browser console
- Test on different devices/browsers

## Expected Results After Fix

✅ **Wallet Images**: Load successfully

- `/images/wallets/signX.png`
- `/images/wallets/keplr.png`
- `/images/wallets/opera.png`
- `/images/wallets/impacts-x.png`
- `/images/wallets/wallet-connect.png`
- `/images/wallets/fallback.png`

✅ **Action Images**: Load successfully

- `/images/actions/*.png`

✅ **Chain Logo Images**: Load successfully

- `/images/chain-logos/fallback.png`

✅ **No 500 Errors**: `/_next/image` endpoint no longer called

## Performance Impact

### Before (With Optimization):

- Smaller image files (optimized)
- Slower on Netlify (500 errors)
- Better for high-traffic sites

### After (Without Optimization):

- Slightly larger image files
- Fast on Netlify (static serving)
- Acceptable for dApp with limited images
- Better user experience (no errors)

## Files to Modify

| File             | Change                  | Impact                      |
| ---------------- | ----------------------- | --------------------------- |
| `next.config.js` | Add `unoptimized: true` | Disables image optimization |

## Rollback Plan

If issues occur:

```bash
# Remove the unoptimized: true line from next.config.js
git checkout next.config.js
npm run build
# Redeploy
```

## Testing Checklist

- [ ] Build succeeds locally: `npm run build`
- [ ] Start succeeds locally: `npm run start`
- [ ] Wallet images load in local build
- [ ] Action images load in local build
- [ ] No console errors in local build
- [ ] Deploy to Netlify succeeds
- [ ] Wallet images load on Netlify
- [ ] Action images load on Netlify
- [ ] No 500 errors on Netlify
- [ ] No `/_next/image` requests in network tab

## Additional Notes

### Image Optimization Trade-offs

**Pros of Disabling**:

- ✅ Works with Netlify Edge Runtime
- ✅ Simpler configuration
- ✅ No runtime errors
- ✅ Faster deployment

**Cons of Disabling**:

- ❌ Slightly larger image files
- ❌ No automatic format conversion (WebP)
- ❌ No responsive image sizing

**For This Project**:

- Images are small (wallet icons, action images)
- File size impact is minimal
- User experience improvement (no errors) outweighs optimization benefits

### Future Improvements

1. **Optimize images manually**: Use ImageOptim or similar tools
2. **Use CDN**: Serve images from Cloudinary or similar
3. **Upgrade Next.js**: Move to 13+ for better Netlify support
4. **Use Netlify Functions**: Keep optimization with Node.js runtime

## Conclusion

The recommended fix is to add `unoptimized: true` to the `next.config.js` images configuration. This is the simplest, most reliable solution for Netlify Edge Runtime deployments.

**Status**: ✅ **READY FOR IMPLEMENTATION**
