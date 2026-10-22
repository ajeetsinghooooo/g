import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Calendar,
  Percent,
  DollarSign,
  Tag,
  Clock,
  X,
  Save,
} from 'lucide-react';
import { CashbackCampaign } from '../../types';

interface CashbackCampaignsSectionProps {
  adminToken: string;
}

export const CashbackCampaignsSection: React.FC<CashbackCampaignsSectionProps> = ({ adminToken }) => {
  const [campaigns, setCampaigns] = useState<CashbackCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CashbackCampaign | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<string>('10');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('150');
  const [maxCashback, setMaxCashback] = useState<string>('50');
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [active, setActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cashback/campaigns', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load cashback campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [adminToken]);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName('');
    setDescription('');
    setType('percentage');
    setValue('10');
    setMinOrderAmount('150');
    setMaxCashback('50');
    setFirstOrderOnly(false);
    setActive(true);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CashbackCampaign) => {
    setEditingCampaign(c);
    setName(c.name);
    setDescription(c.description || '');
    setType(c.type);
    setValue(c.value.toString());
    setMinOrderAmount(c.minOrderAmount.toString());
    setMaxCashback(c.maxCashback ? c.maxCashback.toString() : '');
    setFirstOrderOnly(c.firstOrderOnly || false);
    setActive(c.active);
    setStartDate(c.startDate ? c.startDate.slice(0, 10) : '');
    setEndDate(c.endDate ? c.endDate.slice(0, 10) : '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Campaign name is required');
      return;
    }

    const numValue = parseFloat(value);
    const numMinOrder = parseFloat(minOrderAmount) || 0;
    const numMaxCashback = maxCashback ? parseFloat(maxCashback) : undefined;

    if (!numValue || numValue <= 0) {
      setErrorMessage('Cashback value must be greater than zero');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      type,
      value: numValue,
      minOrderAmount: numMinOrder,
      maxCashback: numMaxCashback,
      firstOrderOnly,
      active,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      const url = editingCampaign
        ? `/api/admin/cashback/campaigns/${editingCampaign.id}`
        : '/api/admin/cashback/campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save cashback campaign');
      }

      setSuccessMessage(editingCampaign ? 'Campaign updated!' : 'Campaign created!');
      setTimeout(() => setSuccessMessage(null), 2500);
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: CashbackCampaign) => {
    try {
      const res = await fetch(`/api/admin/cashback/campaigns/${c.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to toggle campaign status:', err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cashback/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            <span>Cashback Campaigns (Real Database-Backed)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Percentage &amp; fixed promotional cashback automatically credited to customer wallets upon order completion
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchCampaigns}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Refresh campaigns"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Gift className="w-10 h-10 mx-auto text-slate-600" />
          <h4 className="text-sm font-bold text-white">No Cashback Campaigns Configured</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create percentage or fixed amount promotional campaigns to automatically reward customers with real wallet funds!
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition shadow-xs inline-flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                c.active
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${c.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                    />
                    <h3 className="font-black text-sm text-white">{c.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      c.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {c.description || 'Promotional cashback program for eligible customers.'}
                </p>

                {/* Cashback Benefit Tag */}
                <div className="mt-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Reward Amount</span>
                    <span className="text-base font-black text-emerald-400">
                      {c.type === 'percentage' ? `${c.value}% Cashback` : `₹${c.value} Flat Cashback`}
                    </span>
                  </div>
                  {c.maxCashback && c.type === 'percentage' && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Max Cap</span>
                      <span className="text-xs font-bold text-slate-200">Up to ₹{c.maxCashback}</span>
                    </div>
                  )}
                </div>

                {/* Criteria List */}
                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <div>• Min eligible order: <strong className="text-white">₹{c.minOrderAmount}</strong></div>
                  {c.firstOrderOnly && (
                    <div className="text-amber-400 font-bold">• First order only promotion</div>
                  )}
                  {c.usageCount !== undefined && (
                    <div>• Total times awarded: <strong className="text-teal-400">{c.usageCount} orders</strong></div>
                  )}
                  {(c.startDate || c.endDate) && (
                    <div>• Valid: {c.startDate ? c.startDate.slice(0, 10) : 'Now'} to {c.endDate ? c.endDate.slice(0, 10) : 'Ongoing'}</div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(c)}
                  className={`text-xs font-bold flex items-center space-x-1.5 transition ${
                    c.active ? 'text-slate-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{c.active ? 'Pause' : 'Activate'}</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Edit Campaign"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(c.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl relative">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <Gift className="w-5 h-5 text-emerald-400" />
                  <span>{editingCampaign ? 'Edit Cashback Campaign' : 'Create Cashback Campaign'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configures automated wallet cashback upon order delivery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Campaign Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekend Delight 10% Cashback"
                  required
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Get 10% cashback credited to your wallet on orders above ₹150"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Reward Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Value {type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Min Order Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Max Cashback Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={maxCashback}
                    onChange={(e) => setMaxCashback(e.target.value)}
                    placeholder="e.g. 50 (optional)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstOrderOnly}
                    onChange={(e) => setFirstOrderOnly(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <span>First order only (welcome promotion)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <span>Active immediately</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
