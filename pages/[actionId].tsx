import { useState, useEffect } from 'react';
import type { GetStaticPaths, NextPage, GetStaticPropsResult, GetStaticPropsContext } from 'next';

import config from '@constants/config.json';
import { StepDataType, STEP, STEPS } from 'types/steps';
import EmptySteps from '@steps/EmptySteps';
import { backRoute, replaceRoute } from '@utils/router';
import { ACTION } from 'types/actions';
import Head from '@components/Head/Head';
import useWalletContext from '@hooks/useWalletContext';
import ClaimForm from '@steps/ClaimForm';

type ActionPageProps = {
  actionData: ACTION;
};

const ActionExecution: NextPage<ActionPageProps> = ({ actionData }) => {
  const [count, setCount] = useState(0);
  const [action, setAction] = useState<ACTION | null>(null);
  const { wallet } = useWalletContext();
  const signedIn = wallet.user?.address;

  useEffect(() => {
    setAction(actionData);
  }, [actionData]);

  function handleOnNext<T>(data: StepDataType<T>) {
    setAction((a) =>
      !a ? a : { ...a, steps: a.steps.map((step, index) => (index === count ? { ...step, data } : step)) },
    );
    if (count + 1 === action?.steps.length) return replaceRoute('/');
    setCount((c) => c + 1);
  }

  const handleBack = () => {
    if (count === 0) {
      const newActionData = JSON.parse(JSON.stringify(action));
      if (newActionData.steps.find((step: STEP) => step.id === STEPS.get_receiver_address)?.data?.data?.length > 1) {
        newActionData.steps.forEach((step: STEP, index: number) => {
          if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address) {
            newActionData.steps[index].data.data.pop();
            newActionData.steps[index].data.currentIndex = newActionData.steps[index].data.data.length - 1;
          }
        });
        setAction(newActionData);
        return setCount(action?.steps.findIndex((step) => step.id === STEPS.bank_MsgMultiSend) as number);
      } else {
        return backRoute();
      }
    }
    setCount((c) => c - 1);
  };

  const getStepComponent = (step: STEP) => {
    console.log('step', step);
    switch (step?.id) {
      case STEPS.claim_form:
        return (
          <ClaimForm
            onSuccess={handleOnNext<STEPS.claim_form>}
            data={step.data as StepDataType<STEPS.claim_form>}
            header={action?.name}
          />
        );
      // case STEPS.claim_form_bulk:
      //   return (
      //     <ClaimFormBulk
      //       onSuccess={handleOnNext<STEPS.claim_form_bulk>}
      //       data={step.data as StepDataType<STEPS.claim_form_bulk>}
      //       header={action?.name}
      //     />
      //   );
      default:
        return <EmptySteps loading={true} />;
    }
  };

  return (
    <>
      <Head title={actionData.name} description={actionData.description} />

      {!signedIn ? (
        <EmptySteps signedIn={false} />
      ) : (action?.steps?.length ?? 0) < 1 ? (
        <EmptySteps />
      ) : (
        getStepComponent(action!.steps[count])
      )}
    </>
  );
};

export default ActionExecution;

type PathsParams = {
  actionId: string;
};

export const getStaticPaths: GetStaticPaths<PathsParams> = async () => {
  const paths = config.actions.map((a) => ({ params: { actionId: a.id } }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async ({
  params,
}: GetStaticPropsContext<PathsParams>): Promise<GetStaticPropsResult<ActionPageProps>> => {
  const actionData = config.actions.find((a) => params!.actionId == a.id);

  return {
    props: {
      actionData: actionData as ACTION,
    },
  };
};
