import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IndividualAsset } from '../types.ts';
import { useIndividualAssets, useProperties } from '../contexts/DataContext.tsx';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, FormGroup, Card } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_INDIVIDUAL_ASSET, ArchiveBoxIcon } from '../constants.tsx';

const PropertyAssetManagement: React.FC = () => {
  const [assets, setAssets] = useIndividualAssets();
  const [properties] = useProperties();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<IndividualAsset>(DEFAULT_INDIVIDUAL_ASSET);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal();
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getPropertyIdentifier = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    return prop ? `${prop.propertyInternalId} (${prop.address})` : 'N/A';
  };

  const getPropertyShortId = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    return prop ? prop.propertyInternalId : 'N/A';
  };

  const openModal = (asset?: IndividualAsset) => {
    if (asset) {
      setCurrentAsset(asset);
      setEditingId(asset.id);
    } else {
      setCurrentAsset(DEFAULT_INDIVIDUAL_ASSET);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };
  
  const openViewModal = (asset: IndividualAsset) => {
    setCurrentAsset(asset);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setCurrentAsset(DEFAULT_INDIVIDUAL_ASSET);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'purchasePrice') {
      setCurrentAsset(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setCurrentAsset(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAsset.propertyId || !currentAsset.nameBrandModel) {
      alert("請選擇關聯物件並填寫資產名稱。");
      return;
    }
    if (editingId) {
      setAssets(assets.map(a => a.id === editingId ? { ...currentAsset, id: editingId } : a));
    } else {
      setAssets([...assets, { ...currentAsset, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此資產記錄嗎？')) {
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  // Check warranty status
  const getWarrantyStatus = (warrantyPeriod: string) => {
    if (!warrantyPeriod) return null;
    // Try to parse as date
    const warrantyDate = new Date(warrantyPeriod);
    if (!isNaN(warrantyDate.getTime())) {
      const today = new Date();
      if (warrantyDate < today) return 'expired';
      const daysLeft = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30) return 'expiring';
      return 'active';
    }
    return 'active'; // If not a date, assume active
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.nameBrandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPropertyIdentifier(asset.propertyId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProperty = !propertyFilter || asset.propertyId === propertyFilter;
    return matchesSearch && matchesProperty;
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="搜尋資產..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
          >
            <option value="">全部物件</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.propertyInternalId}</option>
            ))}
          </select>
        </div>
        
        <Button onClick={() => openModal()} variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
          新增資產
        </Button>
      </div>

      {/* Table Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">資產名稱</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">關聯物件</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">購買日期</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">價格</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">保固狀態</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                        <ArchiveBoxIcon className="w-8 h-8 text-surface-600" />
                      </div>
                      <p className="text-surface-400 mb-1">尚無資產資料</p>
                      <p className="text-xs text-surface-500">點擊「新增資產」按鈕開始</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, index) => {
                  const warrantyStatus = getWarrantyStatus(asset.warrantyPeriod);
                  return (
                    <tr 
                      key={asset.id} 
                      className="group animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                            <ArchiveBoxIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{asset.nameBrandModel}</p>
                            <p className="text-xs text-surface-500">${asset.purchasePrice.toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-info">{getPropertyShortId(asset.propertyId)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-400 hidden md:table-cell">
                        {asset.purchaseDate}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        ${asset.purchasePrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {warrantyStatus === 'expired' && <span className="badge badge-danger">已過期</span>}
                        {warrantyStatus === 'expiring' && <span className="badge badge-warning">即將到期</span>}
                        {warrantyStatus === 'active' && <span className="badge badge-success">保固中</span>}
                        {!warrantyStatus && <span className="text-surface-500 text-sm">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openViewModal(asset)} className="icon-btn icon-btn-primary" title="查看">
                            <ViewIcon className="w-4 h-4 text-surface-400" />
                          </button>
                          <button onClick={() => openModal(asset)} className="icon-btn icon-btn-primary" title="編輯">
                            <EditIcon className="w-4 h-4 text-surface-400" />
                          </button>
                          <button onClick={() => handleDelete(asset.id)} className="icon-btn icon-btn-danger" title="刪除">
                            <DeleteIcon className="w-4 h-4 text-surface-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredAssets.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              共 <span className="text-white font-medium">{filteredAssets.length}</span> 筆資料
            </p>
            <p className="text-sm text-surface-500">
              總價值：<span className="text-accent-400 font-medium">${filteredAssets.reduce((sum, a) => sum + a.purchasePrice, 0).toLocaleString()}</span>
            </p>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯資產' : '新增資產'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormGroup title="基本資訊">
              <Select 
                label="關聯物件" 
                name="propertyId" 
                value={currentAsset.propertyId} 
                onChange={handleInputChange} 
                options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} 
                hint="選擇此資產所屬的物件"
                required 
              />
              <Input 
                label="資產名稱/品牌/型號" 
                name="nameBrandModel" 
                value={currentAsset.nameBrandModel} 
                onChange={handleInputChange} 
                placeholder="例：LG 洗衣機 WT-D179SG"
                required 
              />
            </FormGroup>

            <FormGroup title="購買資訊">
              <Input 
                label="購買日期" 
                name="purchaseDate" 
                type="date" 
                value={currentAsset.purchaseDate} 
                onChange={handleInputChange} 
                required 
              />
              <Input 
                label="購買價格 (NT$)" 
                name="purchasePrice" 
                type="number" 
                step="0.01" 
                value={currentAsset.purchasePrice} 
                onChange={handleInputChange} 
                placeholder="請輸入購買價格"
                required 
              />
              <Input 
                label="購買廠商/電話" 
                name="vendorNamePhone" 
                value={currentAsset.vendorNamePhone} 
                onChange={handleInputChange} 
                placeholder="例：XX電器行 02-1234-5678"
              />
            </FormGroup>

            <FormGroup title="保固資訊">
              <Input 
                label="保固期間" 
                name="warrantyPeriod" 
                value={currentAsset.warrantyPeriod} 
                onChange={handleInputChange} 
                placeholder="例：2025-12-31 或 3年"
                hint="可輸入日期或期間描述"
              />
            </FormGroup>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增資產'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentAsset && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="資產詳情" size="md">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                <ArchiveBoxIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{currentAsset.nameBrandModel}</h3>
                <span className="badge badge-info">{getPropertyShortId(currentAsset.propertyId)}</span>
              </div>
            </div>
            
            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">購買日期</p>
                <p className="text-sm font-medium text-white">{currentAsset.purchaseDate}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">購買價格</p>
                <p className="text-sm font-medium text-accent-400">${currentAsset.purchasePrice.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5 col-span-2">
                <p className="text-xs text-surface-500 mb-1">關聯物件</p>
                <p className="text-sm font-medium text-white">{getPropertyIdentifier(currentAsset.propertyId)}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">購買廠商/電話</p>
                <p className="text-sm font-medium text-white">{currentAsset.vendorNamePhone || '-'}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-xs text-surface-500 mb-1">保固期間</p>
                <p className="text-sm font-medium text-white">{currentAsset.warrantyPeriod || '-'}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="ghost" onClick={closeModal}>關閉</Button>
              <Button variant="primary" onClick={() => { closeModal(); openModal(currentAsset); }}>
                <EditIcon className="w-4 h-4" />
                編輯資產
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyAssetManagement;
