import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import { finalizeBill } from '../billing.resource';
import { type MappedBill } from '../types';
import styles from './delete-line-item-confirmation.scss';

interface FinalizeBillModalParams {
  closeModal: () => void;
  bill: MappedBill;
  onMutate?: () => void;
}

const FinalizeBillModal: React.FC<FinalizeBillModalParams> = ({ closeModal, bill, onMutate }) => {
  const { t } = useTranslation();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalize = async () => {
    if (!bill?.uuid) {
      return;
    }

    setIsFinalizing(true);

    try {
      await finalizeBill(bill.uuid);

      showSnackbar({
        title: t('billFinalized', 'Bill finalized'),
        subtitle: t('billFinalizedSuccess', 'Bill has been finalized successfully'),
        kind: 'success',
      });

      onMutate?.();
      closeModal();
    } catch (err: any) {
      const message =
        err?.responseBody?.error?.message ||
        err?.message ||
        t('finalizeFailedTryAgain', 'Unable to finalize bill. Please try again.');

      // eslint-disable-next-line no-console
      console.error('[FinalizeBillModal] Bill finalization failed', err);

      showSnackbar({
        title: t('billFinalizeFailed', 'Failed to finalize bill'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('finalizeBill', 'Finalize bill')} />

      <ModalBody className={styles.modalBody}>
        <p>
          {t(
            'finalizeBillConfirmation',
            'Are you sure you want to finalize this bill? Once finalized, no further edits to the bill will be allowed.',
          )}
        </p>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isFinalizing}>
          {getCoreTranslation('cancel')}
        </Button>

        <Button kind="primary" onClick={handleFinalize} disabled={isFinalizing}>
          {isFinalizing ? (
            <InlineLoading className={styles.spinner} description={t('finalizing', 'Finalizing') + '...'} />
          ) : (
            t('finalize', 'Finalize')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default FinalizeBillModal;
