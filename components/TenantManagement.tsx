import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tenant } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_TENANT } from '../constants.tsx';

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useLocalStorage<Tenant[]>('tenants', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(DEFAULT_TENANT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal(); // Open for adding new
      // Clear the action param to prevent re-triggering
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]); // Removed openModal from deps, ensure it's stable


  const openModal = (tenant?: Tenant) => {
    if (tenant) {
      setCurrentTenant(tenant);
      setEditingId(tenant.id);
    } else {
      setCurrentTenant(DEFAULT_TENANT);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const openViewModal = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setCurrentTenant(DEFAULT_TENANT);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('workDetails.')) {
      const key = name.split('.')[1] as keyof Tenant['workDetails'];
      setCurrentTenant(prev => ({ ...prev, workDetails: { ...prev.workDetails, [key]: value } }));
    } else if (name.startsWith('emergencyContact.')) {
      const key = name.split('.')[1] as keyof Tenant['emergencyContact'];
      setCurrentTenant(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [key]: value } }));
    } else {
      setCurrentTenant(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setTenants(tenants.map(t => t.id === editingId ? { ...currentTenant, id: editingId } : t));
    } else {
      setTenants([...tenants, { ...currentTenant, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此承租人嗎？')) {
      setTenants(tenants.filter(t => t.id !== id));
    }
  };

  return (
    <div className="p-6 bg-transparent"> {/* Changed background to transparent, App.tsx handles main bg */}
      <div className="flex justify-end items-center mb-6">
        {/* Page title is now in App.tsx's Content Header */}
        <Button onClick={() => openModal()} variant="primary" size="md">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增承租人
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">身份證字號</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">連絡電話</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">工作</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {tenants.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-textSecondary">尚無承租人資料</td></tr>
            )}
            {tenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{tenant.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{tenant.idNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{tenant.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{tenant.workDetails.job} @ {tenant.workDetails.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(tenant)} variant="neutral" size="sm" className="inline-flex items-center !p-1.5" title="查看">
                    <ViewIcon className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => openModal(tenant)} variant="neutral" size="sm" className="inline-flex items-center !p-1.5" title="編輯">
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => handleDelete(tenant.id)} variant="danger" size="sm" className="inline-flex items-center !p-1.5" title="刪除">
                    <DeleteIcon className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯承租人' : '新增承租人'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="承租人姓名 (1-1)" name="name" value={currentTenant.name} onChange={handleInputChange} required />
            <Input label="身份證字號 (1-2)" name="idNumber" value={currentTenant.idNumber} onChange={handleInputChange} required />
            <Input label="連絡電話 (1-3)" name="phone" type="tel" value={currentTenant.phone} onChange={handleInputChange} required />
            
            <h3 className="text-md font-semibold pt-2 border-t border-borderLight mt-4 text-textPrimary">工作資訊 (1-4)</h3>
            <Input label="職業" name="workDetails.job" value={currentTenant.workDetails.job} onChange={handleInputChange} />
            <Input label="任職公司" name="workDetails.company" value={currentTenant.workDetails.company} onChange={handleInputChange} />
            <Input label="職位" name="workDetails.position" value={currentTenant.workDetails.position} onChange={handleInputChange} />

            <h3 className="text-md font-semibold pt-2 border-t border-borderLight mt-4 text-textPrimary">緊急聯絡人 (1-5)</h3>
            <Input label="姓名" name="emergencyContact.name" value={currentTenant.emergencyContact.name} onChange={handleInputChange} required/>
            <Input label="電話" name="emergencyContact.phone" type="tel" value={currentTenant.emergencyContact.phone} onChange={handleInputChange} required/>
            <Input label="關係" name="emergencyContact.relationship" value={currentTenant.emergencyContact.relationship} onChange={handleInputChange} required/>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增承租人'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isViewModalOpen && currentTenant && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="查看承租人資料" size="lg">
          <div className="space-y-3 text-sm text-textSecondary">
            <p><strong>姓名:</strong> <span className="text-textPrimary">{currentTenant.name}</span></p>
            <p><strong>身份證字號:</strong> <span className="text-textPrimary">{currentTenant.idNumber}</span></p>
            <p><strong>連絡電話:</strong> <span className="text-textPrimary">{currentTenant.phone}</span></p>
            <hr className="my-2 border-borderLight"/>
            <h4 className="font-semibold text-textPrimary">工作資訊:</h4>
            <p><strong>職業:</strong> <span className="text-textPrimary">{currentTenant.workDetails.job || '-'}</span></p>
            <p><strong>任職公司:</strong> <span className="text-textPrimary">{currentTenant.workDetails.company || '-'}</span></p>
            <p><strong>職位:</strong> <span className="text-textPrimary">{currentTenant.workDetails.position || '-'}</span></p>
            <hr className="my-2 border-borderLight"/>
            <h4 className="font-semibold text-textPrimary">緊急聯絡人:</h4>
            <p><strong>姓名:</strong> <span className="text-textPrimary">{currentTenant.emergencyContact.name}</span></p>
            <p><strong>電話:</strong> <span className="text-textPrimary">{currentTenant.emergencyContact.phone}</span></p>
            <p><strong>關係:</strong> <span className="text-textPrimary">{currentTenant.emergencyContact.relationship}</span></p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TenantManagement;