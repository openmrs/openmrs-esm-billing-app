import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BillingDashboard } from './billing-dashboard/billing-dashboard.component';
import Invoice from './invoice/invoice.component';

const RootComponent: React.FC = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/billing';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<BillingDashboard />} />
        <Route path="/patient/:patientUuid/:billUuid" element={<Invoice />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RootComponent;
