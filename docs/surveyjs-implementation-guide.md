# **SurveyJS Implementation Guide for Jambo SupaMoto**

## **1. Overview**

This guide provides a comprehensive approach to implementing SurveyJS in the Jambo SupaMoto codebase, based on proven patterns from the impacts-x-web project.

### **1.1 Why SurveyJS?**

**Benefits:**

- ✅ **Dynamic Forms**: Define forms via JSON configuration
- ✅ **Rich Question Types**: Text, dropdown, radio, checkbox, file upload, etc.
- ✅ **Conditional Logic**: Show/hide questions based on answers
- ✅ **Validation**: Built-in and custom validation rules
- ✅ **Theming**: Fully customizable appearance
- ✅ **Multi-page Support**: Wizard-style forms with navigation
- ✅ **Calculated Values**: Dynamic computed fields
- ✅ **Read-only Mode**: Display submitted forms

**vs. Native HTML Forms:**

- More flexible and maintainable
- Backend-driven form configuration
- Advanced features out of the box
- Better user experience

---

## **2. Package Installation**

### **2.1 Install Dependencies**

```bash
yarn add survey-core survey-react-ui
```

### **2.2 Package Versions**

Based on impacts-x-web (proven stable):

```json
{
  "survey-core": "^2.2.5",
  "survey-react-ui": "^2.2.5"
}
```

**Note**: These are the core packages. The `@ixo/surveys` package used in impacts-x-web is just a wrapper that re-exports these.

---

## **3. Project Structure**

### **3.1 New Files to Create**

```
jambo-supamoto/
├── constants/
│   └── surveyConfig.ts          # Default survey configuration
├── hooks/
│   ├── useSurveyModel.ts        # Survey model creation hook
│   └── useSurveyTheme.ts        # Survey theming hook
├── lib/
│   └── survey/
│       └── index.ts             # Survey exports (optional wrapper)
├── types/
│   └── survey.ts                # Survey type definitions
└── steps/
    ├── CustomerFormEntry.tsx    # Survey-based form entry
    ├── CustomerFormReview.tsx   # Review step (read-only survey)
    └── CustomerClaimResult.tsx  # Result step
```

---

## **4. Implementation Steps**

### **Step 1: Create Survey Configuration**

**File**: `constants/surveyConfig.ts`

```typescript
export const surveyDefaultConfig = {
  showNavigationButtons: true,
  complete: false,
  focusFirstQuestionAutomatic: true,
  pageNextText: 'Continue',
  pagePrevText: 'Back',
  showCompletedPage: false,
  checkErrorsMode: 'onValueChanged',
  showProgressBar: 'top',
  progressBarType: 'buttons',
};

export default surveyDefaultConfig;
```

**Configuration Explained:**

- `showNavigationButtons`: Show Next/Previous buttons
- `complete`: Don't auto-complete (we handle manually)
- `focusFirstQuestionAutomatic`: Auto-focus first field
- `pageNextText/pagePrevText`: Button labels
- `showCompletedPage`: Hide default completion page
- `checkErrorsMode`: Validate on value change (real-time)
- `showProgressBar`: Show progress at top
- `progressBarType`: Use buttons style

---

### **Step 2: Create Survey Theme Hook**

**File**: `hooks/useSurveyTheme.ts`

```typescript
export default function useSurveyTheme() {
  return {
    cssVariables: {
      // Background colors
      '--sjs-general-backcolor': 'var(--bg-color)',
      '--sjs-general-backcolor-dark': 'var(--bg-color)',
      '--sjs-general-backcolor-dim-light': 'var(--light-grey-color)',

      // Primary colors (buttons, active states)
      '--sjs-primary-backcolor': 'var(--primary-color)',
      '--sjs-primary-backcolor-dark': 'var(--secondary-color)',
      '--sjs-primary-forecolor': 'var(--main-font-color-inverted)',

      // Text colors
      '--sjs-general-forecolor': 'var(--main-font-color)',
      '--sjs-general-forecolor-light': 'var(--lighter-font-color)',

      // Font
      '--sjs-font-family': 'Roboto, sans-serif',
      '--sjs-font-size': 'var(--main-font-size)',

      // Border radius
      '--sjs-corner-radius': 'var(--button-border-radius)',
      '--sjs-editorpanel-cornerRadius': 'var(--card-border-radius)',
      '--sjs-questionpanel-cornerRadius': '12px',

      // Error colors
      '--sjs-special-red': 'var(--error-color)',
      '--sjs-special-red-forecolor': 'var(--main-font-color-inverted)',

      // Success colors
      '--sjs-special-green': 'var(--success-color)',
      '--sjs-special-green-forecolor': 'var(--main-font-color-inverted)',

      // Shadows
      '--sjs-shadow-small': '0px 2px 4px rgba(0, 0, 0, 0.1)',
      '--sjs-shadow-medium': '0px 4px 8px rgba(0, 0, 0, 0.1)',
      '--sjs-shadow-large': '0px 8px 16px rgba(0, 0, 0, 0.1)',
    },
    themeName: 'jambo-theme',
    colorPalette: 'light', // or "dark" based on theme
    showQuestionNumbers: 'off',
    isPanelless: false,
  };
}
```

**Theme Integration:**

- Uses CSS variables from `styles/variables.scss`
- Matches existing Jambo design system
- Supports light/dark mode
- Consistent with app styling

---

### **Step 3: Create Survey Model Hook**

**File**: `hooks/useSurveyModel.ts`

```typescript
import { useEffect, useState } from 'react';
import { Model } from 'survey-core';
import surveyDefaultConfig from '@constants/surveyConfig';
import useSurveyTheme from './useSurveyTheme';

type SurveyData = {
  pages?: any[];
  elements?: any[];
  calculatedValues?: any[];
  triggers?: any[];
  title?: string;
};

type UseSurveyModelOptions = {
  surveyData: SurveyData;
  onComplete?: (sender: Model, options: any) => void;
  initialData?: Record<string, any>;
  mode?: 'edit' | 'display';
  completeText?: string;
};

export default function useSurveyModel({
  surveyData,
  onComplete,
  initialData,
  mode = 'edit',
  completeText = 'Submit',
}: UseSurveyModelOptions) {
  const theme = useSurveyTheme();
  const [model, setModel] = useState<Model | null>(null);

  useEffect(() => {
    if (!surveyData) return;

    // Create survey model
    const surveyModel = new Model({
      pages: surveyData.pages,
      elements: surveyData.elements,
      calculatedValues: surveyData.calculatedValues,
      triggers: surveyData.triggers,
      title: surveyData.title,
      completeText,
      ...surveyDefaultConfig,
    });

    // Apply theme
    surveyModel.applyTheme(theme);

    // Set mode (edit or display)
    if (mode === 'display') {
      surveyModel.mode = 'display';
    }

    // Set initial data
    if (initialData) {
      surveyModel.data = initialData;
    }

    // Add completion handler
    if (onComplete) {
      surveyModel.onCompleting.add(onComplete);
    }

    setModel(surveyModel);

    // Cleanup
    return () => {
      if (onComplete) {
        surveyModel.onCompleting.remove(onComplete);
      }
    };
  }, [surveyData, onComplete, initialData, mode, completeText, theme]);

  return model;
}
```

**Hook Features:**

- Creates and configures survey model
- Applies theme automatically
- Handles initial data
- Supports edit and display modes
- Manages event listeners
- Proper cleanup on unmount

---

### **Step 4: Create Type Definitions**

**File**: `types/survey.ts`

````typescript
export interface ISurveyPage {
  name?: string;
  title?: string;
  elements: ISurveyElement[];
}

export interface ISurveyElement {
  type: string;
  name: string;
  title?: string;
  isRequired?: boolean;
  choices?: string[] | { value: string; text: string }[];
  inputType?: string;
  placeholder?: string;
  description?: string;
  validators?: any[];
  visibleIf?: string;
  enableIf?: string;
  defaultValue?: any;
}

export interface ISurveyData {
  pages?: ISurveyPage[];
  elements?: ISurveyElement[];
  calculatedValues?: any[];
  triggers?: any[];
  title?: string;
}

export interface ISurveyTheme {
  cssVariables: Record<string, string>;
  themeName: string;
  colorPalette: 'light' | 'dark';
  showQuestionNumbers: 'off' | 'on' | 'onPage';
  isPanelless: boolean;
}


### **Step 7: Implement Review Component (Read-Only)**

**File**: `steps/CustomerFormReview.tsx`

```typescript
import { FC, useState } from 'react';
import { Survey } from 'survey-react-ui';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import useSurveyModel from '@hooks/useSurveyModel';

type CustomerFormReviewProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_review>) => void;
  onBack?: () => void;
  formData: Record<string, any>;
  header?: string;
};

const CustomerFormReview: FC<CustomerFormReviewProps> = ({
  onSuccess,
  onBack,
  formData,
  header
}) => {
  const [submitting, setSubmitting] = useState(false);

  // Same survey structure as entry step
  const surveyData = {
    pages: [{
      name: "customerDetails",
      title: "Review Customer Information",
      elements: [
        { type: "text", name: "customerId", title: "Customer ID" },
        { type: "text", name: "fullName", title: "Full Name" },
        { type: "text", name: "phoneNumber", title: "Phone Number" },
        { type: "text", name: "email", title: "Email Address" },
        { type: "comment", name: "address", title: "Address" },
        { type: "text", name: "nationalId", title: "National ID" },
        { type: "dropdown", name: "country", title: "Country",
          choices: [{ value: "ZM", text: "Zambia" }, { value: "MW", text: "Malawi" }]
        },
        { type: "comment", name: "notes", title: "Additional Notes" }
      ]
    }]
  };

  // Create read-only survey model
  const model = useSurveyModel({
    surveyData,
    initialData: formData,
    mode: 'display',  // Read-only mode
  });

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const response = await fetch('https://supamoto.claims.bot.testmx.ixo.earth/action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getMatrixAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit-existing-customer-claim',
          flags: formData,
        }),
      });

      const result = await response.json();

      onSuccess({
        confirmed: true,
        apiResponse: result,
        success: response.ok,
      });
    } catch (error) {
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

  if (!model) return null;

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={styles.stepTitle}>Review Your Information</div>
        <p className={styles.reviewNote}>
          Please review the details below. Click "Back" to make changes or "Submit" to continue.
        </p>
        <Survey model={model} />
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
````

**Key Features:**

- Uses `mode: 'display'` for read-only
- Same survey structure as entry step
- Pre-filled with form data
- Custom submit button (not survey's complete button)
- Loading state during submission

---

### **Step 8: Add Survey Styles**

**File**: `styles/survey.scss` (new file)

```scss
// Import SurveyJS default styles
@import 'survey-core/defaultV2.min.css';

// Custom overrides
.sv-root-modern {
  // Match app container
  max-width: var(--max-width);
  margin: 0 auto;

  // Question spacing
  .sv-question {
    margin-bottom: 20px;
  }

  // Input fields
  .sv-text,
  .sv-comment {
    font-family: var(--font-name);
    font-size: var(--main-font-size);
  }

  // Buttons
  .sv-btn {
    border-radius: var(--button-border-radius);
    font-weight: 500;
    padding: 12px 24px;
  }

  // Error messages
  .sv-question__erbox {
    color: var(--error-color);
    font-size: 14px;
  }

  // Progress bar
  .sv-progress {
    background-color: var(--light-grey-color);
  }

  .sv-progress__bar {
    background-color: var(--primary-color);
  }
}
```

Import in `pages/_app.tsx`:

```typescript
import 'survey-core/defaultV2.min.css';
import '@styles/survey.scss';
```

---

## **5. Survey JSON Structure Examples**

### **5.1 Simple Single-Page Form**

```json
{
  "elements": [
    {
      "type": "text",
      "name": "customerId",
      "title": "Customer ID",
      "isRequired": true
    },
    {
      "type": "text",
      "name": "fullName",
      "title": "Full Name",
      "isRequired": true
    }
  ]
}
```

### **5.2 Multi-Page Form**

```json
{
  "pages": [
    {
      "name": "page1",
      "title": "Personal Information",
      "elements": [
        { "type": "text", "name": "fullName", "title": "Full Name", "isRequired": true },
        { "type": "text", "name": "email", "title": "Email", "inputType": "email" }
      ]
    },
    {
      "name": "page2",
      "title": "Address Details",
      "elements": [
        { "type": "text", "name": "address", "title": "Street Address" },
        { "type": "dropdown", "name": "country", "title": "Country", "choices": ["ZM", "MW"] }
      ]
    }
  ]
}
```

### **5.3 Conditional Logic**

```json
{
  "elements": [
    {
      "type": "dropdown",
      "name": "country",
      "title": "Country",
      "choices": ["ZM", "MW"]
    },
    {
      "type": "text",
      "name": "zambiaId",
      "title": "Zambian National ID",
      "visibleIf": "{country} = 'ZM'"
    },
    {
      "type": "text",
      "name": "malawiId",
      "title": "Malawian National ID",
      "visibleIf": "{country} = 'MW'"
    }
  ]
}
```

### **5.4 Validation Examples**

```json
{
  "elements": [
    {
      "type": "text",
      "name": "email",
      "title": "Email",
      "validators": [{ "type": "email", "text": "Please enter a valid email" }]
    },
    {
      "type": "text",
      "name": "phone",
      "title": "Phone Number",
      "validators": [
        {
          "type": "regex",
          "regex": "^\\+260[0-9]{9}$",
          "text": "Phone must be in format +260XXXXXXXXX"
        }
      ]
    },
    {
      "type": "text",
      "name": "age",
      "title": "Age",
      "inputType": "number",
      "validators": [
        {
          "type": "numeric",
          "minValue": 18,
          "maxValue": 100,
          "text": "Age must be between 18 and 100"
        }
      ]
    }
  ]
}
```

---

## **6. Advanced Features**

### **6.1 Calculated Values**

Automatically compute values based on other answers:

```json
{
  "calculatedValues": [
    {
      "name": "fullAddress",
      "expression": "{street} + ', ' + {city} + ', ' + {country}"
    },
    {
      "name": "totalAmount",
      "expression": "{quantity} * {pricePerUnit}"
    }
  ],
  "elements": [
    { "type": "text", "name": "street", "title": "Street" },
    { "type": "text", "name": "city", "title": "City" },
    { "type": "dropdown", "name": "country", "title": "Country", "choices": ["ZM", "MW"] },
    { "type": "expression", "name": "fullAddress", "title": "Full Address", "expression": "{fullAddress}" }
  ]
}
```

### **6.2 Triggers**

Execute actions based on conditions:

```json
{
  "triggers": [
    {
      "type": "setvalue",
      "expression": "{country} = 'ZM'",
      "setToName": "currency",
      "setValue": "ZMW"
    },
    {
      "type": "setvalue",
      "expression": "{country} = 'MW'",
      "setToName": "currency",
      "setValue": "MWK"
    }
  ]
}
```

### **6.3 Custom Question Types**

From impacts-x-web example (MapGridSelector):

```typescript
// lib/survey/CustomQuestions.ts
import { Serializer, Question, ElementFactory } from 'survey-core';

export class QuestionCustomerLookup extends Question {
  getType() {
    return 'customerlookup';
  }

  // Custom rendering logic
}

// Register custom question
ElementFactory.Instance.registerElement('customerlookup', (name) => {
  return new QuestionCustomerLookup(name);
});

Serializer.addClass(
  'customerlookup',
  [],
  function () {
    return new QuestionCustomerLookup('');
  },
  'question',
);
```

---

## **7. Integration with Jambo Actions**

### **7.1 Update config.json**

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

### **7.2 Update pages/[actionId].tsx**

```typescript
import CustomerFormEntry from '@steps/CustomerFormEntry';
import CustomerFormReview from '@steps/CustomerFormReview';
import CustomerClaimResult from '@steps/CustomerClaimResult';

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
          formData={
            action?.steps.find(s => s.id === STEPS.customer_form_entry)
              ?.data?.surveyData || {}
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
  }
};
```

---

## **8. Backend Integration**

### **8.1 Loading Survey from Backend**

Instead of hardcoding survey structure, load from API:

```typescript
// hooks/useSurveyData.ts
import { useEffect, useState } from 'react';

export default function useSurveyData(surveyId: string) {
  const [surveyData, setSurveyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();
        setSurveyData(data);
      } catch (error) {
        console.error('Failed to load survey:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [surveyId]);

  return { surveyData, loading };
}
```

Usage:

```typescript
const CustomerFormEntry = ({ onSuccess, onBack }) => {
  const { surveyData, loading } = useSurveyData('customer-form');

  if (loading) return <Loader />;

  const model = useSurveyModel({
    surveyData,
    onComplete: handleComplete
  });

  return <Survey model={model} />;
};
```

---

## **9. Testing**

### **9.1 Test Survey Model Creation**

```typescript
import { Model } from 'survey-core';

describe('useSurveyModel', () => {
  it('creates model with correct configuration', () => {
    const surveyData = {
      elements: [{ type: 'text', name: 'test', title: 'Test' }],
    };

    const model = new Model(surveyData);

    expect(model).toBeDefined();
    expect(model.getAllQuestions()).toHaveLength(1);
  });

  it('applies initial data', () => {
    const model = new Model({
      elements: [{ type: 'text', name: 'name' }],
    });

    model.data = { name: 'John' };

    expect(model.data.name).toBe('John');
  });
});
```

### **9.2 Test Validation**

```typescript
it('validates required fields', () => {
  const model = new Model({
    elements: [{ type: 'text', name: 'email', isRequired: true }],
  });

  const isValid = model.validate();

  expect(isValid).toBe(false);
  expect(model.hasErrors()).toBe(true);
});
```

---

## **10. Migration Path**

### **10.1 Phase 1: Install & Setup**

- ✅ Install packages
- ✅ Create configuration files
- ✅ Create hooks
- ✅ Add styles

### **10.2 Phase 2: Implement One Action**

- ✅ Convert Action One to use SurveyJS
- ✅ Test thoroughly
- ✅ Gather feedback

### **10.3 Phase 3: Expand**

- ✅ Convert Action Two
- ✅ Add more complex features
- ✅ Optimize performance

---

## **11. Comparison: Native Forms vs SurveyJS**

### **Native HTML Forms (Current Approach)**

**Pros:**

- ✅ Simple and straightforward
- ✅ No additional dependencies
- ✅ Full control over markup
- ✅ Matches existing patterns

**Cons:**

- ❌ More code to write
- ❌ Manual validation logic
- ❌ Hard to make dynamic
- ❌ Difficult to maintain

### **SurveyJS (Recommended)**

**Pros:**

- ✅ JSON-driven configuration
- ✅ Built-in validation
- ✅ Conditional logic
- ✅ Multi-page support
- ✅ Backend-configurable
- ✅ Rich question types
- ✅ Professional appearance

**Cons:**

- ❌ Additional dependency (~200KB)
- ❌ Learning curve
- ❌ Less control over markup

---

## **12. Recommendation**

**Use SurveyJS if:**

- ✅ Forms need to be configurable from backend
- ✅ Complex validation rules required
- ✅ Conditional logic needed
- ✅ Multi-page forms
- ✅ Want professional UX out of the box

**Use Native Forms if:**

- ✅ Very simple forms (1-2 fields)
- ✅ Need complete control over markup
- ✅ Want to minimize dependencies
- ✅ Forms are static and won't change

**For Jambo SupaMoto Customer Form:**
**Recommendation: Use SurveyJS** ✅

**Reasons:**

1. Form structure may change based on backend requirements
2. Validation rules can be complex
3. May need conditional fields (e.g., country-specific)
4. Professional appearance matches app quality
5. Easier to maintain and extend
6. Proven pattern from impacts-x-web

---

## **13. Summary**

This guide provides everything needed to implement SurveyJS in Jambo SupaMoto:

✅ **Installation**: Simple yarn add command
✅ **Configuration**: Reusable config and theme
✅ **Hooks**: Clean, maintainable code
✅ **Components**: Drop-in replacements for native forms
✅ **Integration**: Works with existing Jambo architecture
✅ **Examples**: Real-world patterns from impacts-x-web
✅ **Testing**: Validation and quality assurance
✅ **Migration**: Step-by-step implementation path

The implementation is production-ready and follows best practices from the impacts-x-web codebase.

````

---

### **Step 5: Update Step Types**

**File**: `types/steps.ts`

Add new step types:

```typescript
export enum STEPS {
  // ... existing steps
  customer_form_entry = 'customer_form_entry',
  customer_form_review = 'customer_form_review',
  customer_claim_result = 'customer_claim_result',
}

// Step data interfaces
interface Customer_form_entry {
  surveyData?: Record<string, any>;  // Survey answers
}

interface Customer_form_review {
  confirmed?: boolean;
  apiResponse?: any;
  success?: boolean;
  error?: string;
}

interface Customer_claim_result {
  success?: boolean;
  message?: string;
  errorDetails?: string;
}
````

---

### **Step 6: Implement Form Entry Component**

**File**: `steps/CustomerFormEntry.tsx`

```typescript
import { FC } from 'react';
import { Survey } from 'survey-react-ui';
import { Model } from 'survey-core';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import useSurveyModel from '@hooks/useSurveyModel';

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
  // Define survey structure
  const surveyData = {
    pages: [{
      name: "customerDetails",
      title: "Customer Information",
      elements: [
        {
          type: "text",
          name: "customerId",
          title: "Customer ID",
          isRequired: true,
          placeholder: "Enter customer ID"
        },
        {
          type: "text",
          name: "fullName",
          title: "Full Name",
          isRequired: true,
          placeholder: "Enter full name"
        },
        {
          type: "text",
          name: "phoneNumber",
          title: "Phone Number",
          isRequired: true,
          inputType: "tel",
          placeholder: "+260..."
        },
        {
          type: "text",
          name: "email",
          title: "Email Address",
          inputType: "email",
          placeholder: "email@example.com",
          validators: [{
            type: "email"
          }]
        },
        {
          type: "comment",
          name: "address",
          title: "Address",
          placeholder: "Enter address",
          rows: 3
        },
        {
          type: "text",
          name: "nationalId",
          title: "National ID",
          placeholder: "Enter national ID"
        },
        {
          type: "dropdown",
          name: "country",
          title: "Country",
          isRequired: true,
          choices: [
            { value: "ZM", text: "Zambia" },
            { value: "MW", text: "Malawi" }
          ],
          defaultValue: "ZM"
        },
        {
          type: "comment",
          name: "notes",
          title: "Additional Notes",
          placeholder: "Any additional information",
          rows: 4
        }
      ]
    }]
  };

  // Handle survey completion
  const handleComplete = (sender: Model, options: any) => {
    options.allowComplete = false;  // Prevent default completion
    onSuccess({ surveyData: sender.data });
  };

  // Create survey model
  const model = useSurveyModel({
    surveyData,
    onComplete: handleComplete,
    initialData: data?.surveyData,
    completeText: "Continue"
  });

  if (!model) return null;

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <Survey model={model} />
      </main>

      <Footer
        onBack={onBack}
        onBackUrl={onBack ? undefined : ''}
      />
    </>
  );
};

export default CustomerFormEntry;
```

**Key Features:**

- Survey defined as JSON structure
- Built-in validation (required fields, email format)
- Custom completion handler
- Pre-fills data when navigating back
- Uses existing Header/Footer components

---
