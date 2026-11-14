import { Navigate, Route, Routes } from 'react-router-dom'
import VrvOverviewPage from './VrvOverviewPage'
import { VrvContractsPage } from './VrvContractsPage'
import { VrvCashbookPage, VrvMaterialsPage, VrvPaymentsPage, VrvSalaryPage } from './VrvLedgerPages'

export function VrvModule() {
  return (
    <Routes>
      <Route index element={<VrvOverviewPage />} />
      <Route path="contracts" element={<VrvContractsPage />} />
      <Route path="payments" element={<VrvPaymentsPage />} />
      <Route path="salary" element={<VrvSalaryPage />} />
      <Route path="materials" element={<VrvMaterialsPage />} />
      <Route path="cashbook" element={<VrvCashbookPage />} />
      <Route path="*" element={<Navigate to="/vrv" replace />} />
    </Routes>
  )
}
