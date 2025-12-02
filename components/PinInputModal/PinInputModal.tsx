import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Button, { BUTTON_BG_COLOR, BUTTON_BORDER_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import styles from './PinInputModal.module.scss';

type PinInputModalProps = {
  onClose: () => void;
  onSubmit: (pin: string) => void;
  error?: string;
};

const PinInputModal = ({ onClose, onSubmit, error }: PinInputModalProps) => {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are entered
    if (newPin.every((digit) => digit !== '') && index === 5) {
      onSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace/delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (pin[index]) {
        // Clear current field
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        // Move to previous field and clear it
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length === 6) {
      setPin(digits);
      // Focus last input
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = () => {
    const pinString = pin.join('');
    if (pinString.length === 6) {
      onSubmit(pinString);
    }
  };

  const allDigitsEntered = pin.every((digit) => digit !== '');

  return (
    <div className={styles.container}>
      <p className={styles.controlLabel}>Enter your 6-digit PIN</p>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.pinInputs}>
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type='text'
            inputMode='numeric'
            maxLength={1}
            value={pin[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={styles.pinInput}
            autoComplete='off'
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Button
          label='Cancel'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          borderColor={BUTTON_BORDER_COLOR.lightGrey}
          onClick={onClose}
        />
        <Button
          label='Submit'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={handleSubmit}
          disabled={!allDigitsEntered}
        />
      </div>
    </div>
  );
};

export default PinInputModal;
