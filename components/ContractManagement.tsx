import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Contract, Tenant, Property, PaymentCycle, PaymentRecord } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, TextArea } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, MoneyIcon, CalendarDaysIcon, BellAlertIcon, DEFAULT_CONTRACT } from '../constants.tsx';

const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useLocalStorage<Contract[]>('contracts', []);
  const [tenants] = useLocalStorage<Tenant[]>('tenants', []);
  const [properties] = useLocalStorage<Property[]>('properties', []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [currentContract, setCurrentContract] = useState<Contract>(DEFAULT_CONTRACT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPaymentRecord, setCurrentPaymentRecord] = useState<Partial<PaymentRecord>>({});
  const [editingPaymentRecordId, setEditingPaymentRecordId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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
        setCurrentPaymentRecord({ paymentDate: new Date().toISOString().split('T')[0], isConfirmed: false });
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
    const { name, value } = e.target;
    if (name === 'rentAmount') {
      setCurrentContract(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setCurrentContract(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePaymentRecordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
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

    if (editingPaymentRecordId) { 
        updatedContract.paymentRecords = updatedContract.paymentRecords.map(pr => 
            pr.id === editingPaymentRecordId ? { ...currentPaymentRecord, id: editingPaymentRecordId } as PaymentRecord : pr
        );
    } else { 
        const newPayment: PaymentRecord = {
            id: crypto.randomUUID(),
            paymentDate: currentPaymentRecord.paymentDate!,
            amount: currentPaymentRecord.amount!,
            method: currentPaymentRecord.method || '未指定',
            isConfirmed: currentPaymentRecord.isConfirmed || false,
        };
        updatedContract.paymentRecords.push(newPayment);
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

  const isRentPaymentDueSoon = (contract: Contract): boolean => {
    if (!contract.startDate || !contract.endDate) return false;
    const today = new Date();
    const contractEnd = new Date(contract.endDate);
    if (today > contractEnd) return false; 

    if (contract.paymentCycle !== PaymentCycle.MONTHLY) return false; 

    const startDate = new Date(contract.startDate);
    const paymentDayOfMonth = startDate.getDate();
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const paidThisMonth = contract.paymentRecords.some(p => {
        if (!p.paymentDate) return false;
        const paymentDate = new Date(p.paymentDate);
        return p.isConfirmed && paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    if (paidThisMonth) return false;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualPaymentDay = Math.min(paymentDayOfMonth, daysInMonth);

    return today.getDate() >= actualPaymentDay - 5 ; 
  };


  return (
    <div className="p-6 bg-transparent">
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增合約
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">合約編號</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">物件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">承租人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">合約期間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">狀態</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {contracts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-textSecondary">尚無合約資料</td></tr>
            )}
            {contracts.map(contract => (
              <tr key={contract.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{contract.contractInternalId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary truncate max-w-xs" title={getPropertyAddress(contract.propertyId)}>{getPropertyAddress(contract.propertyId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{getTenantName(contract.tenantId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{contract.startDate} ~ {contract.endDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                    {isContractExpiringSoon(contract.endDate) && 
                        <span title="合約即將到期" className="mr-1 p-1 bg-yellow-400 text-yellow-800 rounded-full text-xs inline-flex items-center"><CalendarDaysIcon className="w-3 h-3"/></span>}
                    {isRentPaymentDueSoon(contract) && 
                        <span title="租金即將到期或逾期" className="p-1 bg-red-400 text-red-800 rounded-full text-xs inline-flex items-center"><BellAlertIcon className="w-3 h-3"/></span>}
                    {!(isContractExpiringSoon(contract.endDate) || isRentPaymentDueSoon(contract)) && <span className="text-green-600">正常</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(contract)} variant="neutral" size="sm" className="!p-1.5" title="查看"><ViewIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => openModal(contract)} variant="neutral" size="sm" className="!p-1.5" title="編輯"><EditIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(contract.id)} variant="danger" size="sm" className="!p-1.5" title="刪除"><DeleteIcon className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯合約' : '新增合約'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2 text-textSecondary">
            <Input label="合約編號 (3-1)" name="contractInternalId" value={currentContract.contractInternalId} onChange={handleInputChange} required />
            <Select label="物件 (關聯物件管理 2-1)" name="propertyId" value={currentContract.propertyId} onChange={handleInputChange} options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} required />
            <Select label="承租人 (3-3, 關聯客戶管理 1-1)" name="tenantId" value={currentContract.tenantId} onChange={handleInputChange} options={tenants.map(t => ({ value: t.id, label: t.name }))} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="合約起始日期 (3-2)" name="startDate" type="date" value={currentContract.startDate} onChange={handleInputChange} required />
              <Input label="合約結束日期 (3-2)" name="endDate" type="date" value={currentContract.endDate} onChange={handleInputChange} required />
            </div>
            <Input label="租金金額" name="rentAmount" type="number" value={currentContract.rentAmount} onChange={handleInputChange} required />
            <Select label="繳費週期 (3-6)" name="paymentCycle" value={currentContract.paymentCycle} onChange={handleInputChange} options={paymentCycleOptions} required />
            
            <p className="text-xs mt-2">合約到期提醒 (3-4) 與租金收款提醒 (3-5) 將根據合約期間與週期自動判斷。</p>

            <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-surface py-3 border-t border-borderLight">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增合約'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isViewModalOpen && currentContract && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title={`查看合約: ${currentContract.contractInternalId}`} size="2xl">
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto p-1 text-textSecondary">
            <p><strong>合約編號:</strong> <span className="text-textPrimary">{currentContract.contractInternalId}</span></p>
            <p><strong>物件:</strong> <span className="text-textPrimary">{getPropertyAddress(currentContract.propertyId)} (ID: {currentContract.propertyId})</span></p>
            <p><strong>承租人:</strong> <span className="text-textPrimary">{getTenantName(currentContract.tenantId)} (ID: {currentContract.tenantId})</span></p>
            <p><strong>合約期間:</strong> <span className="text-textPrimary">{currentContract.startDate} 至 {currentContract.endDate}</span></p>
            <p><strong>租金:</strong> <span className="text-textPrimary">${currentContract.rentAmount} / {currentContract.paymentCycle}</span></p>
            {isContractExpiringSoon(currentContract.endDate) && <p className="text-yellow-600 font-semibold">提醒: 合約即將在30天內到期。</p>}
            {isRentPaymentDueSoon(currentContract) && <p className="text-red-600 font-semibold">提醒: 本期租金即將到期或已逾期，請確認收款。</p>}
            <hr className="my-2 border-borderLight"/>
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-textPrimary">租金收款記錄 (3-6):</h4>
                <Button onClick={() => openPaymentModal(currentContract)} size="sm" variant="secondary">
                    <MoneyIcon className="w-4 h-4 mr-1 inline"/> 新增收款記錄
                </Button>
            </div>
            {(currentContract.paymentRecords || []).length === 0 ? <p>尚無收款記錄</p> : (
                <table className="min-w-full text-xs mt-2 border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-2 text-left font-medium text-textSecondary border-b border-borderLight">收款日期</th>
                            <th className="p-2 text-left font-medium text-textSecondary border-b border-borderLight">金額</th>
                            <th className="p-2 text-left font-medium text-textSecondary border-b border-borderLight">方式</th>
                            <th className="p-2 text-left font-medium text-textSecondary border-b border-borderLight">已確認</th>
                            <th className="p-2 text-left font-medium text-textSecondary border-b border-borderLight">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                    {(currentContract.paymentRecords || []).map(pr => (
                        <tr key={pr.id} className="border-b border-borderLight hover:bg-slate-50">
                            <td className="p-2 text-textPrimary">{pr.paymentDate}</td>
                            <td className="p-2 text-textPrimary">${pr.amount}</td>
                            <td className="p-2 text-textPrimary">{pr.method}</td>
                            <td className="p-2 text-textPrimary">{pr.isConfirmed ? '是' : '否'}</td>
                            <td className="p-2 space-x-1">
                                <Button size="sm" variant="neutral" className="!p-1" onClick={() => openPaymentModal(currentContract, pr)} title="編輯"><EditIcon className="w-3.5 h-3.5"/></Button>
                                <Button size="sm" variant="danger" className="!p-1" onClick={() => removePaymentRecord(currentContract.id, pr.id)} title="刪除"><DeleteIcon className="w-3.5 h-3.5"/></Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
          </div>
        </Modal>
      )}

      {isPaymentModalOpen && currentContract && (
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={editingPaymentRecordId ? "編輯收款記錄" : "新增收款記錄"} size="md">
            <div className="space-y-3 text-textSecondary">
                <Input label="收款日期" type="date" name="paymentDate" value={currentPaymentRecord.paymentDate || ''} onChange={handlePaymentRecordChange} required/>
                <Input label="收款金額" type="number" name="amount" value={currentPaymentRecord.amount === undefined ? '' : String(currentPaymentRecord.amount)} onChange={handlePaymentRecordChange} required/>
                <Input label="支付方式" name="method" value={currentPaymentRecord.method || ''} onChange={handlePaymentRecordChange} placeholder="例如：現金、轉帳"/>
                <div className="flex items-center mt-2">
                    <input type="checkbox" id="isConfirmed" name="isConfirmed" checked={currentPaymentRecord.isConfirmed || false} onChange={handlePaymentRecordChange} className="h-4 w-4 text-primary border-borderDefault rounded focus:ring-primary"/>
                    <label htmlFor="isConfirmed" className="ml-2 block text-sm text-textPrimary">已確認收款</label>
                </div>
                <div className="flex justify-end space-x-2 pt-3">
                    <Button variant="neutral" onClick={() => setIsPaymentModalOpen(false)}>取消</Button>
                    <Button variant="primary" onClick={handleSavePaymentRecord}>{editingPaymentRecordId ? "儲存更新" : "新增記錄"}</Button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default ContractManagement;