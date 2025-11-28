import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TenantRepairRequest, RepairRequestStatus } from '../types.ts';
import { useRepairRequests, useTenants, useProperties } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, TextArea, FormGroup, Card } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_REPAIR_REQUEST, WrenchScrewdriverIcon } from '../constants.tsx';

const RepairRequestManagement: React.FC = () => {
  const [repairRequests, setRepairRequests] = useRepairRequests();
  const [tenants] = useTenants();
  const [properties] = useProperties();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<TenantRepairRequest>(DEFAULT_REPAIR_REQUEST);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const statusOptions = Object.values(RepairRequestStatus).map(s => ({ value: s, label: s }));

  const openModal = (request?: TenantRepairRequest) => {
    if (request) {
      setCurrentRequest(request);
      setEditingId(request.id);
    } else {
      setCurrentRequest({...DEFAULT_REPAIR_REQUEST, requestDate: new Date().toISOString().split('T')[0]});
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const openViewModal = (request: TenantRepairRequest) => {
    setCurrentRequest(request);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setCurrentRequest(DEFAULT_REPAIR_REQUEST);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('resolutionDetails.')) {
      const fieldKey = name.split('.')[1] as keyof NonNullable<TenantRepairRequest['resolutionDetails']>;
      setCurrentRequest(prev => {
        const baseDetails = prev.resolutionDetails || { method: '', vendor: '', cost: undefined, completionDate: '', notes: '' };
        
        let newFieldValue: string | number | undefined = value;
        if (fieldKey === 'cost') {
          newFieldValue = parseFloat(value);
          if (isNaN(newFieldValue as number)) {
            newFieldValue = undefined; 
          }
        }

        const updatedDetails: NonNullable<TenantRepairRequest['resolutionDetails']> = {
          ...baseDetails,
          [fieldKey]: newFieldValue,
        };
        if (fieldKey === 'method' && typeof newFieldValue !== 'string') updatedDetails.method = String(newFieldValue ?? '');

        return {
          ...prev,
          resolutionDetails: updatedDetails,
        };
      });
    } else {
      setCurrentRequest(prev => ({ ...prev, [name]: value as any }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRequest.propertyId || !currentRequest.tenantId || !currentRequest.description) {
      alert("請選擇物件、承租人並填寫報修內容。");
      return;
    }

    let finalResolutionDetails = currentRequest.resolutionDetails;
    if (currentRequest.status === RepairRequestStatus.COMPLETED && currentRequest.resolutionDetails) {
      if(!currentRequest.resolutionDetails.method) {
        finalResolutionDetails = { ...currentRequest.resolutionDetails, method: currentRequest.resolutionDetails.method || "未指定"};
      }
    }

    const requestToSave: TenantRepairRequest = {
      ...currentRequest,
      resolutionDetails: currentRequest.status === RepairRequestStatus.COMPLETED ? finalResolutionDetails : undefined,
    };

    if (editingId) {
      setRepairRequests(repairRequests.map(r => r.id === editingId ? { ...requestToSave, id: editingId } : r));
    } else {
      setRepairRequests([...repairRequests, { ...requestToSave, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此報修請求嗎？')) {
      setRepairRequests(repairRequests.filter(r => r.id !== id));
    }
  };

  const getStatusBadge = (status: RepairRequestStatus) => {
    switch (status) {
      case RepairRequestStatus.COMPLETED:
        return 'badge-success';
      case RepairRequestStatus.IN_PROGRESS:
        return 'badge-warning';
      default:
        return 'badge-danger';
    }
  };

  // Filter repair requests
  const filteredRequests = repairRequests.filter(req => {
    const matchesSearch = 
      getPropertyAddress(req.propertyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTenantName(req.tenantId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || req.status === statusFilter;
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
              placeholder="搜尋報修..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
          >
            <option value="">全部狀態</option>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增報修
        </Button>
      </div>

      {/* Table Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">報修日期</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">物件</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">承租人</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">報修內容</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                        <WrenchScrewdriverIcon className="w-8 h-8 text-surface-600" />
                      </div>
                      <p className="text-surface-400 mb-1">尚無報修請求</p>
                      <p className="text-xs text-surface-500">點擊「新增報修」按鈕開始</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, index) => (
                  <tr 
                    key={req.id} 
                    className="group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          req.status === RepairRequestStatus.COMPLETED ? 'bg-primary-500/20' :
                          req.status === RepairRequestStatus.IN_PROGRESS ? 'bg-warning-500/20' :
                          'bg-danger-500/20'
                        }`}>
                          <WrenchScrewdriverIcon className={`w-5 h-5 ${
                            req.status === RepairRequestStatus.COMPLETED ? 'text-primary-400' :
                            req.status === RepairRequestStatus.IN_PROGRESS ? 'text-warning-400' :
                            'text-danger-400'
                          }`} />
                        </div>
                        <span className="text-sm text-white">{req.requestDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400 hidden lg:table-cell max-w-xs truncate">
                      {getPropertyAddress(req.propertyId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400">
                      {getTenantName(req.tenantId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400 hidden md:table-cell max-w-xs truncate">
                      {req.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getStatusBadge(req.status)}`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openViewModal(req)} className="icon-btn icon-btn-primary" title="查看">
                          <ViewIcon className="w-4 h-4 text-surface-400" />
                        </button>
                        <button onClick={() => openModal(req)} className="icon-btn icon-btn-primary" title="編輯">
                          <EditIcon className="w-4 h-4 text-surface-400" />
                        </button>
                        <button onClick={() => handleDelete(req.id)} className="icon-btn icon-btn-danger" title="刪除">
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
        
        {filteredRequests.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              共 <span className="text-white font-medium">{filteredRequests.length}</span> 筆資料
            </p>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯報修請求' : '新增報修請求'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="報修資訊">
              <Input label="報修日期" name="requestDate" type="date" value={currentRequest.requestDate} onChange={handleInputChange} required />
              <Select label="物件" name="propertyId" value={currentRequest.propertyId} onChange={handleInputChange} options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} required />
              <Select label="承租人" name="tenantId" value={currentRequest.tenantId} onChange={handleInputChange} options={tenants.map(t => ({ value: t.id, label: t.name }))} required />
              <TextArea label="報修內容" name="description" value={currentRequest.description} onChange={handleInputChange} placeholder="詳細描述損壞情況、地點等" required />
              <Select label="狀態" name="status" value={currentRequest.status} onChange={handleInputChange} options={statusOptions} required />
            </FormGroup>

            {currentRequest.status === RepairRequestStatus.COMPLETED && (
              <FormGroup title="結案資訊">
                <TextArea label="修繕方式" name="resolutionDetails.method" value={currentRequest.resolutionDetails?.method || ''} onChange={handleInputChange} placeholder="描述修繕方式" />
                <Input label="修繕廠商/人員" name="resolutionDetails.vendor" value={currentRequest.resolutionDetails?.vendor || ''} onChange={handleInputChange} placeholder="例：XXX水電行" />
                <Input label="費用 (NT$)" name="resolutionDetails.cost" type="number" value={currentRequest.resolutionDetails?.cost === undefined ? '' : String(currentRequest.resolutionDetails.cost)} onChange={handleInputChange} placeholder="請輸入費用" />
                <Input label="結案日期" name="resolutionDetails.completionDate" type="date" value={currentRequest.resolutionDetails?.completionDate || ''} onChange={handleInputChange} />
                <TextArea label="備註" name="resolutionDetails.notes" value={currentRequest.resolutionDetails?.notes || ''} onChange={handleInputChange} placeholder="其他備註事項" />
              </FormGroup>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增報修'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentRequest && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="報修詳情" size="lg">
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className={`badge ${getStatusBadge(currentRequest.status)} !text-sm !px-4 !py-1.5`}>
                {currentRequest.status}
              </span>
              <span className="text-sm text-surface-500">{currentRequest.requestDate}</span>
            </div>
            
            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">物件</p>
                <p className="text-sm font-medium text-white">{getPropertyAddress(currentRequest.propertyId)}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">承租人</p>
                <p className="text-sm font-medium text-white">{getTenantName(currentRequest.tenantId)}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                報修內容
              </h4>
              <p className="text-sm text-surface-300 whitespace-pre-wrap p-4 rounded-xl bg-surface-800/50 border border-white/5">
                {currentRequest.description}
              </p>
            </div>
            
            {currentRequest.status === RepairRequestStatus.COMPLETED && currentRequest.resolutionDetails && (
              <div>
                <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                  結案詳情
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                    <p className="text-xs text-surface-500 mb-1">修繕方式</p>
                    <p className="text-sm font-medium text-white">{currentRequest.resolutionDetails.method || '-'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                    <p className="text-xs text-surface-500 mb-1">廠商/人員</p>
                    <p className="text-sm font-medium text-white">{currentRequest.resolutionDetails.vendor || '-'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                    <p className="text-xs text-surface-500 mb-1">費用</p>
                    <p className="text-sm font-medium text-white">${currentRequest.resolutionDetails.cost?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                    <p className="text-xs text-surface-500 mb-1">結案日期</p>
                    <p className="text-sm font-medium text-white">{currentRequest.resolutionDetails.completionDate || '-'}</p>
                  </div>
                </div>
                {currentRequest.resolutionDetails.notes && (
                  <div className="mt-4 p-4 rounded-xl bg-surface-800/50 border border-white/5">
                    <p className="text-xs text-surface-500 mb-1">備註</p>
                    <p className="text-sm text-surface-300">{currentRequest.resolutionDetails.notes}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentRequest); }}>
                <EditIcon className="w-4 h-4" />
                編輯報修
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RepairRequestManagement;
