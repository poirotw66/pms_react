import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TenantRepairRequest, Tenant, Property, RepairRequestStatus } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, TextArea } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_REPAIR_REQUEST } from '../constants.tsx';

const RepairRequestManagement: React.FC = () => {
  const [repairRequests, setRepairRequests] = useLocalStorage<TenantRepairRequest[]>('repairRequests', []);
  const [tenants] = useLocalStorage<Tenant[]>('tenants', []);
  const [properties] = useLocalStorage<Property[]>('properties', []);
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <div className="p-6 bg-transparent">
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增報修
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">報修日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">物件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">承租人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">狀態</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {repairRequests.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-textSecondary">尚無報修請求</td></tr>
            )}
            {repairRequests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{req.requestDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary truncate max-w-xs" title={getPropertyAddress(req.propertyId)}>{getPropertyAddress(req.propertyId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{getTenantName(req.tenantId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        req.status === RepairRequestStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                        req.status === RepairRequestStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {req.status}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(req)} variant="neutral" size="sm" className="!p-1.5" title="查看"><ViewIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => openModal(req)} variant="neutral" size="sm" className="!p-1.5" title="編輯"><EditIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(req.id)} variant="danger" size="sm" className="!p-1.5" title="刪除"><DeleteIcon className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯報修請求' : '新增報修請求'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2 text-textSecondary">
            <Input label="報修日期 (4-1)" name="requestDate" type="date" value={currentRequest.requestDate} onChange={handleInputChange} required />
            <Select label="物件" name="propertyId" value={currentRequest.propertyId} onChange={handleInputChange} options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} required />
            <Select label="承租人" name="tenantId" value={currentRequest.tenantId} onChange={handleInputChange} options={tenants.map(t => ({ value: t.id, label: t.name }))} required />
            <TextArea label="報修內容 (4-2)" name="description" value={currentRequest.description} onChange={handleInputChange} required placeholder="詳細描述損壞情況、地點等"/>
            <Select label="狀態" name="status" value={currentRequest.status} onChange={handleInputChange} options={statusOptions} required />

            {currentRequest.status === RepairRequestStatus.COMPLETED && (
              <div className="p-4 border border-borderLight rounded-md mt-3 bg-slate-50">
                <h3 className="text-md font-semibold mb-3 text-textPrimary">結案方式及費用 (4-3)</h3>
                <TextArea label="修繕方式" name="resolutionDetails.method" value={currentRequest.resolutionDetails?.method || ''} onChange={handleInputChange} />
                <Input label="修繕廠商/人員" name="resolutionDetails.vendor" value={currentRequest.resolutionDetails?.vendor || ''} onChange={handleInputChange} />
                <Input label="費用明細" name="resolutionDetails.cost" type="number" value={currentRequest.resolutionDetails?.cost === undefined ? '' : String(currentRequest.resolutionDetails.cost)} onChange={handleInputChange} />
                <Input label="結案日期 (4-4)" name="resolutionDetails.completionDate" type="date" value={currentRequest.resolutionDetails?.completionDate || ''} onChange={handleInputChange} />
                <TextArea label="備註" name="resolutionDetails.notes" value={currentRequest.resolutionDetails?.notes || ''} onChange={handleInputChange} />
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-surface py-3 border-t border-borderLight">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增報修'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isViewModalOpen && currentRequest && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="查看報修請求" size="lg">
          <div className="space-y-3 text-sm text-textSecondary">
            <p><strong>報修日期:</strong> <span className="text-textPrimary">{currentRequest.requestDate}</span></p>
            <p><strong>物件:</strong> <span className="text-textPrimary">{getPropertyAddress(currentRequest.propertyId)}</span></p>
            <p><strong>承租人:</strong> <span className="text-textPrimary">{getTenantName(currentRequest.tenantId)}</span></p>
            <p><strong>報修內容:</strong> <span className="whitespace-pre-wrap text-textPrimary">{currentRequest.description}</span></p>
            <p><strong>狀態:</strong> <span className="text-textPrimary">{currentRequest.status}</span></p>
            {currentRequest.status === RepairRequestStatus.COMPLETED && currentRequest.resolutionDetails && (
              <div className="mt-3 pt-3 border-t border-borderLight">
                <h4 className="font-semibold text-textPrimary mb-1">結案詳情:</h4>
                <p><strong>修繕方式:</strong> <span className="text-textPrimary">{currentRequest.resolutionDetails.method}</span></p>
                <p><strong>廠商/人員:</strong> <span className="text-textPrimary">{currentRequest.resolutionDetails.vendor || '-'}</span></p>
                <p><strong>費用:</strong> <span className="text-textPrimary">${currentRequest.resolutionDetails.cost === undefined ? 0 : currentRequest.resolutionDetails.cost}</span></p>
                <p><strong>結案日期:</strong> <span className="text-textPrimary">{currentRequest.resolutionDetails.completionDate || '-'}</span></p>
                {currentRequest.resolutionDetails.notes && <p><strong>備註:</strong> <span className="text-textPrimary">{currentRequest.resolutionDetails.notes}</span></p>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RepairRequestManagement;