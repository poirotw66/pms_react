import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PotentialTenant } from '../types.ts';
import { usePotentialTenants } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, TextArea, FormGroup, Card } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_POTENTIAL_TENANT, UserGroupIcon } from '../constants.tsx';

const PotentialTenantManagement: React.FC = () => {
  const [potentialTenants, setPotentialTenants] = usePotentialTenants();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPotentialTenant, setCurrentPotentialTenant] = useState<PotentialTenant>(DEFAULT_POTENTIAL_TENANT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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

  // Get unique tracking statuses
  const trackingStatuses = [...new Set(potentialTenants.map(pt => pt.trackingStatus).filter(Boolean))];

  // Get status badge style
  const getStatusBadge = (status?: string) => {
    if (!status) return 'badge-info';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('成交') || lowerStatus.includes('已簽約')) return 'badge-success';
    if (lowerStatus.includes('考慮') || lowerStatus.includes('已看房')) return 'badge-warning';
    if (lowerStatus.includes('放棄') || lowerStatus.includes('已取消')) return 'badge-danger';
    return 'badge-info';
  };

  // Filter potential tenants
  const filteredTenants = potentialTenants.filter(pt => {
    const matchesSearch = 
      pt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pt.phone.includes(searchTerm) ||
      pt.requirements.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || pt.trackingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="搜尋客戶..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          {trackingStatuses.length > 0 && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="">全部狀態</option>
              {trackingStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增潛在客戶
        </Button>
      </div>

      {/* Cards Grid */}
      {filteredTenants.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
              <UserGroupIcon className="w-8 h-8 text-surface-600" />
            </div>
            <p className="text-surface-400 mb-1">尚無潛在客戶資料</p>
            <p className="text-xs text-surface-500">點擊「新增潛在客戶」按鈕開始</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTenants.map((pt, index) => (
            <Card 
              key={pt.id} 
              padding="none" 
              className="overflow-hidden animate-fade-in hover:border-primary-500/30 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-info-500 to-info-700 flex items-center justify-center text-white font-semibold text-lg">
                      {pt.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{pt.name}</h3>
                      <p className="text-xs text-surface-500">{pt.phone}</p>
                    </div>
                  </div>
                  {pt.trackingStatus && (
                    <span className={`badge ${getStatusBadge(pt.trackingStatus)}`}>
                      {pt.trackingStatus}
                    </span>
                  )}
                </div>
                
                {/* Requirements */}
                <div className="mb-4">
                  <p className="text-xs text-surface-500 mb-1">需求</p>
                  <p className="text-sm text-surface-300 line-clamp-2">{pt.requirements || '-'}</p>
                </div>
                
                {/* Info */}
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  {pt.expectedMoveInDate && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      {pt.expectedMoveInDate}
                    </span>
                  )}
                  {pt.workInfo && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                      </svg>
                      {pt.workInfo}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button onClick={() => openViewModal(pt)} className="icon-btn icon-btn-primary" title="查看">
                  <ViewIcon className="w-4 h-4 text-surface-400" />
                </button>
                <button onClick={() => openModal(pt)} className="icon-btn icon-btn-primary" title="編輯">
                  <EditIcon className="w-4 h-4 text-surface-400" />
                </button>
                <button onClick={() => handleDelete(pt.id)} className="icon-btn icon-btn-danger" title="刪除">
                  <DeleteIcon className="w-4 h-4 text-surface-400" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredTenants.length > 0 && (
        <div className="mt-6 text-center text-sm text-surface-500">
          共 <span className="text-white font-medium">{filteredTenants.length}</span> 位潛在客戶
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯潛在客戶' : '新增潛在客戶'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="基本資訊">
              <Input 
                label="客戶姓名" 
                name="name" 
                value={currentPotentialTenant.name} 
                onChange={handleInputChange} 
                placeholder="請輸入客戶姓名"
                required 
              />
              <Input 
                label="聯絡電話" 
                name="phone" 
                type="tel" 
                value={currentPotentialTenant.phone} 
                onChange={handleInputChange} 
                placeholder="請輸入電話號碼"
                required 
              />
              <Input 
                label="工作內容" 
                name="workInfo" 
                value={currentPotentialTenant.workInfo} 
                onChange={handleInputChange} 
                placeholder="例：工程師、自由業"
              />
            </FormGroup>

            <FormGroup title="租屋需求">
              <TextArea 
                label="客戶需求" 
                name="requirements" 
                value={currentPotentialTenant.requirements} 
                onChange={handleInputChange} 
                placeholder="物件類型、區域、預算、房間數、特殊需求等"
              />
              <Input 
                label="預計入住日期" 
                name="expectedMoveInDate" 
                type="date" 
                value={currentPotentialTenant.expectedMoveInDate || ''} 
                onChange={handleInputChange} 
              />
            </FormGroup>

            <FormGroup title="追蹤資訊">
              <Input 
                label="追蹤狀態" 
                name="trackingStatus" 
                value={currentPotentialTenant.trackingStatus || ''} 
                onChange={handleInputChange} 
                placeholder="例如：已聯繫、已看房、考慮中"
              />
              <TextArea 
                label="看房紀錄/備註" 
                name="viewingNotes" 
                value={currentPotentialTenant.viewingNotes || ''} 
                onChange={handleInputChange}
                placeholder="記錄看房日期、反饋、後續追蹤事項等"
              />
            </FormGroup>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增客戶'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentPotentialTenant && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="客戶詳情" size="md">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-info-500 to-info-700 flex items-center justify-center text-white font-bold text-xl">
                {currentPotentialTenant.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{currentPotentialTenant.name}</h3>
                <p className="text-sm text-surface-400">{currentPotentialTenant.phone}</p>
              </div>
              {currentPotentialTenant.trackingStatus && (
                <span className={`badge ${getStatusBadge(currentPotentialTenant.trackingStatus)} ml-auto`}>
                  {currentPotentialTenant.trackingStatus}
                </span>
              )}
            </div>
            
            {/* Details */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">工作內容</p>
                <p className="text-sm font-medium text-white">{currentPotentialTenant.workInfo || '-'}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">客戶需求</p>
                <p className="text-sm text-surface-300 whitespace-pre-wrap">{currentPotentialTenant.requirements || '-'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">預計入住日期</p>
                  <p className="text-sm font-medium text-white">{currentPotentialTenant.expectedMoveInDate || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">追蹤狀態</p>
                  <p className="text-sm font-medium text-white">{currentPotentialTenant.trackingStatus || '-'}</p>
                </div>
              </div>
              
              {currentPotentialTenant.viewingNotes && (
                <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                  <p className="text-xs text-surface-500 mb-1">看房紀錄/備註</p>
                  <p className="text-sm text-surface-300 whitespace-pre-wrap">{currentPotentialTenant.viewingNotes}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentPotentialTenant); }}>
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

export default PotentialTenantManagement;
