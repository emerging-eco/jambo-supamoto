import { FC } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import IconText from '@components/IconText/IconText';
import { StepDataType, STEPS } from 'types/steps';
import Success from '@icons/success.svg';
import SadFace from '@icons/sad_face.svg';

type CustomerClaimResultProps = {
  onSuccess: (data: StepDataType<STEPS.customer_claim_result>) => void;
  data?: StepDataType<STEPS.customer_claim_result>;
  header?: string;
};

const CustomerClaimResult: FC<CustomerClaimResultProps> = ({ data, header }) => {
  const isSuccess = data?.success === true;
  const message = data?.apiResponse?.message || data?.error || 'Unknown error occurred';

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {isSuccess ? (
          <IconText title='Customer claim submitted successfully!' Img={Success} imgSize={50}>
            <p className={styles.label} style={{ textAlign: 'center', marginTop: '16px' }}>
              {message}
            </p>
          </IconText>
        ) : (
          <IconText title='Submission failed' Img={SadFace} imgSize={50}>
            <p className={styles.label} style={{ textAlign: 'center', marginTop: '16px', color: 'var(--error-color)' }}>
              {message}
            </p>
            {data?.apiResponse?.error && (
              <p className={styles.label} style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px' }}>
                {data.apiResponse.error}
              </p>
            )}
          </IconText>
        )}
      </main>

      <Footer showAccountButton={true} showActionsButton={true} />
    </>
  );
};

export default CustomerClaimResult;

