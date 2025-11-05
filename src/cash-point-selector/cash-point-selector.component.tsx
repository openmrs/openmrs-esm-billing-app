import React, { useState, useEffect, useContext } from 'react';
import { InlineLoading, Tag, Dropdown } from '@carbon/react';
import { Time, Location } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { getCoreTranslation, useSession } from '@openmrs/esm-framework';
import { useCashPoint } from '../billing-form/billing-form.resource';
import SelectedCashPointContext from '../hooks/selectedCashPointContext';
import styles from './cash-point-selector.scss';

dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function CashPointSelector() {
  const { t } = useTranslation();
  const session = useSession();
  const { cashPoints, isLoading, error } = useCashPoint();
  const { selectedCashPoint, setSelectedCashPoint } = useContext(SelectedCashPointContext);
  const [clockInTime] = useState(dayjs());
  const [currentTime, setCurrentTime] = useState(dayjs());

  const userName = session?.user?.person?.display;
  const location = session?.sessionLocation?.display;

  useEffect(() => {
    if (cashPoints && cashPoints.length > 0 && !selectedCashPoint) {
      setSelectedCashPoint(cashPoints[0]);
    }
  }, [cashPoints, selectedCashPoint, setSelectedCashPoint]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getDuration = () => {
    const diff = currentTime.diff(clockInTime);
    const dur = dayjs.duration(diff);
    const hours = Math.floor(dur.asHours());
    return `+${hours}hs`;
  };

  const handleCashPointChange = ({ selectedItem }) => {
    setSelectedCashPoint(selectedItem);
  };

  if (isLoading) {
    return (
      <section className={styles.container}>
        <InlineLoading
          status="active"
          iconDescription={getCoreTranslation('loading')}
          description={t('loadingCashPoints', 'Loading cash points') + '...'}
        />
      </section>
    );
  }

  if (error || !cashPoints || cashPoints.length === 0) {
    return null;
  }

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.clockInInfo}>
          <Time size={16} className={styles.clockIcon} />
          <span className={styles.clockInText}>
            {t('clockedInOn', 'Clocked in on')} {clockInTime.format('DD MMM YYYY, HH:mm A')}
          </span>
          <Tag type="blue" size="sm" className={styles.durationTag}>
            {getDuration()}
          </Tag>
        </div>
        <div className={styles.rightSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <div className={styles.locationInfo}>
              <Location size={16} className={styles.locationIcon} />
              <span className={styles.locationText}>{location}</span>
            </div>
          </div>
          <Dropdown
            id="cash-point-selector"
            items={cashPoints}
            itemToString={(item) => (item ? item.name : '')}
            selectedItem={selectedCashPoint}
            onChange={handleCashPointChange}
            label={t('selectCashPoint', 'Select cash point')}
            titleText=""
            size="md"
            className={styles.cashPointDropdown}
          />
        </div>
      </div>
    </section>
  );
}
