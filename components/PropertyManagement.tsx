import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Property, PropertyRepairRecord } from '../types.ts';
import { useProperties } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, TextArea, FormGroup, Card, Checkbox } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_PROPERTY, BuildingOfficeIcon, WrenchScrewdriverIcon, EQUIPMENT_OPTIONS, FURNITURE_OPTIONS, LIVING_FACILITIES_OPTIONS, convertAssetInventory } from '../constants.tsx';

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useProperties();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<Property>(DEFAULT_PROPERTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

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
      let assetInventory = Array.isArray(property.assetInventory) ? property.assetInventory : [];
      
      // Convert old format if needed (contains items with separators)
      const needsConversion = assetInventory.some(item => 
        typeof item === 'string' && (item.includes('.') || item.includes(',') || item.includes('、'))
      );
      
      if (needsConversion) {
        assetInventory = convertAssetInventory(assetInventory);
      }
      
      setCurrentProperty({...property, assetInventory});
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
    if (name === 'sizeInPings') {
      // Allow empty string for user input, only convert to number when value exists
      if (value === '') {
        setCurrentProperty(prev => ({ ...prev, [name]: 0 }));
      } else {
        const numValue = parseFloat(value);
        setCurrentProperty(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
      }
    } else {
      setCurrentProperty(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAssetInventoryChange = (item: string, checked: boolean) => {
    setCurrentProperty(prev => {
      const currentInventory = prev.assetInventory || [];
      if (checked) {
        // Add item if not already present
        if (!currentInventory.includes(item)) {
          return { ...prev, assetInventory: [...currentInventory, item] };
        }
      } else {
        // Remove item
        return { ...prev, assetInventory: currentInventory.filter(i => i !== item) };
      }
      return prev;
    });
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

  // Filter properties
  const filteredProperties = properties.filter(prop => 
    prop.propertyInternalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="搜尋物件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增物件
        </Button>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-surface-600" />
            </div>
            <p className="text-surface-400 mb-1">尚無物件資料</p>
            <p className="text-xs text-surface-500">點擊「新增物件」按鈕開始</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProperties.map((prop, index) => (
            <Card 
              key={prop.id} 
              padding="none" 
              className="overflow-hidden animate-fade-in hover:border-primary-500/30 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{prop.propertyInternalId}</h3>
                      <span className="badge badge-info text-xs">{prop.sizeInPings} 坪</span>
                    </div>
                  </div>
                </div>
                
                {/* Address */}
                <p className="text-sm text-surface-400 mb-4 line-clamp-2">{prop.address}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V7.5" />
                    </svg>
                    {prop.assetInventory?.length || 0} 項資產
                  </span>
                  <span className="flex items-center gap-1">
                    <WrenchScrewdriverIcon className="w-4 h-4" />
                    {prop.repairHistory?.length || 0} 筆維修
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button onClick={() => openViewModal(prop)} className="icon-btn icon-btn-primary" title="查看">
                  <ViewIcon className="w-4 h-4 text-surface-400" />
                </button>
                <button onClick={() => openModal(prop)} className="icon-btn icon-btn-primary" title="編輯">
                  <EditIcon className="w-4 h-4 text-surface-400" />
                </button>
                <button onClick={() => handleDelete(prop.id)} className="icon-btn icon-btn-danger" title="刪除">
                  <DeleteIcon className="w-4 h-4 text-surface-400" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯物件' : '新增物件'} size="2xl">
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="基本資訊">
              <Input label="物件編號" name="propertyInternalId" value={currentProperty.propertyInternalId} onChange={handleInputChange} placeholder="例：A001" required />
              <Input label="物件地址" name="address" value={currentProperty.address} onChange={handleInputChange} placeholder="請輸入完整地址" required />
              <Input label="物件坪數" name="sizeInPings" type="number" step="0.01" value={currentProperty.sizeInPings === 0 ? '' : String(currentProperty.sizeInPings)} onChange={handleInputChange} placeholder="請輸入坪數" required />
            </FormGroup>

            <FormGroup title="物件詳情">
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-primary-400 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                  1.物件資產明細-提供勾選設備及家具內容
                </h4>
                
                {/* Equipment Section */}
                <div className="mb-6">
                  <h5 className="text-xs font-medium text-surface-300 mb-3">提供設備</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-3">
                    {EQUIPMENT_OPTIONS.map((option) => (
                      <Checkbox
                        key={option}
                        id={`equipment-${option}`}
                        label={option}
                        checked={currentProperty.assetInventory?.includes(option) || false}
                        onChange={(e) => handleAssetInventoryChange(option, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>

                {/* Furniture Section */}
                <div className="mb-6">
                  <h5 className="text-xs font-medium text-surface-300 mb-3">提供家具</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-3">
                    {FURNITURE_OPTIONS.map((option) => (
                      <Checkbox
                        key={option}
                        id={`furniture-${option}`}
                        label={option}
                        checked={currentProperty.assetInventory?.includes(option) || false}
                        onChange={(e) => handleAssetInventoryChange(option, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>

                {/* Living Facilities Section */}
                <div className="mb-6">
                  <h5 className="text-xs font-medium text-surface-300 mb-3">生活機能</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-3">
                    {LIVING_FACILITIES_OPTIONS.map((option) => (
                      <Checkbox
                        key={option}
                        id={`facility-${option}`}
                        label={option}
                        checked={currentProperty.assetInventory?.includes(option) || false}
                        onChange={(e) => handleAssetInventoryChange(option, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <TextArea label="物件特色" name="features" value={currentProperty.features} onChange={handleInputChange} placeholder="例如：有陽台、近捷運站、可養寵物..." />
            </FormGroup>

            <FormGroup title="維修紀錄">
              <Button type="button" variant="outline" size="sm" onClick={() => {setCurrentRepairRecord({}); setShowAddRepairModal(true);}} icon={<PlusIcon className="w-4 h-4" />}>
                新增維修紀錄
              </Button>
              <div className="mt-3 space-y-2">
                {(currentProperty.repairHistory || []).length === 0 ? (
                  <p className="text-xs text-surface-500 text-center py-4">尚無維修紀錄</p>
                ) : (
                  (currentProperty.repairHistory || []).map(record => (
                    <div key={record.id} className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white mb-1">{record.itemDescription}</p>
                          <p className="text-xs text-surface-500">
                            {record.requestDate} {record.completionDate ? `→ ${record.completionDate}` : ''}
                          </p>
                          <p className="text-xs text-surface-400 mt-1">
                            {record.vendorStaff && <span>廠商：{record.vendorStaff}</span>}
                            {record.cost > 0 && <span className="ml-3">費用：${record.cost.toLocaleString()}</span>}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRepairRecordFromProperty(record.id)}>
                          <DeleteIcon className="w-4 h-4 text-danger-400" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </FormGroup>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增物件'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Repair Record Modal */}
      {showAddRepairModal && (
        <Modal isOpen={showAddRepairModal} onClose={() => setShowAddRepairModal(false)} title="新增維修紀錄" size="lg">
          <div className="space-y-4">
            <Input label="維修申請日期" name="requestDate" type="date" value={currentRepairRecord.requestDate || ''} onChange={handleRepairRecordChange} required />
            <TextArea label="維修項目/工作內容" name="itemDescription" value={currentRepairRecord.itemDescription || ''} onChange={handleRepairRecordChange} placeholder="詳細描述維修內容" required />
            <Input label="維修廠商/人員" name="vendorStaff" value={currentRepairRecord.vendorStaff || ''} onChange={handleRepairRecordChange} placeholder="例：XXX水電行" />
            <Input label="維修費用 (NT$)" name="cost" type="number" value={currentRepairRecord.cost || ''} onChange={handleRepairRecordChange} placeholder="請輸入費用" />
            <Input label="維修完成日期" name="completionDate" type="date" value={currentRepairRecord.completionDate || ''} onChange={handleRepairRecordChange} />
            <TextArea label="備註" name="notes" value={currentRepairRecord.notes || ''} onChange={handleRepairRecordChange} placeholder="其他備註事項" />
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={() => setShowAddRepairModal(false)}>取消</Button>
              <Button variant="primary" onClick={addRepairRecordToProperty}>加入紀錄</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentProperty && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title={`物件詳情: ${currentProperty.propertyInternalId}`} size="xl">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">物件編號</p>
                <p className="text-sm font-medium text-white">{currentProperty.propertyInternalId}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5 md:col-span-2">
                <p className="text-xs text-surface-500 mb-1">地址</p>
                <p className="text-sm font-medium text-white">{currentProperty.address}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">坪數</p>
                <p className="text-sm font-medium text-white">{currentProperty.sizeInPings} 坪</p>
              </div>
            </div>
            
            {/* Asset Inventory */}
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                物件資產明細
              </h4>
              {currentProperty.assetInventory && currentProperty.assetInventory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentProperty.assetInventory.map((item, idx) => (
                    <span key={idx} className="badge badge-info">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-surface-500">無資產明細</p>
              )}
            </div>
            
            {/* Features */}
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                物件特色
              </h4>
              <p className="text-sm text-surface-300 whitespace-pre-wrap">{currentProperty.features || '無特色說明'}</p>
            </div>
            
            {/* Repair History */}
            <div>
              <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                維修紀錄
              </h4>
              {(currentProperty.repairHistory || []).length === 0 ? (
                <p className="text-sm text-surface-500">尚無維修紀錄</p>
              ) : (
                <div className="space-y-3">
                  {(currentProperty.repairHistory || []).map(record => (
                    <div key={record.id} className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-white">{record.itemDescription}</p>
                        <span className={`badge ${record.completionDate ? 'badge-success' : 'badge-warning'}`}>
                          {record.completionDate ? '已完成' : '進行中'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-surface-500">申請日期：</span>
                          <span className="text-surface-300">{record.requestDate}</span>
                        </div>
                        <div>
                          <span className="text-surface-500">完成日期：</span>
                          <span className="text-surface-300">{record.completionDate || '-'}</span>
                        </div>
                        <div>
                          <span className="text-surface-500">廠商：</span>
                          <span className="text-surface-300">{record.vendorStaff || '-'}</span>
                        </div>
                        <div>
                          <span className="text-surface-500">費用：</span>
                          <span className="text-surface-300">{record.cost ? `$${record.cost.toLocaleString()}` : '-'}</span>
                        </div>
                      </div>
                      {record.notes && (
                        <p className="mt-2 text-xs text-surface-400">備註：{record.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentProperty); }}>
                <EditIcon className="w-4 h-4" />
                編輯物件
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyManagement;
