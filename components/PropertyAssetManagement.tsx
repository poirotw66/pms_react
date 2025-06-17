import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IndividualAsset, Property } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Modal } from './common/Modal.tsx';
import { Input, Button, Select, TextArea } from './common/FormControls.tsx';
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, DEFAULT_INDIVIDUAL_ASSET } from '../constants.tsx';

const PropertyAssetManagement: React.FC = () => {
  const [assets, setAssets] = useLocalStorage<IndividualAsset[]>('individualAssets', []);
  const [properties] = useLocalStorage<Property[]>('properties', []);
  const [searchParams, setSearchParams] = useSearchParams();
  
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

  return (
    <div className="p-6 bg-transparent">
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          新增資產
        </Button>
      </div>

      <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-borderLight">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">資產名稱/品牌/型號</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">關聯物件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">購買日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">價格</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-borderLight">
            {assets.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-textSecondary">尚無資產資料</td></tr>
            )}
            {assets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textPrimary">{asset.nameBrandModel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary truncate max-w-xs" title={getPropertyIdentifier(asset.propertyId)}>{getPropertyIdentifier(asset.propertyId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{asset.purchaseDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">${asset.purchasePrice}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => openViewModal(asset)} variant="neutral" size="sm" className="!p-1.5" title="查看"><ViewIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => openModal(asset)} variant="neutral" size="sm" className="!p-1.5" title="編輯"><EditIcon className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(asset.id)} variant="danger" size="sm" className="!p-1.5" title="刪除"><DeleteIcon className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? '編輯資產' : '新增資產'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4 text-textSecondary">
            <Select 
              label="關聯物件 (此資產所屬的物件)" 
              name="propertyId" 
              value={currentAsset.propertyId} 
              onChange={handleInputChange} 
              options={properties.map(p => ({ value: p.id, label: `${p.propertyInternalId} - ${p.address}` }))} 
              required 
            />
            <Input label="資產名稱/品牌/型號 (5-2)" name="nameBrandModel" value={currentAsset.nameBrandModel} onChange={handleInputChange} required />
            <Input label="資產購買日期 (5-1)" name="purchaseDate" type="date" value={currentAsset.purchaseDate} onChange={handleInputChange} required />
            <Input label="資產購買價格 (5-3)" name="purchasePrice" type="number" step="0.01" value={currentAsset.purchasePrice} onChange={handleInputChange} required />
            <Input label="購買廠商/電話 (5-4)" name="vendorNamePhone" value={currentAsset.vendorNamePhone} onChange={handleInputChange} />
            <Input label="資產保固期間 (5-5)" name="warrantyPeriod" value={currentAsset.warrantyPeriod} onChange={handleInputChange} placeholder="例如: 1年, 2025-12-31"/>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="neutral" onClick={closeModal}>取消</Button>
              <Button type="submit" variant="primary">{editingId ? '儲存變更' : '新增資產'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isViewModalOpen && currentAsset && (
        <Modal isOpen={isViewModalOpen} onClose={closeModal} title="查看資產資料" size="md">
          <div className="space-y-3 text-sm text-textSecondary">
            <p><strong>資產名稱/品牌/型號:</strong> <span className="text-textPrimary">{currentAsset.nameBrandModel}</span></p>
            <p><strong>關聯物件:</strong> <span className="text-textPrimary">{getPropertyIdentifier(currentAsset.propertyId)}</span></p>
            <p><strong>購買日期:</strong> <span className="text-textPrimary">{currentAsset.purchaseDate}</span></p>
            <p><strong>購買價格:</strong> <span className="text-textPrimary">${currentAsset.purchasePrice}</span></p>
            <p><strong>購買廠商/電話:</strong> <span className="text-textPrimary">{currentAsset.vendorNamePhone || '-'}</span></p>
            <p><strong>保固期間:</strong> <span className="text-textPrimary">{currentAsset.warrantyPeriod || '-'}</span></p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyAssetManagement;