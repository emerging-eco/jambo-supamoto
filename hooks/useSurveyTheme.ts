export default function useSurveyTheme() {
  return {
    cssVariables: {
      // Background colors
      '--sjs-general-backcolor': 'var(--bg-color)',
      '--sjs-general-backcolor-dark': 'var(--bg-color)',
      '--sjs-general-backcolor-dim-light': 'var(--light-grey-color)',
      '--sjs-general-backcolor-dim': 'transparent',
      '--sjs-general-backcolor-dim-dark': 'var(--light-grey-color)',

      // Primary colors (buttons, active states)
      '--sjs-primary-backcolor': 'var(--primary-color)',
      '--sjs-primary-backcolor-dark': 'var(--secondary-color)',
      '--sjs-primary-backcolor-light': 'var(--tertiary-color)',
      '--sjs-primary-forecolor': 'var(--main-font-color-inverted)',
      '--sjs-primary-forecolor-light': 'rgba(255, 255, 255, 0.25)',

      // Text colors
      '--sjs-general-forecolor': 'var(--main-font-color)',
      '--sjs-general-forecolor-light': 'var(--lighter-font-color)',
      '--sjs-general-dim-forecolor': 'var(--main-font-color)',
      '--sjs-general-dim-forecolor-light': 'var(--lighter-font-color)',
      '--sjs-font-surveytitle-color': 'var(--main-font-color)',

      // Font
      '--sjs-font-family': 'Roboto, sans-serif',
      '--sjs-font-size': 'var(--main-font-size)',

      // Border radius
      '--sjs-corner-radius': 'var(--button-border-radius)',
      '--sjs-editorpanel-cornerRadius': 'var(--card-border-radius)',
      '--sjs-questionpanel-cornerRadius': '12px',

      // Error colors
      '--sjs-special-red': 'var(--error-color)',
      '--sjs-special-red-light': 'rgba(179, 0, 0, 0.1)',
      '--sjs-special-red-forecolor': 'var(--main-font-color-inverted)',

      // Success colors
      '--sjs-special-green': 'var(--success-color)',
      '--sjs-special-green-light': 'rgba(51, 96, 33, 0.1)',
      '--sjs-special-green-forecolor': 'var(--main-font-color-inverted)',

      // Warning colors
      '--sjs-special-yellow': 'var(--warning-color)',
      '--sjs-special-yellow-light': 'rgba(251, 169, 40, 0.1)',
      '--sjs-special-yellow-forecolor': 'var(--main-font-color-inverted)',

      // Shadows
      '--sjs-shadow-small': '0px 2px 4px rgba(0, 0, 0, 0.1)',
      '--sjs-shadow-medium': '0px 4px 8px rgba(0, 0, 0, 0.1)',
      '--sjs-shadow-large': '0px 8px 16px rgba(0, 0, 0, 0.1)',
      '--sjs-shadow-inner': '0px 0px 0px 0px rgba(0, 0, 0, 0.15)',
      '--sjs-shadow-inner-reset': '0px 0px 0px 0px rgba(0, 0, 0, 0.15)',

      // Borders
      '--sjs-border-light': 'rgba(0, 0, 0, 0.09)',
      '--sjs-border-default': 'rgba(0, 0, 0, 0.16)',
      '--sjs-border-inside': 'rgba(0, 0, 0, 0.16)',

      // Base unit
      '--sjs-base-unit': '8px',
    },
    themeName: 'jambo-theme',
    colorPalette: 'light' as const,
    showQuestionNumbers: 'off' as const,
    isPanelless: false,
  };
}

