import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Property, PropertyRepairRecord } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button, TextArea } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_PROPERTY } from '../constants.tsx';

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useLocalStorage<Property[]>('properties', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<Property>(DEFAULT_PROPERTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentRepairRecord, setCurrentRepairRecord] = useState<Partial<PropertyRepairRecord>>({});
  const [showAddRepairModal, setShowAddRepairModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal(); 
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  const openModal = (property?: Property) => {
    if (property) {
      setCurrentProperty({...property, assetInventory: Array.isArray(property.assetInventory) ? property.assetInventory : []});
      setEditingId(property.id);
    } else {
      setCurrentProperty(DEFAULT_PROPERTY);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const openViewModal = (property: Property) => {
    setCurrentProperty(property);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setShowAddRepairModal(false);
    setCurrentProperty(DEFAULT_PROPERTY);
    setCurrentRepairRecord({});
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'assetInventory') {
      setCurrentProperty(prev => ({ ...prev, assetInventory: value.split('\n').filter(item => item.trim() !== '') }));
    } else if (name === 'sizeInPings') {
      setCurrentProperty(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
     else {
      setCurrentProperty(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRepairRecordChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentRepairRecord(prev => ({...prev, [name]: name === 'cost' ? parseFloat(value) : value }));
  };
  
  const addRepairRecordToProperty = () => {
    if (!currentRepairRecord.requestDate || !currentRepairRecord.itemDescription) {
        alert("維修申請日期和維修項目為必填");
        return;
    }
    const newRecord: PropertyRepairRecord = {
        id: crypto.randomUUID(),
        requestDate: currentRepairRecord.requestDate || '',
        itemDescription: currentRepairRecord.itemDescription || '',
        vendorStaff: currentRepairRecord.vendorStaff || '',
        cost: currentRepairRecord.cost || 0,
        completionDate: currentRepairRecord.completionDate || '',
        notes: currentRepairRecord.notes || '',
    };
    setCurrentProperty(prev => ({
        ...prev,
        repairHistory: [...(prev.repairHistory || []), newRecord]
    }));
    setCurrentRepairRecord({}); 
    setShowAddRepairModal(false);
  };

  const removeRepairRecordFromProperty = (recordId: string) => {
    setCurrentProperty(prev => ({
        ...prev,
        repairHistory: prev.repairHistory.filter(r => r.id !== recordId)
    }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const propertyToSave: Property = {
      ...currentProperty,
      repairHistory: currentProperty.repairHistory || [] 
    };

    if (editingId) {
      setProperties(properties.map(p => p.id === editingId ? { ...propertyToSave, id: editingId } : p));
    } else {
      setProperties([...properties, { ...propertyToSave, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此物件嗎？相關合約和資產可能需要手動更新。')) {
      setProperties(properties.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-6 bg-transparent">
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增物件
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">物件編號</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">地址</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">坪數</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {properties.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-textSecondary">尚無物件資料</td></tr>
            )}
            {properties.map(prop => (
              <tr key={prop.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{prop.propertyInternalId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{prop.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{prop.sizeInPings} 坪</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(prop)} variant="neutral" size="sm" className="!p-1.5" title="查看"><ViewIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => openModal(prop)} variant="neutral" size="sm" className="!p-1.5" title="編輯"><EditIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(prop.id)} variant="danger" size="sm" className="!p-1.5" title="刪除"><DeleteIcon className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯物件' : '新增物件'} size="2xl">
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2 text-textSecondary">
            <Input label="物件編號 (2-1)" name="propertyInternalId" value={currentProperty.propertyInternalId} onChange={handleInputChange} required />
            <Input label="物件地址 (2-2)" name="address" value={currentProperty.address} onChange={handleInputChange} required />
            <Input label="物件坪數 (2-3)" name="sizeInPings" type="number" step="0.01" value={currentProperty.sizeInPings} onChange={handleInputChange} required />
            <TextArea label="物件資產明細 (2-4, 每行一項)" name="assetInventory" value={currentProperty.assetInventory.join('\n')} onChange={handleInputChange} placeholder="例如：洗衣機、冰箱、書桌..." />
            <TextArea label="物件特色 (2-5)" name="features" value={currentProperty.features} onChange={handleInputChange} placeholder="例如：有陽台、近捷運站、可養寵物..."/>

            <h3 className="text-md font-semibold pt-3 border-t border-borderLight mt-4 text-textPrimary">物件維修紀錄 (2-6)</h3>
            <Button type="button" variant="secondary" size="sm" onClick={() => {setCurrentRepairRecord({}); setShowAddRepairModal(true);}}>
              <PlusIcon className="w-4 h-4 mr-1 inline"/> 新增維修紀錄
            </Button>
            <div className="mt-2 space-y-2">
              {(currentProperty.repairHistory || []).length === 0 && <p className="text-xs text-textSecondary">尚無維修紀錄</p>}
              {(currentProperty.repairHistory || []).map(record => (
                <div key={record.id} className="p-3 border border-borderLight rounded-md bg-slate-50 text-xs">
                  <p><strong className="text-textPrimary">日期:</strong> {record.requestDate} - {record.completionDate}</p>
                  <p><strong className="text-textPrimary">項目:</strong> {record.itemDescription}</p>
                  <p><strong className="text-textPrimary">廠商/人員:</strong> {record.vendorStaff}</p>
                  <p><strong className="text-textPrimary">費用:</strong> ${record.cost}</p>
                  {record.notes && <p><strong className="text-textPrimary">備註:</strong> {record.notes}</p>}
                  <Button type="button" variant="danger" size="sm" className="mt-1 text-xs py-0.5 px-1.5" onClick={() => removeRepairRecordFromProperty(record.id)}>移除</Button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-surface py-3 border-t border-borderLight">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增物件'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showAddRepairModal && (
         <Modal isOpen={showAddRepairModal} onClose={() => setShowAddRepairModal(false)} title="新增維修紀錄" size="lg">
            <div className="space-y-3 text-textSecondary">
                <Input label="維修申請日期" name="requestDate" type="date" value={currentRepairRecord.requestDate || ''} onChange={handleRepairRecordChange} required />
                <TextArea label="維修項目/工作內容" name="itemDescription" value={currentRepairRecord.itemDescription || ''} onChange={handleRepairRecordChange} required />
                <Input label="維修廠商/人員" name="vendorStaff" value={currentRepairRecord.vendorStaff || ''} onChange={handleRepairRecordChange} />
                <Input label="維修費用" name="cost" type="number" value={currentRepairRecord.cost || 0} onChange={handleRepairRecordChange} />
                <Input label="維修完成日期" name="completionDate" type="date" value={currentRepairRecord.completionDate || ''} onChange={handleRepairRecordChange} />
                <TextArea label="備註" name="notes" value={currentRepairRecord.notes || ''} onChange={handleRepairRecordChange} />
                <div className="flex justify-end space-x-2 pt-3">
                    <Button variant="neutral" onClick={() => setShowAddRepairModal(false)}>取消</Button>
                    <Button variant="primary" onClick={addRepairRecordToProperty}>加入紀錄</Button>
                </div>
            </div>
        </Modal>
      )}

      {isViewModalOpen && currentProperty && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title={`查看物件: ${currentProperty.propertyInternalId}`} size="xl">
          <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto p-1 text-textSecondary">
            <p><strong>物件編號:</strong> <span className="text-textPrimary">{currentProperty.propertyInternalId}</span></p>
            <p><strong>地址:</strong> <span className="text-textPrimary">{currentProperty.address}</span></p>
            <p><strong>坪數:</strong> <span className="text-textPrimary">{currentProperty.sizeInPings} 坪</span></p>
            <hr className="my-2 border-borderLight"/>
            <h4 className="font-semibold text-textPrimary">物件資產明細:</h4>
            {currentProperty.assetInventory && currentProperty.assetInventory.length > 0 ? (
              <ul className="list-disc list-inside ml-4 text-textPrimary">
                {currentProperty.assetInventory.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            ) : <p>無資產明細</p>}
            <hr className="my-2 border-borderLight"/>
            <h4 className="font-semibold text-textPrimary">物件特色:</h4>
            <p className="whitespace-pre-wrap text-textPrimary">{currentProperty.features || '無特色說明'}</p>
            <hr className="my-2 border-borderLight"/>
            <h4 className="font-semibold text-textPrimary">物件維修紀錄:</h4>
            {(currentProperty.repairHistory || []).length === 0 ? <p>尚無維修紀錄</p> : (
                (currentProperty.repairHistory || []).map(record => (
                <div key={record.id} className="p-3 border border-borderLight rounded-md bg-slate-50 text-xs mb-2">
                    <p><strong className="text-textPrimary">申請/完成日期:</strong> {record.requestDate} / {record.completionDate || '未完成'}</p>
                    <p><strong className="text-textPrimary">項目:</strong> {record.itemDescription}</p>
                    <p><strong className="text-textPrimary">廠商/人員:</strong> {record.vendorStaff || '-'}</p>
                    <p><strong className="text-textPrimary">費用:</strong> {record.cost ? `$${record.cost}` : '-'}</p>
                    {record.notes && <p><strong className="text-textPrimary">備註:</strong> {record.notes}</p>}
                </div>
                ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyManagement;