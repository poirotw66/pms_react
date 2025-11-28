import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tenant } from '../types.ts';
import { useTenants } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, FormGroup, Card } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_TENANT, UsersIcon } from '../constants.tsx';

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useTenants();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(DEFAULT_TENANT);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // Filter tenants based on search
  const filteredTenants = tenants.filter(tenant => 
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.phone.includes(searchTerm) ||
    tenant.idNumber.includes(searchTerm)
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="搜尋承租人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增承租人
        </Button>
      </div>

      {/* Table Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">承租人</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">身份證字號</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">連絡電話</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">工作資訊</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                        <UsersIcon className="w-8 h-8 text-surface-600" />
                      </div>
                      <p className="text-surface-400 mb-1">尚無承租人資料</p>
                      <p className="text-xs text-surface-500">點擊「新增承租人」按鈕開始</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant, index) => (
                  <tr 
                    key={tenant.id} 
                    className="group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium text-sm">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-surface-500 md:hidden">{tenant.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400 hidden md:table-cell">
                      {tenant.idNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400 hidden sm:table-cell">
                      {tenant.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400 hidden lg:table-cell">
                      {tenant.workDetails.job ? (
                        <span>{tenant.workDetails.job} @ {tenant.workDetails.company}</span>
                      ) : (
                        <span className="text-surface-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openViewModal(tenant)} 
                          className="icon-btn icon-btn-primary"
                          title="查看"
                        >
                          <ViewIcon className="w-4 h-4 text-surface-400" />
                        </button>
                        <button 
                          onClick={() => openModal(tenant)} 
                          className="icon-btn icon-btn-primary"
                          title="編輯"
                        >
                          <EditIcon className="w-4 h-4 text-surface-400" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tenant.id)} 
                          className="icon-btn icon-btn-danger"
                          title="刪除"
                        >
                          <DeleteIcon className="w-4 h-4 text-surface-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        {filteredTenants.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              共 <span className="text-white font-medium">{filteredTenants.length}</span> 筆資料
            </p>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          title={editingId ? '編輯承租人' : '新增承租人'} 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="基本資訊">
              <Input 
                label="承租人姓名" 
                name="name" 
                value={currentTenant.name} 
                onChange={handleInputChange} 
                placeholder="請輸入姓名"
                required 
              />
              <Input 
                label="身份證字號" 
                name="idNumber" 
                value={currentTenant.idNumber} 
                onChange={handleInputChange} 
                placeholder="請輸入身份證字號"
                required 
              />
              <Input 
                label="連絡電話" 
                name="phone" 
                type="tel" 
                value={currentTenant.phone} 
                onChange={handleInputChange} 
                placeholder="請輸入電話號碼"
                required 
              />
            </FormGroup>
            
            <FormGroup title="工作資訊">
              <Input 
                label="職業" 
                name="workDetails.job" 
                value={currentTenant.workDetails.job} 
                onChange={handleInputChange}
                placeholder="例：工程師、教師"
              />
              <Input 
                label="任職公司" 
                name="workDetails.company" 
                value={currentTenant.workDetails.company} 
                onChange={handleInputChange}
                placeholder="請輸入公司名稱"
              />
              <Input 
                label="職位" 
                name="workDetails.position" 
                value={currentTenant.workDetails.position} 
                onChange={handleInputChange}
                placeholder="請輸入職位"
              />
            </FormGroup>

            <FormGroup title="緊急聯絡人">
              <Input 
                label="姓名" 
                name="emergencyContact.name" 
                value={currentTenant.emergencyContact.name} 
                onChange={handleInputChange}
                placeholder="請輸入緊急聯絡人姓名"
                required
              />
              <Input 
                label="電話" 
                name="emergencyContact.phone" 
                type="tel" 
                value={currentTenant.emergencyContact.phone} 
                onChange={handleInputChange}
                placeholder="請輸入緊急聯絡人電話"
                required
              />
              <Input 
                label="關係" 
                name="emergencyContact.relationship" 
                value={currentTenant.emergencyContact.relationship} 
                onChange={handleInputChange}
                placeholder="例：父母、配偶、朋友"
                required
              />
            </FormGroup>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">
                {editingId ? '儲存變更' : '新增承租人'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentTenant && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="承租人資料" size="lg">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-2xl">
                {currentTenant.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{currentTenant.name}</h3>
                <p className="text-sm text-surface-400">{currentTenant.phone}</p>
              </div>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">身份證字號</p>
                <p className="text-sm font-medium text-white">{currentTenant.idNumber}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">連絡電話</p>
                <p className="text-sm font-medium text-white">{currentTenant.phone}</p>
              </div>
            </div>
            
            {/* Work Info */}
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                工作資訊
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">職業</p>
                  <p className="text-sm font-medium text-white">{currentTenant.workDetails.job || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">任職公司</p>
                  <p className="text-sm font-medium text-white">{currentTenant.workDetails.company || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">職位</p>
                  <p className="text-sm font-medium text-white">{currentTenant.workDetails.position || '-'}</p>
                </div>
              </div>
            </div>
            
            {/* Emergency Contact */}
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                緊急聯絡人
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">姓名</p>
                  <p className="text-sm font-medium text-white">{currentTenant.emergencyContact.name}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">電話</p>
                  <p className="text-sm font-medium text-white">{currentTenant.emergencyContact.phone}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">關係</p>
                  <p className="text-sm font-medium text-white">{currentTenant.emergencyContact.relationship}</p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentTenant); }}>
                <EditIcon className="w-4 h-4" />
                編輯資料
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TenantManagement;
