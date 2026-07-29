/**
 * 租金期數計算與收款比對
 *
 * 這裡集中了整個系統最容易出錯、也最常被修改的商業邏輯：
 * 每期租金的起訖與應收日、實際收款如何對應到期數、補繳與多期合併付款的處理。
 *
 * 所有對外函式都接受一個可選的 referenceDate（預設為現在），
 * 讓「今天」成為可注入的參數，月底、跨年、補繳等邊界情況才能被測試穩定驗證。
 */

import { Contract, PaymentCycle, PaymentRecord } from '../types.ts';

export interface RentPeriod {
  periodNumber: number;
  startDate: Date;
  endDate: Date;
  dueDate: Date; // Payment due date for this period
  amount: number;
  isPaid: boolean;
  paymentRecord?: PaymentRecord;
  matchedPaymentId?: string; // For back payments that match this period
}

export interface ContractStatus {
  label: string;
  badge: string;
}

/** 取得該日期的當日零時，統一比較基準 */
export function startOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 依繳別取得每期涵蓋的月數 */
function getMonthsToAdd(cycle: PaymentCycle): number {
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
}

/**
 * 年繳未設定收款排程。
 *
 * 年繳的期數完全由 annualPaymentDates 決定，沒設定就算不出任何一期，
 * 畫面會是空的。這個判斷讓 UI 能明確提示「尚未設定」而不是靜默空白。
 */
export function hasMissingAnnualSchedule(contract: Contract): boolean {
  if (contract.paymentCycle !== PaymentCycle.ANNUALLY) return false;
  const schedules = contract.annualPaymentDates || [];
  return schedules.filter(schedule => !!schedule.date).length === 0;
}

// Find payment record that matches a rent period
// usedPayments: Set of payment IDs that have been fully used (single-period payments)
function findPaymentForPeriod(
  paymentRecords: PaymentRecord[],
  periodStart: Date,
  periodEnd: Date,
  usedPayments: Set<string>,
  rentAmount: number
): PaymentRecord | undefined {
  return paymentRecords.find(record => {
    if (!record.paymentDate || !record.isConfirmed) {
      return false;
    }

    // Skip if this payment has already been fully used
    if (usedPayments.has(record.id)) {
      return false;
    }

    const paymentDate = startOfDay(record.paymentDate);
    const pStart = startOfDay(periodStart);
    const pEnd = startOfDay(periodEnd);

    if (paymentDate >= pStart && paymentDate <= pEnd) {
      // Check if this is a single-period payment or multi-period payment
      const periodsCovered = Math.floor((record.amount + 1) / rentAmount);

      // For single-period payments, mark as used immediately
      if (periodsCovered <= 1) {
        usedPayments.add(record.id);
      }

      return true;
    }

    return false;
  });
}

/** 年繳：每一筆排程日對應一期 */
function calculateAnnualPeriods(contract: Contract): RentPeriod[] {
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const annualSchedules = contract.annualPaymentDates || [];
  if (annualSchedules.length === 0) {
    return [];
  }

  const periods: RentPeriod[] = [];
  const confirmedPayments = (contract.paymentRecords || []).filter(pr => pr.isConfirmed && pr.amount);
  const usedPayments = new Set<string>();

  annualSchedules.forEach((schedule, index) => {
    if (!schedule.date) return;

    const dueDate = startOfDay(schedule.date);

    // For annual payments, each schedule item represents a period
    // Period start is contract start date, period end is contract end date
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    // Check if payment exists for this schedule
    let paymentRecord: PaymentRecord | undefined;
    for (const payment of confirmedPayments) {
      if (usedPayments.has(payment.id)) continue;

      const paymentDate = startOfDay(payment.paymentDate);

      // Check if payment date is close to due date (within 30 days before or after)
      const daysDiff = Math.abs(paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      const amountMatch = Math.abs(payment.amount - (schedule.amount || 0)) <= 1; // Allow 1 NT$ difference

      if (daysDiff <= 30 && amountMatch) {
        paymentRecord = payment;
        usedPayments.add(payment.id);
        break;
      }
    }

    periods.push({
      periodNumber: index + 1,
      startDate: periodStart,
      endDate: periodEnd,
      dueDate: dueDate,
      amount: schedule.amount || 0,
      isPaid: !!paymentRecord,
      paymentRecord: paymentRecord,
      matchedPaymentId: paymentRecord?.id,
    });
  });

  return periods;
}

/** 計算單期的應收日：依繳別對齊到月 / 季 / 半年的起始月 */
function calculateDueDate(contract: Contract, periodStart: Date): Date {
  const paymentDueDay = contract.paymentDueDay || 1; // Default to 1st if not set
  const dueDate = new Date(periodStart);

  if (contract.paymentCycle === PaymentCycle.MONTHLY) {
    // Monthly: due date is paymentDueDay of the period start month
    const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    dueDate.setDate(Math.min(paymentDueDay, daysInMonth));
  } else if (contract.paymentCycle === PaymentCycle.QUARTERLY) {
    // Quarterly: due date is paymentDueDay of the first month of the quarter
    // Quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
    const quarterStartMonth = Math.floor(periodStart.getMonth() / 3) * 3; // 0, 3, 6, or 9
    dueDate.setFullYear(periodStart.getFullYear());
    dueDate.setMonth(quarterStartMonth, 1); // Set to first day of quarter start month
    const daysInMonth = new Date(periodStart.getFullYear(), quarterStartMonth + 1, 0).getDate();
    dueDate.setDate(Math.min(paymentDueDay, daysInMonth));
  } else if (contract.paymentCycle === PaymentCycle.SEMIANNUALLY) {
    // Semi-annually: due date is paymentDueDay of January or July
    const halfYearStartMonth = periodStart.getMonth() < 6 ? 0 : 6; // January (0) or July (6)
    dueDate.setFullYear(periodStart.getFullYear());
    dueDate.setMonth(halfYearStartMonth, 1); // Set to first day of half year start month
    const daysInMonth = new Date(periodStart.getFullYear(), halfYearStartMonth + 1, 0).getDate();
    dueDate.setDate(Math.min(paymentDueDay, daysInMonth));
  }

  dueDate.setHours(0, 0, 0, 0);
  return dueDate;
}

/**
 * 計算合約的所有租金期數，並比對實際收款。
 *
 * referenceDate 影響補繳比對：只有已結束的期數才會嘗試以後續的收款回補。
 */
export function calculateRentPeriods(contract: Contract, referenceDate: Date = new Date()): RentPeriod[] {
  if (!contract.startDate || !contract.endDate) {
    return [];
  }

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const periods: RentPeriod[] = [];
  const today = startOfDay(referenceDate);

  let currentDate = new Date(startDate);
  let periodNumber = 1;

  const monthsToAdd = getMonthsToAdd(contract.paymentCycle);

  // Handle annual payment cycles separately
  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    return calculateAnnualPeriods(contract);
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

    const dueDate = calculateDueDate(contract, periodStart);

    // Check if this period has been paid
    // First check for payment within the period
    let paymentRecord = findPaymentForPeriod(
      contract.paymentRecords || [],
      periodStart,
      periodEnd,
      usedPayments,
      contract.rentAmount
    );

    // If no payment found within period and this is a past period, check for back payments
    // Back payment scenarios:
    // 1. Multi-period payment: can cover multiple periods, starting from its own period
    // 2. Single-period payment: if it can't match its own period (already covered), use for back payment
    if (!paymentRecord && today > periodEnd) {
      for (const payment of confirmedPayments) {
        if (usedPayments.has(payment.id)) continue;

        const paymentDate = startOfDay(payment.paymentDate);

        // If payment date is after period end, it could potentially be a back payment
        if (paymentDate > periodEnd) {
          // Calculate how many periods this payment can cover
          const periodsCovered = Math.floor((payment.amount + 1) / contract.rentAmount);

          // Count how many periods have been matched to this payment
          const periodsMatchedToThisPayment = periods.filter(p =>
            p.paymentRecord?.id === payment.id
          ).length;

          if (periodsCovered <= 1) {
            // Single period payment
            // Check if this payment's own period (the period containing paymentDate)
            // is already covered by another payment
            // If so, this payment can be used for back payment

            // For simplicity: allow single period payment for back payment if there are
            // multiple payments on the same date (indicating intentional back payment)
            const paymentsOnSameDate = confirmedPayments.filter(p => {
              const pDate = startOfDay(p.paymentDate);
              return pDate.getTime() === paymentDate.getTime();
            });

            // If there's only one payment on this date, reserve it for its own period
            if (paymentsOnSameDate.length <= 1) {
              continue;
            }

            // Multiple payments on same date - allow using for back payment
            // But only if it hasn't been matched yet
            if (periodsMatchedToThisPayment === 0) {
              // Check if the first payment on this date has already been matched to a period
              // Sort by ID to get consistent ordering
              const sortedPayments = [...paymentsOnSameDate].sort((a, b) => a.id.localeCompare(b.id));
              const firstPayment = sortedPayments[0];

              // If this is not the first payment, or the first payment is already matched,
              // this payment can be used for back payment
              if (payment.id !== firstPayment.id || periods.some(p => p.paymentRecord?.id === firstPayment.id)) {
                paymentRecord = payment;
                usedPayments.add(payment.id);
                break;
              }
            }
          } else {
            // Multi-period payment
            // Check if the payment's own period (where paymentDate falls) is already covered
            // by another payment. If so, all periods can be used for back payment.

            // Find payments that might cover the payment's own period
            const paymentsOnSameDate = confirmedPayments.filter(p => {
              if (p.id === payment.id) return false;
              const pDate = startOfDay(p.paymentDate);
              return pDate.getTime() === paymentDate.getTime();
            });

            // If there are other payments on the same date, the own period might be covered
            const ownPeriodCovered = paymentsOnSameDate.length > 0;

            // Calculate how many periods to reserve for own period
            const periodsToReserve = ownPeriodCovered ? 0 : 1;

            if (periodsMatchedToThisPayment < periodsCovered - periodsToReserve) {
              // Calculate remaining amount after matching previous periods (and reserving for own period if needed)
              const remainingAmount = payment.amount - ((periodsMatchedToThisPayment + periodsToReserve) * contract.rentAmount);

              // Check if remaining amount is enough for this period (allow 1 NT$ difference)
              if (remainingAmount >= contract.rentAmount - 1) {
                paymentRecord = payment;
                break;
              }
            }
          }
        }
      }
    }

    // Mark payment as fully used if it has been matched to all periods it can cover
    if (paymentRecord) {
      const matchedId = paymentRecord.id;
      const periodsMatchedToThisPayment = periods.filter(p =>
        p.paymentRecord?.id === matchedId
      ).length + 1; // +1 for current period
      const periodsThisPaymentCanCover = Math.floor((paymentRecord.amount + 1) / contract.rentAmount);

      // If payment is fully used, mark it as used
      if (periodsMatchedToThisPayment >= periodsThisPaymentCanCover) {
        usedPayments.add(matchedId);
      }
    }

    periods.push({
      periodNumber,
      startDate: periodStart,
      endDate: periodEnd,
      dueDate: dueDate,
      amount: contract.rentAmount,
      isPaid: !!paymentRecord,
      paymentRecord: paymentRecord,
      matchedPaymentId: paymentRecord?.id,
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

/**
 * 自動比對補繳：把一筆收款的超額部分回補到先前未繳的期數。
 * 回傳的是「本期以外」額外被涵蓋的期數。
 */
export function autoMatchBackPayments(
  contract: Contract,
  paymentRecord: PaymentRecord,
  referenceDate: Date = new Date()
): RentPeriod[] {
  // Only process non-annual payment cycles
  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    return [];
  }

  if (!paymentRecord.isConfirmed || !paymentRecord.amount) {
    return [];
  }

  const paymentDate = startOfDay(paymentRecord.paymentDate);

  // Calculate rent periods WITHOUT this payment to find unpaid periods
  const contractWithoutThisPayment = {
    ...contract,
    paymentRecords: (contract.paymentRecords || []).filter(pr => pr.id !== paymentRecord.id),
  };
  const rentPeriodsWithoutThisPayment = calculateRentPeriods(contractWithoutThisPayment, referenceDate);

  // Find which period the payment date falls into
  const currentPeriod = rentPeriodsWithoutThisPayment.find(period => {
    const periodStart = startOfDay(period.startDate);
    const periodEnd = startOfDay(period.endDate);
    return paymentDate >= periodStart && paymentDate <= periodEnd;
  });

  // Check if the current period is already covered by another payment
  // (not this payment, since we calculated with this payment excluded)
  const currentPeriodAlreadyCovered = currentPeriod
    ? rentPeriodsWithoutThisPayment.find(p => p.periodNumber === currentPeriod.periodNumber)?.isPaid
    : false;

  // If payment falls within a period AND that period is NOT already covered,
  // then this payment covers the current period first
  let remainingAmount = paymentRecord.amount;
  if (currentPeriod && !currentPeriodAlreadyCovered) {
    remainingAmount -= currentPeriod.amount;
  }

  // If no excess amount, no back payment matching needed
  if (remainingAmount < contract.rentAmount - 1) {
    return [];
  }

  // Find unpaid past periods BEFORE the payment date
  const unpaidPastPeriods = rentPeriodsWithoutThisPayment.filter(period => {
    const periodEnd = startOfDay(period.endDate);

    // Must be before the payment date
    if (periodEnd >= paymentDate) {
      return false;
    }

    // Must be unpaid (before this payment was added)
    if (period.isPaid) {
      return false;
    }

    return true;
  });

  if (unpaidPastPeriods.length === 0) {
    return [];
  }

  // Try to match remaining amount to unpaid past periods
  // Start from the oldest unpaid period
  const matchedPeriods: RentPeriod[] = [];

  for (const period of unpaidPastPeriods) {
    if (remainingAmount >= period.amount - 1) { // Allow 1 NT$ difference
      matchedPeriods.push(period);
      remainingAmount -= period.amount;
    } else {
      break; // Can't match more periods
    }
  }

  // Only return matched periods if we matched at least one period
  // and the remaining amount is reasonable (within one rent amount tolerance)
  if (matchedPeriods.length > 0 && remainingAmount < contract.rentAmount) {
    return matchedPeriods;
  }

  return [];
}

/** 收款金額與應收租金不符 */
export function hasPaymentAmountMismatch(contract: Contract): boolean {
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
  // A payment is valid if it's a multiple of the monthly rent (for multi-period payments)
  // or matches the monthly rent exactly
  if (contract.paymentCycle === PaymentCycle.MONTHLY) {
    for (const payment of confirmedPayments) {
      // Check if payment is a multiple of monthly rent (within 1 NT$ tolerance per period)
      const periodsThisPaymentCovers = payment.amount / monthlyRent;
      const roundedPeriods = Math.round(periodsThisPaymentCovers);

      // Must cover at least 1 period
      if (roundedPeriods < 1) {
        return true;
      }

      // Check if the payment amount matches the expected amount for N periods
      const expectedAmount = roundedPeriods * monthlyRent;
      const tolerance = roundedPeriods; // Allow 1 NT$ per period

      if (Math.abs(payment.amount - expectedAmount) > tolerance) {
        return true;
      }
    }
  }

  return false;
}

/** 合約是否即將到期（30 天內） */
export function isContractExpiringSoon(endDate: string, referenceDate: Date = new Date()): boolean {
  if (!endDate) return false;
  const end = startOfDay(endDate);
  const today = startOfDay(referenceDate);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays >= 0;
}

/** 合約是否已到期 */
export function isContractExpired(contract: Contract, referenceDate: Date = new Date()): boolean {
  if (!contract.endDate) return false;
  return startOfDay(referenceDate) > startOfDay(contract.endDate);
}

/** 合約是否在有效期間內（已生效且未到期） */
export function isContractActive(contract: Contract, referenceDate: Date = new Date()): boolean {
  if (!contract.startDate || !contract.endDate) return false;
  const today = startOfDay(referenceDate);
  return today >= startOfDay(contract.startDate) && today <= startOfDay(contract.endDate);
}

/**
 * 取得所有「應收日已過但仍未收款」的期數。
 *
 * 適用全部繳別：月/季/半年繳依 calculateRentPeriods 算出的應收日判斷，
 * 年繳則以 annualPaymentDates 的每一筆排程各自判斷。
 * 首頁的待收款提醒與合約頁的「待收款」狀態共用這個判斷，兩邊不會再有落差。
 *
 * 注意：季繳與半年繳的應收日是對齊日曆季/半年的起始月計算的，
 * 合約若不是從 1/4/7/10 月起算，應收日可能早於該期的開始日
 * （例如 5 月起算的半年繳，第二期 11 月開始，應收日卻落在 7 月）。
 * 因此這裡除了「應收日已過」，還要求「該期已經開始」，
 * 否則尚未開始的期數會被誤報為逾期。
 */
export function getOverduePeriods(contract: Contract, referenceDate: Date = new Date()): RentPeriod[] {
  if (!isContractActive(contract, referenceDate)) return [];

  const today = startOfDay(referenceDate);
  return calculateRentPeriods(contract, referenceDate).filter(period =>
    !period.isPaid &&
    startOfDay(period.startDate) <= today &&
    startOfDay(period.dueDate) <= today
  );
}

/** 合約在列表上顯示的狀態 */
export function getContractStatus(contract: Contract, referenceDate: Date = new Date()): ContractStatus {
  const today = startOfDay(referenceDate);

  if (isContractExpired(contract, referenceDate)) return { label: '已到期', badge: 'badge-danger' };
  if (isContractExpiringSoon(contract.endDate, referenceDate)) return { label: '即將到期', badge: 'badge-warning' };

  // Check if payment amounts match rent amount
  if (hasPaymentAmountMismatch(contract)) {
    return { label: '款項異常', badge: 'badge-danger' };
  }

  if (contract.paymentCycle === PaymentCycle.ANNUALLY) {
    if (hasMissingAnnualSchedule(contract)) {
      // 年繳但沒有任何收款排程：期數算不出來，明確提示待設定而非顯示空白
      const hasConfirmedPayment = (contract.paymentRecords || []).some(pr => pr.isConfirmed);
      return hasConfirmedPayment
        ? { label: '未設排程', badge: 'badge-warning' }
        : { label: '待收款', badge: 'badge-warning' };
    }

    const annualPeriods = calculateRentPeriods(contract, referenceDate);
    if (annualPeriods.some(period => !period.isPaid && startOfDay(period.dueDate) <= today)) {
      return { label: '待收款', badge: 'badge-warning' };
    }
    if (annualPeriods.some(period => startOfDay(period.dueDate) > today)) {
      return { label: '未到時間', badge: 'badge-info' };
    }
    return { label: '正常', badge: 'badge-success' };
  }

  const rentPeriods = calculateRentPeriods(contract, referenceDate);
  if (rentPeriods.length === 0) {
    return { label: '正常', badge: 'badge-success' };
  }

  // Check if there are any overdue unpaid periods
  if (getOverduePeriods(contract, referenceDate).length > 0) {
    return { label: '待收款', badge: 'badge-warning' };
  }

  // Find current or next unpaid period
  let currentOrNextPeriod = rentPeriods.find(period => {
    const periodStart = startOfDay(period.startDate);
    const periodEnd = startOfDay(period.endDate);
    return today >= periodStart && today <= periodEnd;
  });

  // If no current period, find next unpaid period
  if (!currentOrNextPeriod) {
    currentOrNextPeriod = rentPeriods.find(period => startOfDay(period.startDate) > today && !period.isPaid);
  }

  // Check if current/next period's due date has not arrived yet
  if (currentOrNextPeriod && !currentOrNextPeriod.isPaid) {
    return startOfDay(currentOrNextPeriod.dueDate) > today
      ? { label: '未到時間', badge: 'badge-info' }
      : { label: '待收款', badge: 'badge-warning' };
  }

  return { label: '正常', badge: 'badge-success' };
}
