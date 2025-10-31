import ButtonRound, { BUTTON_ROUND_COLOR, BUTTON_ROUND_SIZE } from '@components/ButtonRound/ButtonRound';
import ImageWithFallback from '@components/ImageFallback/ImageFallback';
import { chainSymbolImageUrl } from '@constants/chains';

type ChainSelectorProps = {};

const ChainSelector = ({}: ChainSelectorProps) => {
  return (
    <>
      <ButtonRound size={BUTTON_ROUND_SIZE.xsmall} color={BUTTON_ROUND_COLOR.lightGrey}>
        <ImageWithFallback
          fallbackSrc={'/images/chain-logos/fallback.png'}
          alt={'IXO'}
          src={chainSymbolImageUrl}
          height={42}
          width={42}
        />
      </ButtonRound>
    </>
  );
};

export default ChainSelector;
