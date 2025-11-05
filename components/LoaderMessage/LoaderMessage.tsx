import React, { FC } from 'react';

import utilsStyles from '@styles/utils.module.scss';
import Loader from '@components/Loader/Loader';

type LoaderMessageProps = {
  message?: string;
};

const LoaderMessage: FC<LoaderMessageProps> = ({ message }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'auto',
        minHeight: 140,
        width: '100%',
      }}
    >
      <Loader size={30} />
      <div className={utilsStyles.spacer3} />
      {message}
    </div>
  );
};

export default LoaderMessage;
