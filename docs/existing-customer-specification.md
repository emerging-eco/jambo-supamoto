# **Feature Specification: Submit Existing Customer Claim (Action One)**

## **1. Overview**

### **1.1 Purpose**

Implement a three-step workflow for "Action One" that allows users to submit details of an existing customer through a form-based interface, review the submitted data, and receive confirmation of the submission status.

### **1.2 User Flow Summary**

1. **Step 1**: Form Entry - User fills out customer details in a form
2. **Step 2**: Review & Confirm - User reviews entered data (read-only) with option to go back and edit
3. **Step 3**: Result Display - User sees success or failure message based on API response

### **1.3 API Integration**

- **Endpoint**: `https://supamoto.claims.bot.testmx.ixo.earth/action`
- **Action**: `submit-existing-customer-claim`
- **Method**: POST
- **Authentication**: Requires Matrix access token
- **Current Status**: API returns `NOT_IMPLEMENTED` error (needs backend implementation first)

---

## **2. Technical Architecture**

### **2.1 Step Configuration**

Update `constants/config.json` to define three steps for Action One:

```json
{
  "id": "action_one",
  "steps": [
    {
      "id": "customer_form_entry",
      "name": "Enter Customer Details"
    },
    {
      "id": "customer_form_review",
      "name": "Review Details"
    },
    {
      "id": "customer_claim_result",
      "name": "Submission Result"
    }
  ],
  "name": "Customer",
  "description": "Submit details of an existing customer",
  "image": "eKXPPhewkJDLbE1bq1iboa.png"
}
```

### **2.2 Step Type Definitions**

Add new step types to `types/steps.ts`:

```typescript
export enum STEPS {
  // ... existing steps
  customer_form_entry = 'customer_form_entry',
  customer_form_review = 'customer_form_review',
  customer_claim_result = 'customer_claim_result',
}

// Step data interfaces
interface Customer_form_entry {
  formData?: Record<string, any>;  // Form field values
}

interface Customer_form_review {
  confirmed?: boolean;
}

interface Customer_claim_result {
  success?: boolean;
  message?: string;
  errorDetails?: string;
}

// Add to AllStepDataTypes union
export type AllStepDataTypes =
  | // ... existing types
  | Customer_form_entry
  | Customer_form_review
  | Customer_claim_result;
```

---

## **3. Step 1: Form Entry Component**

### **3.1 Component Specification**

**File**: `steps/CustomerFormEntry.tsx`

### **3.2 Functional Requirements**

#### **Form Fields** (To be defined based on customer data requirements)

Suggested fields based on typical customer information:

- **Customer ID** (text, required)
- **Full Name** (text, required)
- **Phone Number** (text, required)
- **Email** (email, optional)
- **Address** (textarea, optional)
- **National ID** (text, optional)
- **Country** (dropdown: ZM/MW, required)
- **Additional Notes** (textarea, optional)

#### **Form Library Options**

Since SurveyJS is not currently in the project, consider:

**Option A: Native HTML Forms** (Recommended - matches existing codebase pattern)

- Use existing `Input` and `TextArea` components
- Follows pattern from `ShortTextInput.tsx`, `ReceiverAddress.tsx`
- No additional dependencies required
- Consistent with current architecture

**Option B: Add SurveyJS**

- Install: `npm install survey-react survey-core`
- Provides advanced form features (conditional logic, validation, themes)
- Requires additional configuration and learning curve
- May be overkill for simple form

**Option C: React Hook Form**

- Install: `npm install react-hook-form`
- Lightweight, performant form library
- Good TypeScript support
- Middle ground between native and SurveyJS

### **3.3 Component Structure** (Option A - Native Forms)

```typescript
import { FC, useState, ChangeEvent, FormEvent } from 'react';
import cls from 'classnames';
import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import Input from '@components/Input/Input';
import TextArea from '@components/TextArea/TextArea';
import { StepDataType, STEPS } from 'types/steps';

type CustomerFormEntryProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_entry>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.customer_form_entry>;
  header?: string;
};

const CustomerFormEntry: FC<CustomerFormEntryProps> = ({
  onSuccess,
  onBack,
  data,
  header
}) => {
  const [formData, setFormData] = useState({
    customerId: data?.formData?.customerId || '',
    fullName: data?.formData?.fullName || '',
    phoneNumber: data?.formData?.phoneNumber || '',
    email: data?.formData?.email || '',
    address: data?.formData?.address || '',
    nationalId: data?.formData?.nationalId || '',
    country: data?.formData?.country || 'ZM',
    notes: data?.formData?.notes || '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formIsValid = () => {
    return formData.customerId.trim() !== '' &&
           formData.fullName.trim() !== '' &&
           formData.phoneNumber.trim() !== '' &&
           formData.country !== '';
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement> | null) => {
    e?.preventDefault();
    if (formIsValid()) {
      onSuccess({ formData });
    }
  };

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <form className={styles.stepsForm} onSubmit={handleSubmit} autoComplete='off'>
          <div className={styles.stepTitle}>Enter Customer Details</div>

          <Input
            label='Customer ID *'
            name='customerId'
            required
            onChange={handleChange}
            value={formData.customerId}
            className={styles.stepInput}
          />

          <Input
            label='Full Name *'
            name='fullName'
            required
            onChange={handleChange}
            value={formData.fullName}
            className={styles.stepInput}
          />

          <Input
            label='Phone Number *'
            name='phoneNumber'
            type='tel'
            required
            onChange={handleChange}
            value={formData.phoneNumber}
            className={styles.stepInput}
          />

          <Input
            label='Email'
            name='email'
            type='email'
            onChange={handleChange}
            value={formData.email}
            className={styles.stepInput}
          />

          <TextArea
            label='Address'
            name='address'
            onChange={handleChange}
            value={formData.address}
            rows={3}
          />

          <Input
            label='National ID'
            name='nationalId'
            onChange={handleChange}
            value={formData.nationalId}
            className={styles.stepInput}
          />

          <label className={styles.label}>
            Country *
            <select
              name='country'
              required
              onChange={handleChange}
              value={formData.country}
              className={styles.stepInput}
            >
              <option value='ZM'>Zambia (ZM)</option>
              <option value='MW'>Malawi (MW)</option>
            </select>
          </label>

          <TextArea
            label='Additional Notes'
            name='notes'
            onChange={handleChange}
            value={formData.notes}
            rows={4}
          />
        </form>
      </main>

      <Footer
        onBack={onBack}
        onBackUrl={onBack ? undefined : ''}
        onForward={formIsValid() ? () => handleSubmit(null) : null}
      />
    </>
  );
};

export default CustomerFormEntry;
```

### **3.4 Validation Rules**

- **Required fields**: Customer ID, Full Name, Phone Number, Country
- **Email validation**: Standard email format (if provided)
- **Phone validation**: Numeric characters only (optional enhancement)
- **Form cannot be submitted** until all required fields are filled

### **3.5 User Experience**

- Form fields pre-populated if user navigates back from Step 2
- Clear visual indication of required fields (asterisk \*)
- Forward button disabled until form is valid
- Back button returns to home/actions list

---

## **4. Step 2: Review & Confirm Component**

### **4.1 Component Specification**

**File**: `steps/CustomerFormReview.tsx`

### **4.2 Functional Requirements**

- Display all form data in read-only format
- Provide clear visual distinction from editable form
- Show "Back" button to return to Step 1 for editing
- Show "Submit" button to proceed to API call and Step 3
- Trigger API call when Submit is clicked

### **4.3 Component Structure**

```typescript
import { FC, useState } from 'react';
import cls from 'classnames';
import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import Card, { CARD_BG_COLOR, CARD_SIZE } from '@components/Card/Card';

type CustomerFormReviewProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_review>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.customer_form_review>;
  formData: Record<string, any>; // From Step 1
  header?: string;
};

const CustomerFormReview: FC<CustomerFormReviewProps> = ({
  onSuccess,
  onBack,
  formData,
  header
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Call the API
      const response = await fetch('https://supamoto.claims.bot.testmx.ixo.earth/action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getMatrixAccessToken()}`, // TODO: Get from context/storage
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit-existing-customer-claim',
          flags: formData, // Pass form data as flags
        }),
      });

      const result = await response.json();

      // Pass result to next step
      onSuccess({
        confirmed: true,
        apiResponse: result,
        success: response.ok,
      });
    } catch (error) {
      // Pass error to next step
      onSuccess({
        confirmed: true,
        apiResponse: null,
        success: false,
        error: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const countryName = formData.country === 'ZM' ? 'Zambia' : 'Malawi';

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={styles.stepTitle}>Review Customer Details</div>

        <Card bgColor={CARD_BG_COLOR.lightGrey} size={CARD_SIZE.medium}>
          <div className={styles.reviewField}>
            <strong>Customer ID:</strong>
            <span>{formData.customerId}</span>
          </div>

          <div className={styles.reviewField}>
            <strong>Full Name:</strong>
            <span>{formData.fullName}</span>
          </div>

          <div className={styles.reviewField}>
            <strong>Phone Number:</strong>
            <span>{formData.phoneNumber}</span>
          </div>

          {formData.email && (
            <div className={styles.reviewField}>
              <strong>Email:</strong>
              <span>{formData.email}</span>
            </div>
          )}

          {formData.address && (
            <div className={styles.reviewField}>
              <strong>Address:</strong>
              <span>{formData.address}</span>
            </div>
          )}

          {formData.nationalId && (
            <div className={styles.reviewField}>
              <strong>National ID:</strong>
              <span>{formData.nationalId}</span>
            </div>
          )}

          <div className={styles.reviewField}>
            <strong>Country:</strong>
            <span>{countryName}</span>
          </div>

          {formData.notes && (
            <div className={styles.reviewField}>
              <strong>Notes:</strong>
              <span>{formData.notes}</span>
            </div>
          )}
        </Card>

        <p className={styles.reviewNote}>
          Please review the details above. Click "Back" to make changes or "Submit" to continue.
        </p>
      </main>

      <Footer
        onBack={submitting ? null : onBack}
        onBackUrl={onBack ? undefined : ''}
        onCorrect={submitting ? null : handleSubmit}
        correctLabel={submitting ? 'Submitting...' : 'Submit'}
      />
    </>
  );
};

export default CustomerFormReview;
```

### **4.4 API Integration Details**

#### **Authentication**

- Requires Matrix access token
- Token should be retrieved from wallet context or secure storage
- Format: `Authorization: Bearer <token>`

#### **Request Payload**

```json
{
  "action": "submit-existing-customer-claim",
  "flags": {
    "customerId": "customer123",
    "fullName": "John Doe",
    "phoneNumber": "+260123456789",
    "email": "john@example.com",
    "address": "123 Main St",
    "nationalId": "123456/78/9",
    "country": "ZM",
    "notes": "Existing customer from 2023"
  }
}
```

#### **Expected Responses**

**Success (200)**:

```json
{
  "message": "Existing customer claim submitted successfully."
}
```

**Current Implementation (400 - NOT_IMPLEMENTED)**:

```json
{
  "code": 501,
  "message": "Not Implemented",
  "error": "This feature is not yet implemented"
}
```

**Error (400/401/500)**:

```json
{
  "code": 400,
  "message": "Bad Request",
  "error": "Specific error message"
}
```

### **4.5 Loading States**

- Disable both Back and Submit buttons during API call
- Change Submit button label to "Submitting..."
- Optional: Show loading spinner

---

## **5. Step 3: Result Display Component**

### **5.1 Component Specification**

**File**: `steps/CustomerClaimResult.tsx`

### **5.2 Functional Requirements**

- Display success message if API call succeeded
- Display error message if API call failed
- Show appropriate icon (Success/SadFace)
- Provide navigation buttons to return to home or actions list
- No back button (submission is final)

### **5.3 Component Structure**

```typescript
import { FC } from 'react';
import cls from 'classnames';
import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import IconText from '@components/IconText/IconText';
import { StepDataType, STEPS } from 'types/steps';
import Success from '@icons/success.svg';
import SadFace from '@icons/sadFace.svg';

type CustomerClaimResultProps = {
  onSuccess: (data: StepDataType<STEPS.customer_claim_result>) => void;
  data?: StepDataType<STEPS.customer_claim_result>;
  header?: string;
};

const CustomerClaimResult: FC<CustomerClaimResultProps> = ({
  onSuccess,
  data,
  header
}) => {
  const isSuccess = data?.success === true;
  const message = data?.apiResponse?.message || data?.error || 'Unknown error occurred';

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {isSuccess ? (
          <IconText
            title='Customer claim submitted successfully!'
            Img={Success}
            imgSize={50}
          >
            <p className={styles.successMessage}>{message}</p>
          </IconText>
        ) : (
          <IconText
            title='Submission failed'
            Img={SadFace}
            imgSize={50}
          >
            <p className={styles.errorMessage}>{message}</p>
            {data?.apiResponse?.error && (
              <p className={styles.errorDetails}>{data.apiResponse.error}</p>
            )}
          </IconText>
        )}
      </main>

      <Footer
        showAccountButton={true}
        showActionsButton={true}
      />
    </>
  );
};

export default CustomerClaimResult;
```

### **5.4 Success Message Examples**

- "Customer claim submitted successfully!"
- "Your submission has been received and is being processed."
- Display any message returned from API

### **5.5 Error Message Examples**

- "Submission failed. Please try again."
- "Not Implemented: This feature is not yet available." (current API state)
- "Authentication failed. Please sign in again."
- "Network error. Please check your connection."

---

## **6. Integration with Action Page**

### **6.1 Update `pages/[actionId].tsx`**

Add imports:

```typescript
import CustomerFormEntry from '@steps/CustomerFormEntry';
import CustomerFormReview from '@steps/CustomerFormReview';
import CustomerClaimResult from '@steps/CustomerClaimResult';
```

Add cases to `getStepComponent` function:

```typescript
const getStepComponent = (step: STEP) => {
  switch (step?.id) {
    // ... existing cases

    case STEPS.customer_form_entry:
      return (
        <CustomerFormEntry
          onSuccess={handleOnNext<STEPS.customer_form_entry>}
          onBack={handleBack}
          data={step.data as StepDataType<STEPS.customer_form_entry>}
          header={action?.name}
        />
      );

    case STEPS.customer_form_review:
      return (
        <CustomerFormReview
          onSuccess={handleOnNext<STEPS.customer_form_review>}
          onBack={handleBack}
          data={step.data as StepDataType<STEPS.customer_form_review>}
          formData={
            action?.steps.find(s => s.id === STEPS.customer_form_entry)
              ?.data?.formData || {}
          }
          header={action?.name}
        />
      );

    case STEPS.customer_claim_result:
      return (
        <CustomerClaimResult
          onSuccess={handleOnNext<STEPS.customer_claim_result>}
          data={step.data as StepDataType<STEPS.customer_claim_result>}
          header={action?.name}
        />
      );

    // ... other cases
  }
};
```

---

## **7. Styling Requirements**

### **7.1 New Styles Needed**

Add to `styles/stepsPages.module.scss`:

```scss
.reviewField {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--light-grey-color);

  strong {
    color: var(--main-font-color);
    font-weight: 500;
  }

  span {
    color: var(--lighter-font-color);
    text-align: right;
    max-width: 60%;
    word-wrap: break-word;
  }

  &:last-child {
    border-bottom: none;
  }
}

.reviewNote {
  margin-top: 20px;
  text-align: center;
  color: var(--lighter-font-color);
  font-size: 14px;
}

.successMessage,
.errorMessage {
  margin-top: 16px;
  text-align: center;
  font-size: 16px;
}

.successMessage {
  color: var(--success-color);
}

.errorMessage {
  color: var(--error-color);
}

.errorDetails {
  margin-top: 8px;
  font-size: 14px;
  color: var(--lighter-font-color);
  text-align: center;
}
```

---

## **8. Testing Checklist**

### **8.1 Step 1 - Form Entry**

- [ ] All required fields show validation errors when empty
- [ ] Form cannot be submitted with invalid data
- [ ] Optional fields can be left empty
- [ ] Country dropdown shows correct options
- [ ] Data persists when navigating back from Step 2
- [ ] Back button returns to actions list

### **8.2 Step 2 - Review**

- [ ] All entered data displays correctly
- [ ] Optional fields that are empty don't show
- [ ] Back button returns to Step 1 with data intact
- [ ] Submit button triggers API call
- [ ] Loading state shows during API call
- [ ] Buttons disabled during submission

### **8.3 Step 3 - Result**

- [ ] Success message displays when API returns 200
- [ ] Error message displays when API returns error
- [ ] Appropriate icon shows (Success/SadFace)
- [ ] Action and Account buttons navigate correctly
- [ ] No back button present

### **8.4 API Integration**

- [ ] Correct endpoint called
- [ ] Authorization header included
- [ ] Request payload formatted correctly
- [ ] Handles 200 success response
- [ ] Handles 400/401/500 error responses
- [ ] Handles network errors gracefully
- [ ] Handles NOT_IMPLEMENTED (501) response

---

## **9. Dependencies & Prerequisites**

### **9.1 Backend Requirements**

⚠️ **IMPORTANT**: The API currently returns `NOT_IMPLEMENTED` error. Backend team must:

1. Implement `handleSubmitExistingCustomerClaim` handler
2. Define required form fields/flags
3. Create claim collection and template
4. Update API documentation with expected payload structure

### **9.2 Frontend Dependencies**

- No new npm packages required (using native forms)
- Existing components: Header, Footer, Input, TextArea, Card, IconText
- Existing utilities: styles, icons

### **9.3 Authentication**

- Matrix access token must be available
- Implement token retrieval from WalletContext or secure storage
- Handle token expiration/refresh

---

## **10. Future Enhancements**

### **10.1 Form Improvements**

- Add field-level validation with error messages
- Implement phone number formatting
- Add country code prefix to phone numbers
- File upload for supporting documents
- Auto-save draft to local storage

### **10.2 UX Improvements**

- Progress indicator showing current step (1 of 3, 2 of 3, etc.)
- Confirmation dialog before final submission
- Toast notifications for success/error
- Ability to copy submission details
- Print/download confirmation receipt

### **10.3 Advanced Features**

- Form field configuration from backend
- Conditional fields based on country selection
- Integration with customer database for auto-complete
- Offline support with queue for later submission
- Multi-language support

---

## **11. Implementation Timeline**

### **Phase 1: Backend Preparation** (Prerequisite)

- Backend team implements API handler
- Define exact form fields required
- Test API endpoint independently

### **Phase 2: Frontend Development** (Estimated: 2-3 days)

- Day 1: Implement Step 1 (Form Entry)
- Day 2: Implement Step 2 (Review) + Step 3 (Result)
- Day 3: Integration, styling, testing

### **Phase 3: Testing & Refinement** (Estimated: 1-2 days)

- Unit testing
- Integration testing with API
- User acceptance testing
- Bug fixes and refinements

---

## **12. Success Criteria**

✅ User can enter customer details in a form
✅ User can review entered data before submission
✅ User can navigate back to edit data
✅ API call is made with correct payload
✅ Success message displays on successful submission
✅ Error message displays on failed submission
✅ All navigation flows work correctly
✅ Form validation prevents invalid submissions
✅ Loading states provide clear feedback
✅ Consistent with existing Jambo app design patterns

---

## **13. Notes & Considerations**

### **13.1 Security**

- Ensure Matrix access token is stored securely
- Validate all input data on both client and server
- Sanitize user input to prevent XSS attacks
- Use HTTPS for all API communications

### **13.2 Performance**

- Minimize re-renders during form input
- Debounce validation checks if needed
- Optimize API payload size
- Handle slow network conditions gracefully

### **13.3 Accessibility**

- Ensure all form fields have proper labels
- Provide clear error messages
- Support keyboard navigation
- Test with screen readers

### **13.4 Browser Compatibility**

- Test on major browsers (Chrome, Firefox, Safari, Edge)
- Ensure mobile responsiveness
- Handle different screen sizes appropriately

---

This specification provides a complete blueprint for implementing the "Submit Existing Customer Claim" feature. The implementation follows existing patterns in the Jambo codebase and requires no additional dependencies beyond what's already installed.
