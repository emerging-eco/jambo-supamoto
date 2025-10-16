# Quick Start Guide - SurveyJS Customer Claim

## 🚀 Getting Started

### **1. Start the Development Server**

```bash
yarn dev
```

The server will start on `http://localhost:3001` (or next available port).

### **2. Access the Customer Claim Form**

Navigate to: **`http://localhost:3001/action_one`**

---

## 📋 What to Expect

### **Step 1: Enter Customer Details**
- Survey form loads from remote URL
- Fill out all required fields
- Click "Continue" to proceed

### **Step 2: Review Details**
- See your data in read-only mode
- Click "Back" to edit
- Click "Submit" to send to API

### **Step 3: Submission Result**
- See success or error message
- Navigate to Account or Actions

---

## 🔧 Troubleshooting

### **Survey Not Loading**
- Check network connection
- Verify survey URL is accessible: `https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/xpPfyzgHkigQPtXFuRRBLBwr`
- Check browser console for errors

### **API Submission Fails**
- Expected: API may return "NOT_IMPLEMENTED" error (backend not ready)
- Check Matrix access token is available
- Verify API endpoint is accessible

### **Styles Look Wrong**
- Ensure `/survey-core.css` is accessible in public folder
- Check browser console for CSS loading errors
- Clear browser cache

---

## 📝 Configuration

### **Change Survey URL**

Edit both files:
- `steps/CustomerFormEntry.tsx` (line 22)
- `steps/CustomerFormReview.tsx` (line 22)

```typescript
const SURVEY_URL = 'YOUR_NEW_URL_HERE';
```

### **Change API Endpoint**

Edit `steps/CustomerFormReview.tsx` (line 47):

```typescript
const response = await fetch('YOUR_API_ENDPOINT', {
  // ...
});
```

---

## 🧪 Testing Checklist

- [ ] Survey loads successfully
- [ ] All form fields are visible
- [ ] Required field validation works
- [ ] Can navigate to Step 2
- [ ] Data displays correctly in review
- [ ] Can navigate back to Step 1
- [ ] Data persists when going back
- [ ] Submit button triggers API call
- [ ] Loading state shows during submission
- [ ] Success/error message displays
- [ ] Can navigate to Account/Actions

---

## 📚 Documentation

- **`IMPLEMENTATION_SUMMARY.md`** - Complete implementation details
- **`surveyjs-implementation-guide.md`** - SurveyJS guide
- **`existing-customer-specification.md`** - Feature specification

---

## 🆘 Need Help?

Check the browser console for errors and refer to the implementation summary for detailed information about each component.

