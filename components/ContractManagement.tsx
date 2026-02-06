import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Contract, PaymentCycle, PaymentRecord } from '../types.ts';
import { useContracts, useTenants, useProperties } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, FormGroup, Card } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, MoneyIcon, CalendarDaysIcon, BellAlertIcon, DEFAULT_CONTRACT, DocumentTextIcon } from '../constants.tsx';

// Rent period interface
interface RentPeriod {
  periodNumber: number;
  startDate: Date;
  endDate: Date;
  amount: number;
  isPaid: boolean;
  paymentRecord?: PaymentRecord;
  matchedPaymentId?: string; // For back payments that match this period
}

// Calculate all rent periods for a contract
function calculateRentPeriods(contract: Contract): RentPeriod[] {
  if (!contract.startDate || !contract.endDate) {
    return [];
  }

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const periods: RentPeriod[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentDate = new Date(startDate);
  let periodNumber = 1;

  // Determine months to add based on payment cycle
  const getMonthsToAdd = (cycle: PaymentCycle): number => {
    switch (cycle) {
      case PaymentCycle.MONTHLY:
        return 1;
      case PaymentCycle.QUARTERLY:
        return 3;
      case PaymentCycle.SEMIANNUALLY:
        return 6;
      case PaymentCycle.ANNUALLY:
        return 12;
      default:
        return 1;
    }
  };

  const monthsToAdd = getMonthsToAdd(contract.paymentCycle);
  
  // Only process non-annual payment cycles
  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    return [];
  }

  // Get all confirmed payments
  const confirmedPayments = (contract.paymentRecords || []).filter(pr => pr.isConfirmed && pr.amount);
  const usedPayments = new Set<string>();

  while (currentDate < endDate) {
    const periodStart = new Date(currentDate);
    
    // Calculate period end date as the last day of the target month
    // For example: 2025-12-01 + 1 month should end at 2025-12-31, not 2026-01-01
    const periodEnd = new Date(currentDate);
    // Add months to get target month, then set day to 0 to get last day of previous month
    // This ensures we get the last day of the current period's month
    periodEnd.setMonth(periodEnd.getMonth() + monthsToAdd, 0); // Day 0 means the last day of the previous month
    
    // Adjust end date if it exceeds contract end date
    if (periodEnd > endDate) {
      periodEnd.setTime(endDate.getTime());
    }

    // Check if this period has been paid
    // First check for payment within the period
    let paymentRecord = findPaymentForPeriod(
      contract.paymentRecords || [],
      periodStart,
      periodEnd
    );

    // If no payment found within period and this is a past period, check for back payments
    if (!paymentRecord && today > periodEnd) {
      // Look for unmatched payments that can cover this period
      // This handles both single period payments and multi-period payments
      for (const payment of confirmedPayments) {
        if (usedPayments.has(payment.id)) continue;
        
        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        
        // If payment date is after period end, it could be a back payment
        if (paymentDate > periodEnd) {
          // Calculate how many periods this payment can cover
          const periodsCovered = Math.floor((payment.amount + 1) / contract.rentAmount); // +1 for rounding tolerance
          
          // Count how many periods before this one have been matched to this payment
          const periodsMatchedToThisPayment = periods.filter(p => 
        p.paymentRecord?.id === payment.id
          ).length;
          
          // Check if this payment still has remaining amount to cover this period
          if (periodsMatchedToThisPayment < periodsCovered) {
            // Calculate remaining amount after matching previous periods
            const remainingAmount = payment.amount - (periodsMatchedToThisPayment * contract.rentAmount);
            
            // Check if remaining amount is enough for this period (allow 1 NT$ difference)
            if (remainingAmount >= contract.rentAmount - 1) {
              paymentRecord = payment;
              // Don't mark as used yet - it might cover more periods
              break;
            }
          }
        }
      }
    }

    // Mark payment as fully used if it has been matched to all periods it can cover
    if (paymentRecord) {
      const periodsMatchedToThisPayment = periods.filter(p => 
        p.paymentRecord?.id === paymentRecord.id
      ).length + 1; // +1 for current period
      const periodsThisPaymentCanCover = Math.floor((paymentRecord.amount + 1) / contract.rentAmount);
      
      // If payment is fully used, mark it as used
      if (periodsMatchedToThisPayment >= periodsThisPaymentCanCover) {
        usedPayments.add(paymentRecord.id);
      }
    }

    periods.push({
      periodNumber,
      startDate: periodStart,
      endDate: periodEnd,
      amount: contract.rentAmount,
      isPaid: !!paymentRecord,
      paymentRecord: paymentRecord,
      matchedPaymentId: paymentRecord?.id
    });

    // Move to next period - add 1 day to periodEnd to start the next period
    currentDate = new Date(periodEnd);
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Safety check to prevent infinite loop
    if (currentDate.getTime() <= periodStart.getTime()) {
      console.warn('Period calculation error: currentDate did not advance', { periodStart, periodEnd, currentDate });
      break;
    }
    
    // Additional safety check: limit maximum periods
    if (periodNumber > 1000) {
      console.warn('Too many periods calculated, stopping to prevent infinite loop');
      break;
    }
    
    periodNumber++;
  }

  return periods;
}

// Find payment record that matches a rent period
function findPaymentForPeriod(
  paymentRecords: PaymentRecord[],
  periodStart: Date,
  periodEnd: Date
): PaymentRecord | undefined {
  return paymentRecords.find(record => {
    if (!record.paymentDate || !record.isConfirmed) {
      return false;
    }
    const paymentDate = new Date(record.paymentDate);
    return paymentDate >= periodStart && paymentDate <= periodEnd;
  });
}


// Auto-match back payments to unpaid periods
// This function tries to match a payment record to unpaid past periods
// Returns the periods that should be marked as paid if the amount matches
function autoMatchBackPayments(
  contract: Contract,
  paymentRecord: PaymentRecord
): RentPeriod[] {
  // Only process non-annual payment cycles
  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    return [];
  }

  if (!paymentRecord.isConfirmed || !paymentRecord.amount) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate all rent periods with current payment records
  const rentPeriods = calculateRentPeriods(contract);
  
  // Find unpaid past periods (periods that have ended but are unpaid)
  const unpaidPastPeriods = rentPeriods.filter(period => {
    const periodEnd = new Date(period.endDate);
    periodEnd.setHours(0, 0, 0, 0);
    return today > periodEnd && !period.isPaid;
  });

  if (unpaidPastPeriods.length === 0) {
    return [];
  }

  // Try to match payment amount to unpaid periods
  // Start from the oldest unpaid period and try to match as many as possible
  const matchedPeriods: RentPeriod[] = [];
  let remainingAmount = paymentRecord.amount;
  
  for (const period of unpaidPastPeriods) {
    if (remainingAmount >= period.amount - 1) { // Allow 1 NT$ difference
      matchedPeriods.push(period);
      remainingAmount -= period.amount;
    } else {
      break; // Can't match more periods
    }
  }

  // Only return matched periods if the remaining amount is small (within 1 NT$)
  // This means we successfully matched the payment
  if (Math.abs(remainingAmount) <= 1 && matchedPeriods.length > 0) {
    return matchedPeriods;
  }

  return [];
}

// Check if payment amounts match rent amount
function hasPaymentAmountMismatch(contract: Contract): boolean {
  if (!contract.paymentRecords || contract.paymentRecords.length === 0) {
    return false;
  }

  const confirmedPayments = contract.paymentRecords.filter(pr => pr.isConfirmed);
  
  if (confirmedPayments.length === 0) {
    return false;
  }

  const totalPaid = confirmedPayments.reduce((sum, pr) => sum + (pr.amount || 0), 0);
  const monthlyRent = contract.rentAmount;

  // For annual payment cycle, check if total confirmed payments match annual rent amount
  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    // Calculate expected annual amount (considering discount)
    const hasDiscount = contract.annualDiscount || false;
    const expectedAnnualAmount = hasDiscount ? monthlyRent * 11.5 : monthlyRent * 12;
    // Allow small difference due to rounding (within 1 NT$)
    return Math.abs(totalPaid - expectedAnnualAmount) > 1;
  }

  // For quarterly payment cycle, check if total confirmed payments match quarterly rent amount
  if (contract.paymentCycle === PaymentCycle.QUARTERLY) {
    const expectedQuarterlyAmount = monthlyRent * 3;
    // Allow small difference due to rounding (within 1 NT$)
    return Math.abs(totalPaid - expectedQuarterlyAmount) > 1;
  }

  // For semi-annual payment cycle, check if total confirmed payments match semi-annual rent amount
  if (contract.paymentCycle === PaymentCycle.SEMIANNUALLY) {
    const expectedSemiannualAmount = monthlyRent * 6;
    // Allow small difference due to rounding (within 1 NT$)
    return Math.abs(totalPaid - expectedSemiannualAmount) > 1;
  }

  // For monthly payment cycle, check each payment
  // Each confirmed payment should match the monthly rent amount
  if (contract.paymentCycle === PaymentCycle.MONTHLY) {
    for (const payment of confirmedPayments) {
      // Allow small difference due to rounding (within 1 NT$)
      if (Math.abs(payment.amount - monthlyRent) > 1) {
        return true;
      }
    }
  }

  return false;
}

const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useContracts();
  const [tenants] = useTenants();
  const [properties] = useProperties();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [currentContract, setCurrentContract] = useState<Contract>(DEFAULT_CONTRACT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPaymentRecord, setCurrentPaymentRecord] = useState<Partial<PaymentRecord>>({});
  const [editingPaymentRecordId, setEditingPaymentRecordId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal();
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'N/A';
  const getPropertyAddress = (propertyId: string) => properties.find(p => p.id === propertyId)?.address || 'N/A';

  const paymentCycleOptions = Object.values(PaymentCycle).map(pc => ({ value: pc, label: pc }));

  // Format rent display based on payment cycle
  const formatRentDisplay = (contract: Contract): React.ReactNode => {
    const monthlyRent = contract.rentAmount;
    const cycle = contract.paymentCycle;
    
    switch (cycle) {
      case PaymentCycle.MONTHLY:
        return (
          <div className="flex items-baseline gap-2">
            <span className="text-white text-lg font-bold">${monthlyRent.toLocaleString()}</span>
            <span className="text-surface-400 text-sm">/ {cycle}</span>
          </div>
        );
      case PaymentCycle.QUARTERLY:
        const quarterlyAmount = monthlyRent * 3;
        return (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-white text-xl font-bold">${quarterlyAmount.toLocaleString()}</span>
              <span className="text-surface-400 text-sm">/ {cycle}</span>
            </div>
            <div className="text-xs text-surface-500 pt-1 border-t border-white/5">
              <span className="text-surface-400">月繳：</span>
              <span className="text-white">${monthlyRent.toLocaleString()}</span>
              <span className="text-surface-500"> × 3</span>
            </div>
          </div>
        );
      case PaymentCycle.SEMIANNUALLY:
        const semiannualAmount = monthlyRent * 6;
        return (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-white text-xl font-bold">${semiannualAmount.toLocaleString()}</span>
              <span className="text-surface-400 text-sm">/ {cycle}</span>
            </div>
            <div className="text-xs text-surface-500 pt-1 border-t border-white/5">
              <span className="text-surface-400">月繳：</span>
              <span className="text-white">${monthlyRent.toLocaleString()}</span>
              <span className="text-surface-500"> × 6</span>
            </div>
          </div>
        );
      case PaymentCycle.ANNUALLY:
        const hasDiscount = contract.annualDiscount || false;
        const annualAmount = hasDiscount ? monthlyRent * 11.5 : monthlyRent * 12;
        return (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-white text-xl font-bold">${annualAmount.toLocaleString()}</span>
              <span className="text-surface-400 text-sm">/ {cycle}</span>
              {hasDiscount && (
                <span className="text-primary-400 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                  優惠半個月
                </span>
              )}
            </div>
            <div className="text-xs text-surface-500 pt-1 border-t border-white/5">
              <span className="text-surface-400">月繳：</span>
              <span className="text-white">${monthlyRent.toLocaleString()}</span>
              <span className="text-surface-500"> × {hasDiscount ? '11.5' : '12'}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-baseline gap-2">
            <span className="text-white text-lg font-bold">${monthlyRent.toLocaleString()}</span>
            <span className="text-surface-400 text-sm">/ {cycle}</span>
          </div>
        );
    }
  };

  const openModal = (contract?: Contract) => {
    if (contract) {
      setCurrentContract(contract);
      setEditingId(contract.id);
    } else {
      setCurrentContract(DEFAULT_CONTRACT);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const openViewModal = (contract: Contract) => {
    setCurrentContract(contract);
    setIsViewModalOpen(true);
  };
  
  const openPaymentModal = (contract: Contract, payment?: PaymentRecord) => {
    setCurrentContract(contract);
    if (payment) {
      setCurrentPaymentRecord(payment);
      setEditingPaymentRecordId(payment.id);
    } else {
      setCurrentPaymentRecord({ 
        paymentDate: new Date().toISOString().split('T')[0], 
        method: '轉帳',
        isConfirmed: true 
      });
      setEditingPaymentRecordId(null);
    }
    setIsPaymentModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setIsPaymentModalOpen(false);
    setCurrentContract(DEFAULT_CONTRACT);
    setEditingId(null);
    setCurrentPaymentRecord({});
    setEditingPaymentRecordId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'rentAmount') {
      setCurrentContract(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setCurrentContract(prev => ({ ...prev, [name]: checked }));
    } else {
      setCurrentContract(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePaymentRecordChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCurrentPaymentRecord(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'amount' ? parseFloat(value) : value)
    }));
  };

  const handleSavePaymentRecord = () => {
    if (!currentContract || !currentPaymentRecord.paymentDate || currentPaymentRecord.amount === undefined || currentPaymentRecord.amount === null) {
      alert('請填寫收款日期和金額');
      return;
    }

    const updatedContract = { ...currentContract };
    if (!updatedContract.paymentRecords) {
      updatedContract.paymentRecords = [];
    }

    // For non-annual payment cycles, automatically mark as confirmed when saving
    const shouldAutoConfirm = updatedContract.paymentCycle !== PaymentCycle.ANNUALLY;

    let newPayment: PaymentRecord;
    if (editingPaymentRecordId) { 
      newPayment = { 
        ...currentPaymentRecord, 
        id: editingPaymentRecordId,
        isConfirmed: shouldAutoConfirm ? true : (currentPaymentRecord.isConfirmed || false)
      } as PaymentRecord;
      updatedContract.paymentRecords = updatedContract.paymentRecords.map(pr => 
        pr.id === editingPaymentRecordId ? newPayment : pr
      );
    } else { 
      newPayment = {
        id: crypto.randomUUID(),
        paymentDate: currentPaymentRecord.paymentDate!,
        amount: currentPaymentRecord.amount!,
        method: currentPaymentRecord.method || '轉帳',
        isConfirmed: shouldAutoConfirm ? true : (currentPaymentRecord.isConfirmed || false),
      };
      updatedContract.paymentRecords.push(newPayment);
    }

    // Auto-match back payments for non-annual payment cycles
    if (shouldAutoConfirm && updatedContract.paymentCycle !== PaymentCycle.ANNUALLY) {
      const matchedPeriods = autoMatchBackPayments(updatedContract, newPayment);
      
      if (matchedPeriods.length > 0) {
        // Show confirmation message
        const periodInfo = matchedPeriods.map(p => `第${p.periodNumber}期`).join('、');
        const totalAmount = matchedPeriods.reduce((sum, p) => sum + p.amount, 0);
        
        if (matchedPeriods.length === 1) {
          alert(`已自動對應補繳款項：${periodInfo}（金額：$${totalAmount.toLocaleString()}）`);
        } else {
          alert(`已自動對應補繳款項：${periodInfo}（共${matchedPeriods.length}期，總金額：$${totalAmount.toLocaleString()}）`);
        }
      }
    }
    
    setContracts(contracts.map(c => c.id === updatedContract.id ? updatedContract : c));
    setIsPaymentModalOpen(false);
    setCurrentPaymentRecord({}); 
    setEditingPaymentRecordId(null);
    if(isViewModalOpen) setCurrentContract(updatedContract);
  };

  const removePaymentRecord = (contractId: string, paymentRecordId: string) => {
    const contractToUpdate = contracts.find(c => c.id === contractId);
    if (!contractToUpdate) return;

    const updatedPaymentRecords = contractToUpdate.paymentRecords.filter(pr => pr.id !== paymentRecordId);
    const updatedContract = {...contractToUpdate, paymentRecords: updatedPaymentRecords};
    
    setContracts(contracts.map(c => c.id === contractId ? updatedContract : c));
    if(isViewModalOpen) setCurrentContract(updatedContract);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContract.propertyId || !currentContract.tenantId) {
      alert("請選擇物件和承租人");
      return;
    }
    if (editingId) {
      setContracts(contracts.map(c => c.id === editingId ? { ...currentContract, id: editingId } : c));
    } else {
      setContracts([...contracts, { ...currentContract, id: crypto.randomUUID(), paymentRecords: currentContract.paymentRecords || [] }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此合約嗎？')) {
      setContracts(contracts.filter(c => c.id !== id));
    }
  };
  
  const isContractExpiringSoon = (endDate: string): boolean => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0,0,0,0); 
    end.setHours(0,0,0,0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  // Check if rent payment is due (for monthly, quarterly, semi-annual cycles)
  // This checks ALL past periods - if any period is unpaid, return true
  const isRentPaymentDue = (contract: Contract): boolean => {
    if (!contract.startDate || !contract.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contractStart = new Date(contract.startDate);
    contractStart.setHours(0, 0, 0, 0);
    const contractEnd = new Date(contract.endDate);
    contractEnd.setHours(0, 0, 0, 0);
    
    // Contract must be active
    if (today < contractStart || today > contractEnd) return false;
    
    // Only check non-annual payment cycles
    if (contract.paymentCycle === PaymentCycle.ANNUALLY) return false;
    
    // Calculate all rent periods
    const rentPeriods = calculateRentPeriods(contract);
    if (rentPeriods.length === 0) return false;
    
    // Check all periods that have ended (past periods)
    // If any past period is unpaid, return true
    for (const period of rentPeriods) {
      const periodEnd = new Date(period.endDate);
      periodEnd.setHours(0, 0, 0, 0);
      
      // Only check periods that have ended (past periods)
      if (today > periodEnd && !period.isPaid) {
        return true; // Found an unpaid past period
      }
    }
    
    // Also check current period if it exists
    const currentPeriod = rentPeriods.find(period => {
      const periodStart = new Date(period.startDate);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(period.endDate);
      periodEnd.setHours(0, 0, 0, 0);
      return today >= periodStart && today <= periodEnd;
    });
    
    // If current period exists and is unpaid, return true
    if (currentPeriod && !currentPeriod.isPaid) {
      return true;
    }
    
    return false;
  };

  const getContractStatus = (contract: Contract) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(contract.endDate);
    endDate.setHours(0,0,0,0);
    
    if (today > endDate) return { label: '已到期', badge: 'badge-danger' };
    if (isContractExpiringSoon(contract.endDate)) return { label: '即將到期', badge: 'badge-warning' };
    
    // Check if payment amounts match rent amount
    if (hasPaymentAmountMismatch(contract)) {
      return { label: '款項異常', badge: 'badge-danger' };
    }
    
    // Check if rent payment is due (unified for all payment cycles)
    if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
      // For annual payment cycle, check if payment has been confirmed
      const hasConfirmedPayment = contract.paymentRecords && contract.paymentRecords.some(pr => pr.isConfirmed);
      if (!hasConfirmedPayment) {
        return { label: '待收款', badge: 'badge-warning' };
      }
    } else {
      // For monthly, quarterly, semi-annual cycles, check if current period is unpaid
      if (isRentPaymentDue(contract)) {
        return { label: '待收款', badge: 'badge-warning' };
      }
    }
    
    return { label: '正常', badge: 'badge-success' };
  };

  // Memoize contract status to avoid recalculating on every render
  const contractStatusCache = React.useMemo(() => {
    const cache = new Map<string, { label: string; badge: string }>();
    contracts.forEach(contract => {
      try {
        cache.set(contract.id, getContractStatus(contract));
      } catch (error) {
        console.error('Error calculating contract status:', error, contract);
        cache.set(contract.id, { label: '錯誤', badge: 'badge-danger' });
      }
    });
    return cache;
  }, [contracts, getContractStatus]);

  // Filter contracts
  const filteredContracts = contracts.filter(contract => 
    contract.contractInternalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTenantName(contract.tenantId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPropertyAddress(contract.propertyId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="搜尋合約..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增合約
        </Button>
      </div>

      {/* Table Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">合約編號</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">物件</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">承租人</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">合約期間</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                        <DocumentTextIcon className="w-8 h-8 text-surface-600" />
                      </div>
                      <p className="text-surface-400 mb-1">尚無合約資料</p>
                      <p className="text-xs text-surface-500">點擊「新增合約」按鈕開始</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const status = contractStatusCache.get(contract.id) || getContractStatus(contract);
                  return (
                    <tr 
                      key={contract.id} 
                      className="group animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                            <DocumentTextIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contract.contractInternalId}</p>
                            <p className="text-xs text-surface-500">${contract.rentAmount.toLocaleString()}/月</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-400 hidden lg:table-cell max-w-xs truncate" title={getPropertyAddress(contract.propertyId)}>
                        {getPropertyAddress(contract.propertyId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-400">
                        {getTenantName(contract.tenantId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-400 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="w-4 h-4 text-surface-500" />
                          <span>{contract.startDate} ~ {contract.endDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openViewModal(contract)} 
                            className="icon-btn icon-btn-primary"
                            title="查看"
                          >
                            <ViewIcon className="w-4 h-4 text-surface-400" />
                          </button>
                          <button 
                            onClick={() => openModal(contract)} 
                            className="icon-btn icon-btn-primary"
                            title="編輯"
                          >
                            <EditIcon className="w-4 h-4 text-surface-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(contract.id)} 
                            className="icon-btn icon-btn-danger"
                            title="刪除"
                          >
                            <DeleteIcon className="w-4 h-4 text-surface-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredContracts.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              共 <span className="text-white font-medium">{filteredContracts.length}</span> 筆資料
            </p>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯合約' : '新增合約'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="合約基本資訊">
              <Input 
                label="合約編號" 
                name="contractInternalId" 
                value={currentContract.contractInternalId} 
                onChange={handleInputChange} 
                placeholder="請輸入合約編號"
                required 
              />
              <Select 
                label="物件" 
                name="propertyId" 
                value={currentContract.propertyId} 
                onChange={handleInputChange} 
                options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} 
                required 
              />
              <Select 
                label="承租人" 
                name="tenantId" 
                value={currentContract.tenantId} 
                onChange={handleInputChange} 
                options={tenants.map(t => ({ value: t.id, label: t.name }))} 
                required 
              />
            </FormGroup>

            <FormGroup title="合約期間">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="起始日期" 
                  name="startDate" 
                  type="date" 
                  value={currentContract.startDate} 
                  onChange={handleInputChange} 
                  required 
                />
                <Input 
                  label="結束日期" 
                  name="endDate" 
                  type="date" 
                  value={currentContract.endDate} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </FormGroup>

            <FormGroup title="租金資訊">
              <Input 
                label="租金金額 (NT$)" 
                name="rentAmount" 
                type="number" 
                value={currentContract.rentAmount} 
                onChange={handleInputChange} 
                placeholder="請輸入租金金額"
                required 
              />
              <Select 
                label="繳費週期" 
                name="paymentCycle" 
                value={currentContract.paymentCycle} 
                onChange={handleInputChange} 
                options={paymentCycleOptions} 
                required 
              />
              {currentContract.paymentCycle === PaymentCycle.ANNUALLY && (
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-surface-800/50 border border-white/5 hover:border-primary-500/30 transition-colors">
                    <input 
                      type="checkbox" 
                      name="annualDiscount" 
                      checked={currentContract.annualDiscount || false} 
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-white/20 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">年繳優惠</p>
                      <p className="text-xs text-surface-500">優惠半個月租金（年繳金額 = 月租金 × 11.5）</p>
                    </div>
                  </label>
                </div>
              )}
            </FormGroup>
            
            <div className="p-4 rounded-xl bg-info-500/10 border border-info-500/20">
              <p className="text-xs text-info-400">💡 合約到期提醒與租金收款提醒將根據合約期間與週期自動判斷</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增合約'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentContract && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title={`合約詳情: ${currentContract.contractInternalId}`} size="2xl">
          <div className="space-y-6">
            {/* Contract Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">物件地址</p>
                <p className="text-sm font-medium text-white">{getPropertyAddress(currentContract.propertyId)}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">承租人</p>
                <p className="text-sm font-medium text-white">{getTenantName(currentContract.tenantId)}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">合約期間</p>
                <p className="text-sm font-medium text-white">{currentContract.startDate} 至 {currentContract.endDate}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-2">租金</p>
                <div className="text-sm">{formatRentDisplay(currentContract)}</div>
              </div>
            </div>

            {/* Status Alerts */}
            {isContractExpiringSoon(currentContract.endDate) && (
              <div className="alert-warning p-4 rounded-xl flex items-center gap-3">
                <CalendarDaysIcon className="w-5 h-5 text-warning-400" />
                <p className="text-sm text-warning-400">合約即將在30天內到期，請注意續約事宜</p>
              </div>
            )}
            {isRentPaymentDue(currentContract) && (
              <div className="alert-danger p-4 rounded-xl flex items-center gap-3">
                <BellAlertIcon className="w-5 h-5 text-danger-400" />
                <p className="text-sm text-danger-400">本期租金即將到期或已逾期，請確認收款</p>
              </div>
            )}

            {/* Rent Periods Status - Only for non-annual payment cycles */}
            {currentContract.paymentCycle !== PaymentCycle.ANNUALLY && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-primary-400 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                    每期租金狀態
                  </h4>
                  <Button onClick={() => openPaymentModal(currentContract)} size="sm" variant="outline" icon={<MoneyIcon className="w-4 h-4" />}>
                    新增收款
                  </Button>
                </div>
                
                {(() => {
                  const rentPeriods = calculateRentPeriods(currentContract);
                  if (rentPeriods.length === 0) {
                    return (
                      <div className="p-8 rounded-xl bg-surface-800/30 border border-white/5 text-center">
                        <p className="text-surface-400 text-sm">尚無租金期間資料</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="overflow-x-auto rounded-xl border border-white/5 mb-6">
                      <table className="modern-table w-full">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">期數</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">期間</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">金額</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">狀態</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">收款日期</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentPeriods.map((period) => {
                            const formatDate = (date: Date): string => {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              return `${year}-${month}-${day}`;
                            };
                            
                            return (
                              <tr key={period.periodNumber}>
                                <td className="px-4 py-3 text-sm text-surface-300">第 {period.periodNumber} 期</td>
                                <td className="px-4 py-3 text-sm text-surface-300">
                                  {formatDate(period.startDate)} ~ {formatDate(period.endDate)}
                                </td>
                                <td className="px-4 py-3 text-sm text-white font-medium">${period.amount.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`badge ${period.isPaid ? 'badge-success' : 'badge-warning'}`}>
                                    {period.isPaid ? '已繳交' : '尚未繳交'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-surface-400">
                                  {period.paymentRecord?.paymentDate || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Payment Records */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-primary-400 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                  租金收款記錄
                </h4>
                <Button onClick={() => openPaymentModal(currentContract)} size="sm" variant="outline" icon={<MoneyIcon className="w-4 h-4" />}>
                  新增收款
                </Button>
              </div>
              
              {(currentContract.paymentRecords || []).length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-800/30 border border-white/5 text-center">
                  <MoneyIcon className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400 text-sm">尚無收款記錄</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="modern-table w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">收款日期</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">金額</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">方式</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-400">狀態</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-surface-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentContract.paymentRecords || []).map(pr => (
                        <tr key={pr.id}>
                          <td className="px-4 py-3 text-sm text-surface-300">{pr.paymentDate}</td>
                          <td className="px-4 py-3 text-sm text-white font-medium">${pr.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-surface-400">{pr.method}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${pr.isConfirmed ? 'badge-success' : 'badge-warning'}`}>
                              {pr.isConfirmed ? '已確認' : '待確認'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openPaymentModal(currentContract, pr)} 
                                className="icon-btn icon-btn-primary !w-8 !h-8"
                                title="編輯"
                              >
                                <EditIcon className="w-3.5 h-3.5 text-surface-400" />
                              </button>
                              <button 
                                onClick={() => removePaymentRecord(currentContract.id, pr.id)} 
                                className="icon-btn icon-btn-danger !w-8 !h-8"
                                title="刪除"
                              >
                                <DeleteIcon className="w-3.5 h-3.5 text-surface-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentContract); }}>
                <EditIcon className="w-4 h-4" />
                編輯合約
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && currentContract && (
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={editingPaymentRecordId ? "編輯收款記錄" : "新增收款記錄"} size="md">
          <div className="space-y-4">
            {currentContract.paymentCycle !== PaymentCycle.ANNUALLY && (
              <div className="p-4 rounded-xl bg-info-500/10 border border-info-500/20">
                <p className="text-xs text-info-400">
                  💡 對於{currentContract.paymentCycle}租客，輸入收款日期和金額後，系統會自動將對應期間的租金狀態更新為「已繳交」
                </p>
              </div>
            )}
            
            <Input 
              label="收款日期" 
              type="date" 
              name="paymentDate" 
              value={currentPaymentRecord.paymentDate || ''} 
              onChange={handlePaymentRecordChange} 
              required
            />
            <Input 
              label="收款金額 (NT$)" 
              type="number" 
              name="amount" 
              value={currentPaymentRecord.amount === undefined ? '' : String(currentPaymentRecord.amount)} 
              onChange={handlePaymentRecordChange} 
              placeholder="請輸入金額"
              required
            />
            <Select 
              label="支付方式" 
              name="method" 
              value={currentPaymentRecord.method || '轉帳'} 
              onChange={handlePaymentRecordChange} 
              options={[
                { value: '轉帳', label: '轉帳' },
                { value: '現金', label: '現金' },
                { value: '信用卡', label: '信用卡' },
                { value: '支票', label: '支票' },
                { value: '其他', label: '其他' }
              ]}
            />
            
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-surface-800/50 border border-white/5 hover:border-primary-500/30 transition-colors">
              <input 
                type="checkbox" 
                name="isConfirmed" 
                checked={currentPaymentRecord.isConfirmed || false} 
                onChange={handlePaymentRecordChange}
                className="w-5 h-5 rounded border-white/20 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
              <div>
                <p className="text-sm font-medium text-white">已確認收款</p>
                <p className="text-xs text-surface-500">勾選表示已確認款項入帳</p>
              </div>
            </label>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>取消</Button>
              <Button variant="primary" onClick={handleSavePaymentRecord}>
                {editingPaymentRecordId ? "儲存更新" : "新增記錄"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ContractManagement;
