import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PotentialTenant } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button, TextArea } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_POTENTIAL_TENANT } from '../constants.tsx';

const PotentialTenantManagement: React.FC = () => {
  const [potentialTenants, setPotentialTenants] = useLocalStorage<PotentialTenant[]>('potentialTenants', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPotentialTenant, setCurrentPotentialTenant] = useState<PotentialTenant>(DEFAULT_POTENTIAL_TENANT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal();
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const openModal = (pt?: PotentialTenant) => {
    if (pt) {
      setCurrentPotentialTenant(pt);
      setEditingId(pt.id);
    } else {
      setCurrentPotentialTenant(DEFAULT_POTENTIAL_TENANT);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };
  
  const openViewModal = (pt: PotentialTenant) => {
    setCurrentPotentialTenant(pt);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setCurrentPotentialTenant(DEFAULT_POTENTIAL_TENANT);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentPotentialTenant(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPotentialTenants(potentialTenants.map(pt => pt.id === editingId ? { ...currentPotentialTenant, id: editingId } : pt));
    } else {
      setPotentialTenants([...potentialTenants, { ...currentPotentialTenant, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此潛在客戶嗎？')) {
      setPotentialTenants(potentialTenants.filter(pt => pt.id !== id));
    }
  };

  return (
    <div className="p-6 bg-transparent">
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增潛在客戶
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">客戶姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">聯絡電話</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">需求簡述</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">追蹤狀態</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {potentialTenants.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-textSecondary">尚無潛在客戶資料</td></tr>
            )}
            {potentialTenants.map(pt => (
              <tr key={pt.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{pt.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{pt.phone}</td>
                <td className="px-6 py-4 text-sm text-textSecondary truncate max-w-md">{pt.requirements}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{pt.trackingStatus || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(pt)} variant="neutral" size="sm" className="!p-1.5" title="查看"><ViewIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => openModal(pt)} variant="neutral" size="sm" className="!p-1.5" title="編輯"><EditIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(pt.id)} variant="danger" size="sm" className="!p-1.5" title="刪除"><DeleteIcon className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯潛在客戶' : '新增潛在客戶'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4 text-textSecondary">
            <Input label="客戶姓名 (6-1)" name="name" value={currentPotentialTenant.name} onChange={handleInputChange} required />
            <Input label="客戶聯絡電話 (6-2)" name="phone" type="tel" value={currentPotentialTenant.phone} onChange={handleInputChange} required />
            <TextArea label="客戶需求 (6-3)" name="requirements" value={currentPotentialTenant.requirements} onChange={handleInputChange} placeholder="物件類型、區域、預算、房間數、特殊需求等"/>
            <Input label="客戶工作內容 (6-4)" name="workInfo" value={currentPotentialTenant.workInfo} onChange={handleInputChange} />
            <Input label="預計入住日期" name="expectedMoveInDate" type="date" value={currentPotentialTenant.expectedMoveInDate || ''} onChange={handleInputChange} />
            <TextArea label="看房紀錄/備註" name="viewingNotes" value={currentPotentialTenant.viewingNotes || ''} onChange={handleInputChange} />
            <Input label="追蹤狀態" name="trackingStatus" value={currentPotentialTenant.trackingStatus || ''} onChange={handleInputChange} placeholder="例如：已聯繫、已看房、考慮中"/>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增客戶'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isViewModalOpen && currentPotentialTenant && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="查看潛在客戶資料" size="md">
          <div className="space-y-3 text-sm text-textSecondary">
            <p><strong>客戶姓名:</strong> <span className="text-textPrimary">{currentPotentialTenant.name}</span></p>
            <p><strong>聯絡電話:</strong> <span className="text-textPrimary">{currentPotentialTenant.phone}</span></p>
            <p><strong>客戶需求:</strong> <span className="whitespace-pre-wrap text-textPrimary">{currentPotentialTenant.requirements}</span></p>
            <p><strong>工作內容:</strong> <span className="text-textPrimary">{currentPotentialTenant.workInfo || '-'}</span></p>
            <p><strong>預計入住日期:</strong> <span className="text-textPrimary">{currentPotentialTenant.expectedMoveInDate || '-'}</span></p>
            <p><strong>看房紀錄/備註:</strong> <span className="whitespace-pre-wrap text-textPrimary">{currentPotentialTenant.viewingNotes || '-'}</span></p>
            <p><strong>追蹤狀態:</strong> <span className="text-textPrimary">{currentPotentialTenant.trackingStatus || '-'}</span></p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PotentialTenantManagement;