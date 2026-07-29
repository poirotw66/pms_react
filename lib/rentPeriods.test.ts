import { describe, it, expect } from 'vitest';
import { Contract, PaymentCycle, PaymentRecord } from '../types.ts';
import {
  calculateRentPeriods,
  autoMatchBackPayments,
  hasPaymentAmountMismatch,
  hasMissingAnnualSchedule,
  getOverduePeriods,
  getContractStatus,
  isContractExpiringSoon,
} from './rentPeriods.ts';

/** 以 YYYY-MM-DD 建立日期，與系統其他地方一致 */
const d = (iso: string) => new Date(iso);

/** 把 Date 轉回 YYYY-MM-DD，方便斷言 */
const iso = (date: Date) => date.toISOString().slice(0, 10);

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    contractInternalId: 'C-001',
    propertyId: 'p1',
    tenantId: 't1',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    rentAmount: 10000,
    paymentCycle: PaymentCycle.MONTHLY,
    paymentRecords: [],
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentRecord> & { id: string }): PaymentRecord {
  return {
    paymentDate: '2025-01-05',
    amount: 10000,
    method: '轉帳',
    isConfirmed: true,
    ...overrides,
  };
}

describe('calculateRentPeriods — 期間切分', () => {
  it('月繳：一年切成 12 期，首末期對齊月初月底', () => {
    const periods = calculateRentPeriods(makeContract(), d('2025-06-15'));

    expect(periods).toHaveLength(12);
    expect(iso(periods[0].startDate)).toBe('2025-01-01');
    expect(iso(periods[0].endDate)).toBe('2025-01-31');
    expect(iso(periods[11].startDate)).toBe('2025-12-01');
    expect(iso(periods[11].endDate)).toBe('2025-12-31');
  });

  it('月繳：合約自月底起算時，首期只涵蓋當天，次期才回到整月', () => {
    const periods = calculateRentPeriods(
      makeContract({ startDate: '2025-01-31', endDate: '2025-04-30' }),
      d('2025-06-15')
    );

    expect(iso(periods[0].startDate)).toBe('2025-01-31');
    expect(iso(periods[0].endDate)).toBe('2025-01-31');
    expect(iso(periods[1].startDate)).toBe('2025-02-01');
    expect(iso(periods[1].endDate)).toBe('2025-02-28');
  });

  it('月繳：跨年不會斷開，2 月天數正確', () => {
    const periods = calculateRentPeriods(
      makeContract({ startDate: '2025-11-01', endDate: '2026-02-28' }),
      d('2026-01-15')
    );

    expect(periods).toHaveLength(4);
    expect(iso(periods[0].endDate)).toBe('2025-11-30');
    expect(iso(periods[1].endDate)).toBe('2025-12-31');
    expect(iso(periods[2].endDate)).toBe('2026-01-31');
    expect(iso(periods[3].endDate)).toBe('2026-02-28');
  });

  it('季繳：每期三個月', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentCycle: PaymentCycle.QUARTERLY }),
      d('2025-06-15')
    );

    expect(periods).toHaveLength(4);
    expect(iso(periods[0].startDate)).toBe('2025-01-01');
    expect(iso(periods[0].endDate)).toBe('2025-03-31');
    expect(iso(periods[3].endDate)).toBe('2025-12-31');
  });

  it('半年繳：每期六個月', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentCycle: PaymentCycle.SEMIANNUALLY }),
      d('2025-06-15')
    );

    expect(periods).toHaveLength(2);
    expect(iso(periods[0].endDate)).toBe('2025-06-30');
    expect(iso(periods[1].endDate)).toBe('2025-12-31');
  });

  it('缺少起訖日時回傳空陣列，不拋錯', () => {
    expect(calculateRentPeriods(makeContract({ startDate: '' }))).toEqual([]);
    expect(calculateRentPeriods(makeContract({ endDate: '' }))).toEqual([]);
  });
});

describe('calculateRentPeriods — 應收日', () => {
  it('月繳：應收日為當月的指定日', () => {
    const periods = calculateRentPeriods(makeContract({ paymentDueDay: 5 }), d('2025-06-15'));
    expect(iso(periods[0].dueDate)).toBe('2025-01-05');
    expect(iso(periods[1].dueDate)).toBe('2025-02-05');
  });

  it('月繳：指定日超過當月天數時收斂到月底（31 號遇上 2 月 / 4 月）', () => {
    const periods = calculateRentPeriods(makeContract({ paymentDueDay: 31 }), d('2025-06-15'));

    expect(iso(periods[0].dueDate)).toBe('2025-01-31'); // 1 月有 31 天
    expect(iso(periods[1].dueDate)).toBe('2025-02-28'); // 2 月收斂到 28
    expect(iso(periods[3].dueDate)).toBe('2025-04-30'); // 4 月收斂到 30
  });

  it('未設定應收日時預設為 1 號', () => {
    const periods = calculateRentPeriods(makeContract(), d('2025-06-15'));
    expect(iso(periods[0].dueDate)).toBe('2025-01-01');
  });

  it('季繳：應收日為該期開始當月的 1 號', () => {
    // 合約自 2 月起算：第一期從 2 月開始，應收日就在 2 月，不再回推到日曆季的 1 月
    const periods = calculateRentPeriods(
      makeContract({ startDate: '2025-02-01', paymentCycle: PaymentCycle.QUARTERLY, paymentDueDay: 10 }),
      d('2025-06-15')
    );
    expect(iso(periods[0].dueDate)).toBe('2025-02-01');
    expect(iso(periods[1].dueDate)).toBe('2025-05-01');
  });

  it('半年繳：應收日為該期開始當月的 1 號', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentCycle: PaymentCycle.SEMIANNUALLY, paymentDueDay: 15 }),
      d('2025-06-15')
    );
    expect(iso(periods[0].dueDate)).toBe('2025-01-01');
    expect(iso(periods[1].dueDate)).toBe('2025-07-01');
  });

  it('季繳／半年繳的應收日一定落在該期所屬的月份（修正前會早於該期數個月）', () => {
    // 合約自 5 月起算的半年繳：
    // 修正前第二期（11 月開始）的應收日會被算成 7 月，早於該期 4 個月
    const periods = calculateRentPeriods(
      makeContract({
        startDate: '2025-05-03',
        endDate: '2026-05-03',
        paymentCycle: PaymentCycle.SEMIANNUALLY,
        paymentDueDay: 3,
      }),
      d('2025-07-29')
    );

    expect(iso(periods[0].startDate)).toBe('2025-05-03');
    expect(iso(periods[0].dueDate)).toBe('2025-05-01');
    expect(iso(periods[1].startDate)).toBe('2025-11-01');
    expect(iso(periods[1].dueDate)).toBe('2025-11-01');

    // 每一期的應收日都不得早於該期開始的月份
    periods.forEach(period => {
      const dueMonth = period.dueDate.getFullYear() * 12 + period.dueDate.getMonth();
      const startMonth = period.startDate.getFullYear() * 12 + period.startDate.getMonth();
      expect(dueMonth).toBe(startMonth);
    });
  });
});

describe('calculateRentPeriods — 收款比對', () => {
  it('期間內的已確認收款會標記為已繳', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-05' })] }),
      d('2025-06-15')
    );

    expect(periods[0].isPaid).toBe(true);
    expect(periods[0].matchedPaymentId).toBe('r1');
    expect(periods[1].isPaid).toBe(false);
  });

  it('未確認的收款不算數', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentRecords: [payment({ id: 'r1', isConfirmed: false })] }),
      d('2025-06-15')
    );
    expect(periods[0].isPaid).toBe(false);
  });

  it('同一筆收款不會被兩期重複認列', () => {
    const periods = calculateRentPeriods(
      makeContract({ paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-05' })] }),
      d('2025-06-15')
    );

    const matched = periods.filter(p => p.matchedPaymentId === 'r1');
    expect(matched).toHaveLength(1);
  });

  it('補繳：事後一次付三期，會回補先前未繳的期數', () => {
    const periods = calculateRentPeriods(
      makeContract({
        paymentRecords: [payment({ id: 'r1', paymentDate: '2025-03-05', amount: 30000 })],
      }),
      d('2025-06-15')
    );

    expect(periods[0].isPaid).toBe(true); // 1 月（補繳）
    expect(periods[1].isPaid).toBe(true); // 2 月（補繳）
    expect(periods[2].isPaid).toBe(true); // 3 月（收款當期）
    expect(periods[3].isPaid).toBe(false); // 4 月起未繳
    expect(periods.filter(p => p.matchedPaymentId === 'r1')).toHaveLength(3);
  });

  it('補繳金額不足以涵蓋整期時不會誤判為已繳', () => {
    const periods = calculateRentPeriods(
      makeContract({
        paymentRecords: [payment({ id: 'r1', paymentDate: '2025-03-05', amount: 15000 })],
      }),
      d('2025-06-15')
    );

    expect(periods[0].isPaid).toBe(false); // 1 月仍未繳
    expect(periods[2].isPaid).toBe(true); // 只涵蓋收款當期
  });

  it('尚未結束的期數不會被之後的收款回補', () => {
    // today 設在 1 月中，1 月這期還沒結束
    const periods = calculateRentPeriods(
      makeContract({
        paymentRecords: [payment({ id: 'r1', paymentDate: '2025-03-05', amount: 30000 })],
      }),
      d('2025-01-15')
    );

    expect(periods[0].isPaid).toBe(false);
  });
});

describe('calculateRentPeriods — 年繳', () => {
  const annual = (overrides: Partial<Contract> = {}) =>
    makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [
        { date: '2025-01-10', amount: 60000 },
        { date: '2025-07-10', amount: 60000 },
      ],
      ...overrides,
    });

  it('每一筆排程各自成為一期', () => {
    const periods = calculateRentPeriods(annual(), d('2025-06-15'));

    expect(periods).toHaveLength(2);
    expect(iso(periods[0].dueDate)).toBe('2025-01-10');
    expect(periods[0].amount).toBe(60000);
    expect(iso(periods[1].dueDate)).toBe('2025-07-10');
  });

  it('收款日在應收日前後 30 天內且金額相符才算已繳', () => {
    const periods = calculateRentPeriods(
      annual({ paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-25', amount: 60000 })] }),
      d('2025-06-15')
    );

    expect(periods[0].isPaid).toBe(true);
    expect(periods[1].isPaid).toBe(false);
  });

  it('收款日超過 30 天不認列', () => {
    const periods = calculateRentPeriods(
      annual({ paymentRecords: [payment({ id: 'r1', paymentDate: '2025-03-01', amount: 60000 })] }),
      d('2025-06-15')
    );
    expect(periods[0].isPaid).toBe(false);
  });

  it('金額不符不認列', () => {
    const periods = calculateRentPeriods(
      annual({ paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-10', amount: 50000 })] }),
      d('2025-06-15')
    );
    expect(periods[0].isPaid).toBe(false);
  });

  it('未設定收款排程時算不出期數，並可被偵測', () => {
    const contract = makeContract({ paymentCycle: PaymentCycle.ANNUALLY, annualPaymentDates: [] });

    expect(calculateRentPeriods(contract, d('2025-06-15'))).toEqual([]);
    expect(hasMissingAnnualSchedule(contract)).toBe(true);
  });

  it('排程存在但日期空白，仍視為未設定', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [{ date: '', amount: 60000 }],
    });
    expect(hasMissingAnnualSchedule(contract)).toBe(true);
  });

  it('非年繳合約不會被判定為缺排程', () => {
    expect(hasMissingAnnualSchedule(makeContract())).toBe(false);
  });
});

describe('getOverduePeriods — 全繳別的逾期判定', () => {
  it('月繳：只列出應收日已過且未繳的期數', () => {
    const overdue = getOverduePeriods(
      makeContract({ paymentDueDay: 5, paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-05' })] }),
      d('2025-03-10')
    );

    // 1 月已繳；2、3 月應收日已過且未繳
    expect(overdue.map(p => iso(p.dueDate))).toEqual(['2025-02-05', '2025-03-05']);
  });

  it('月繳：應收日尚未到的當期不算逾期', () => {
    const overdue = getOverduePeriods(makeContract({ paymentDueDay: 20 }), d('2025-01-10'));
    expect(overdue).toHaveLength(0);
  });

  it('季繳也會被納入逾期判定（修正前首頁只看月繳）', () => {
    const overdue = getOverduePeriods(
      makeContract({ paymentCycle: PaymentCycle.QUARTERLY, paymentDueDay: 5 }),
      d('2025-05-10')
    );

    expect(overdue.length).toBeGreaterThan(0);
    expect(iso(overdue[0].dueDate)).toBe('2025-01-01');
  });

  it('半年繳也會被納入逾期判定', () => {
    const overdue = getOverduePeriods(
      makeContract({ paymentCycle: PaymentCycle.SEMIANNUALLY, paymentDueDay: 5 }),
      d('2025-08-10')
    );
    expect(overdue.length).toBeGreaterThan(0);
  });

  it('年繳也會被納入逾期判定', () => {
    const overdue = getOverduePeriods(
      makeContract({
        paymentCycle: PaymentCycle.ANNUALLY,
        annualPaymentDates: [{ date: '2025-01-10', amount: 60000 }],
      }),
      d('2025-06-15')
    );

    expect(overdue).toHaveLength(1);
    expect(iso(overdue[0].dueDate)).toBe('2025-01-10');
  });

  it('尚未開始的期數不算逾期', () => {
    // 5 月起算的半年繳，7 月底時第 2 期（11 月開始）尚未到來，不得列入逾期
    const contract = makeContract({
      startDate: '2025-05-03',
      endDate: '2026-05-03',
      paymentCycle: PaymentCycle.SEMIANNUALLY,
      paymentDueDay: 3,
    });

    const periods = calculateRentPeriods(contract, d('2025-07-29'));
    const secondPeriod = periods[1];
    expect(secondPeriod.startDate.getTime()).toBeGreaterThan(d('2025-07-29').getTime());

    const overdue = getOverduePeriods(contract, d('2025-07-29'));
    expect(overdue.map(p => p.periodNumber)).not.toContain(secondPeriod.periodNumber);
    expect(overdue.map(p => p.periodNumber)).toContain(1); // 第 1 期已開始且未繳
  });

  it('尚未生效或已到期的合約不列入提醒', () => {
    const contract = makeContract({ paymentDueDay: 5 });

    expect(getOverduePeriods(contract, d('2024-12-01'))).toHaveLength(0); // 尚未生效
    expect(getOverduePeriods(contract, d('2026-01-01'))).toHaveLength(0); // 已到期
  });
});

describe('hasPaymentAmountMismatch', () => {
  it('沒有收款紀錄時不算異常', () => {
    expect(hasPaymentAmountMismatch(makeContract())).toBe(false);
  });

  it('月繳：金額為租金整數倍時正常', () => {
    const contract = makeContract({
      paymentRecords: [payment({ id: 'r1', amount: 10000 }), payment({ id: 'r2', amount: 30000 })],
    });
    expect(hasPaymentAmountMismatch(contract)).toBe(false);
  });

  it('月繳：金額不是整數倍時判定為異常', () => {
    const contract = makeContract({ paymentRecords: [payment({ id: 'r1', amount: 7500 })] });
    expect(hasPaymentAmountMismatch(contract)).toBe(true);
  });

  it('季繳：合計需等於三個月租金', () => {
    const base = { paymentCycle: PaymentCycle.QUARTERLY };
    expect(hasPaymentAmountMismatch(makeContract({ ...base, paymentRecords: [payment({ id: 'r1', amount: 30000 })] }))).toBe(false);
    expect(hasPaymentAmountMismatch(makeContract({ ...base, paymentRecords: [payment({ id: 'r1', amount: 20000 })] }))).toBe(true);
  });

  it('年繳：有折扣時預期為 11.5 個月租金', () => {
    const base = { paymentCycle: PaymentCycle.ANNUALLY, annualDiscount: true };
    expect(hasPaymentAmountMismatch(makeContract({ ...base, paymentRecords: [payment({ id: 'r1', amount: 115000 })] }))).toBe(false);
    expect(hasPaymentAmountMismatch(makeContract({ ...base, paymentRecords: [payment({ id: 'r1', amount: 120000 })] }))).toBe(true);
  });

  it('允許 1 元以內的尾差', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.QUARTERLY,
      paymentRecords: [payment({ id: 'r1', amount: 30001 })],
    });
    expect(hasPaymentAmountMismatch(contract)).toBe(false);
  });
});

describe('autoMatchBackPayments', () => {
  it('超額付款會回補先前未繳的期數', () => {
    const record = payment({ id: 'r1', paymentDate: '2025-03-05', amount: 30000 });
    const contract = makeContract({ paymentRecords: [record] });

    const matched = autoMatchBackPayments(contract, record, d('2025-06-15'));

    expect(matched).toHaveLength(2); // 回補 1、2 月，3 月為當期
    expect(matched.map(p => p.periodNumber)).toEqual([1, 2]);
  });

  it('剛好只夠當期時不產生補繳', () => {
    const record = payment({ id: 'r1', paymentDate: '2025-03-05', amount: 10000 });
    const contract = makeContract({ paymentRecords: [record] });

    expect(autoMatchBackPayments(contract, record, d('2025-06-15'))).toHaveLength(0);
  });

  it('年繳不套用補繳邏輯', () => {
    const record = payment({ id: 'r1', paymentDate: '2025-03-05', amount: 120000 });
    const contract = makeContract({ paymentCycle: PaymentCycle.ANNUALLY, paymentRecords: [record] });

    expect(autoMatchBackPayments(contract, record, d('2025-06-15'))).toHaveLength(0);
  });

  it('未確認的收款不參與補繳', () => {
    const record = payment({ id: 'r1', paymentDate: '2025-03-05', amount: 30000, isConfirmed: false });
    const contract = makeContract({ paymentRecords: [record] });

    expect(autoMatchBackPayments(contract, record, d('2025-06-15'))).toHaveLength(0);
  });
});

describe('getContractStatus', () => {
  it('已過結束日 → 已到期', () => {
    expect(getContractStatus(makeContract(), d('2026-01-01')).label).toBe('已到期');
  });

  it('30 天內到期 → 即將到期', () => {
    expect(getContractStatus(makeContract(), d('2025-12-10')).label).toBe('即將到期');
    expect(isContractExpiringSoon('2025-12-31', d('2025-12-10'))).toBe(true);
    expect(isContractExpiringSoon('2025-12-31', d('2025-10-01'))).toBe(false);
  });

  it('金額異常優先於收款狀態', () => {
    const contract = makeContract({ paymentRecords: [payment({ id: 'r1', amount: 7500 })] });
    expect(getContractStatus(contract, d('2025-06-15')).label).toBe('款項異常');
  });

  it('有逾期未繳 → 待收款', () => {
    expect(getContractStatus(makeContract({ paymentDueDay: 5 }), d('2025-03-10')).label).toBe('待收款');
  });

  it('當期應收日未到 → 未到時間', () => {
    expect(getContractStatus(makeContract({ paymentDueDay: 20 }), d('2025-01-10')).label).toBe('未到時間');
  });

  it('年繳未設排程但已有收款 → 未設排程（修正前顯示為正常）', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [],
      paymentRecords: [payment({ id: 'r1', amount: 120000 })],
    });
    expect(getContractStatus(contract, d('2025-06-15')).label).toBe('未設排程');
  });

  it('年繳未設排程且無收款 → 待收款', () => {
    const contract = makeContract({ paymentCycle: PaymentCycle.ANNUALLY, annualPaymentDates: [] });
    expect(getContractStatus(contract, d('2025-06-15')).label).toBe('待收款');
  });

  it('年繳：排程日未到且尚未收款 → 未到時間', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [{ date: '2025-07-10', amount: 120000 }],
    });
    expect(getContractStatus(contract, d('2025-03-01')).label).toBe('未到時間');
  });

  it('年繳：全額收款後 → 正常', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [{ date: '2025-01-10', amount: 120000 }],
      paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-10', amount: 120000 })],
    });
    expect(getContractStatus(contract, d('2025-03-01')).label).toBe('正常');
  });

  it('年繳拆多筆排程時，只繳第一筆是正常的中間狀態', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [
        { date: '2025-01-10', amount: 60000 },
        { date: '2025-07-10', amount: 60000 },
      ],
      paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-10', amount: 60000 })],
    });

    expect(hasPaymentAmountMismatch(contract)).toBe(false);
    expect(getContractStatus(contract, d('2025-03-01')).label).toBe('未到時間');
  });

  it('年繳：收款對不上任何一筆排程時仍判為款項異常', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [
        { date: '2025-01-10', amount: 60000 },
        { date: '2025-07-10', amount: 60000 },
      ],
      // 金額對不上任何一筆排程
      paymentRecords: [payment({ id: 'r1', paymentDate: '2025-01-10', amount: 45000 })],
    });

    expect(hasPaymentAmountMismatch(contract)).toBe(true);
    expect(getContractStatus(contract, d('2025-03-01')).label).toBe('款項異常');
  });

  it('年繳：兩筆排程都繳齊後為正常', () => {
    const contract = makeContract({
      paymentCycle: PaymentCycle.ANNUALLY,
      annualPaymentDates: [
        { date: '2025-01-10', amount: 60000 },
        { date: '2025-07-10', amount: 60000 },
      ],
      paymentRecords: [
        payment({ id: 'r1', paymentDate: '2025-01-10', amount: 60000 }),
        payment({ id: 'r2', paymentDate: '2025-07-10', amount: 60000 }),
      ],
    });

    expect(hasPaymentAmountMismatch(contract)).toBe(false);
    expect(getContractStatus(contract, d('2025-08-01')).label).toBe('正常');
  });
});
