import { useContext, useEffect, useState } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from './Selector.module.scss';
import ButtonRound, { BUTTON_ROUND_COLOR, BUTTON_ROUND_SIZE } from '@components/ButtonRound/ButtonRound';
import Card, { CARD_BG_COLOR, CARD_BORDER_COLOR, CARD_SIZE } from '@components/Card/Card';
import ImageWithFallback from '@components/ImageFallback/ImageFallback';
import BottomSheet from '@components/BottomSheet/BottomSheet';
import Loader from '@components/Loader/Loader';
import useModalState from '@hooks/useModalState';
import { WalletContext } from '@contexts/wallet';
import { ChainContext } from '@contexts/chain';
import Correct from '@icons/correct.svg';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';

type SelectorProps = {
  selected: string;
  onSelect: (selected: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
};

const Selector = ({ selected, onSelect, options }: SelectorProps) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((option) => option.value === selected);

  function handleSelect(value: string) {
    setVisible(false);
    onSelect(value);
  }

  return (
    <>
      <Button
        label={selectedOption?.label ?? selected}
        size={BUTTON_SIZE.medium}
        bgColor={BUTTON_BG_COLOR.primary}
        color={BUTTON_COLOR.white}
        onClick={() => setVisible(true)}
      />
      {visible && (
        <BottomSheet
          className={utilsStyles.columnAlignCenter}
          dismissable={!visible}
          onClose={() => setVisible(false)}
          title='Select a Chain'
        >
          {options.map((option) => {
            console.log('option', option, selected === option.value);
            return (
              <Card
                className={cls(styles.wrapper)}
                key={option.value}
                onClick={() => handleSelect(option.value)}
                size={CARD_SIZE.small}
                bgColor={option.value === selected ? CARD_BG_COLOR.background : CARD_BG_COLOR.lightGrey}
                borderColor={option.value === selected ? CARD_BORDER_COLOR.primary : CARD_BORDER_COLOR.lightGrey}
              >
                <div className={utilsStyles.rowAlignCenter}>
                  <p className={styles.label}>{option.label}</p>
                </div>
              </Card>
            );
          })}
        </BottomSheet>
      )}
    </>
  );
};

export default Selector;
