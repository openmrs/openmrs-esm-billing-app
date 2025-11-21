import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation } from '@openmrs/esm-framework';
import { apiBasePath } from '../../constants';
import styles from './print-receipt.scss';

interface PrintReceiptProps {
  billUuid: string;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({ billUuid }) => {
  const { t } = useTranslation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const baseUrl = new URL(window.location.href);

  const handlePrintReceiptClick = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      const pdfUrl = `${baseUrl.origin}/openmrs${apiBasePath}receipt?billUuid=${billUuid}`;
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `receipt_${billUuid}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsRedirecting(false);
    }, 1000);
  };

  return (
    <Button
      kind="secondary"
      className={styles.button}
      renderIcon={(props) => <Printer size={24} {...props} />}
      onClick={handlePrintReceiptClick}
      disabled={isRedirecting}>
      {isRedirecting ? getCoreTranslation('loading') : t('printReceipt', 'Print receipt')}
    </Button>
  );
};

export default PrintReceipt;
