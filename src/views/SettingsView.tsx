import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Business } from '../types.js';
import {
  Building2,
  Save,
  Check,
  Package,
  DollarSign,
  HelpCircle,
  Clock,
  MapPin,
  Mail,
  FileText
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [business, setBusiness] = useState<Business>({
    id: '',
    user_id: '',
    name: '',
    description: '',
    products_services: '',
    prices: '',
    faqs: '',
    business_hours: '',
    location: '',
    contact_info: '',
    additional_info: '',
    created_at: '',
    updated_at: ''
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadBusiness = async () => {
    try {
      const res = await fetchWithAuth('/api/business');
      if (res.ok) {
        const data = await res.json();
        if (data.business) setBusiness(data.business);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth('/api/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(business)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save business profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Business Profile & AI Knowledge Base
              </h3>
              <p className="text-xs text-slate-500">
                The information you enter here forms the ground-truth facts for your Gemini AI WhatsApp Agent.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Business Name</label>
            <input
              type="text"
              required
              value={business.name}
              onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              placeholder="e.g., Fishcatch Marketing Agency"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Business Overview & Mission</label>
            <textarea
              rows={2}
              value={business.description}
              onChange={(e) => setBusiness({ ...business, description: e.target.value })}
              placeholder="Brief summary of what your business does..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Products & Services Offered</span>
              </label>
              <textarea
                rows={3}
                value={business.products_services}
                onChange={(e) => setBusiness({ ...business, products_services: e.target.value })}
                placeholder="List your products, service packages, plans..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Official Prices & Rates</span>
              </label>
              <textarea
                rows={3}
                value={business.prices}
                onChange={(e) => setBusiness({ ...business, prices: e.target.value })}
                placeholder="e.g., Basic Plan: $49/mo, Pro Plan: $149/mo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Frequently Asked Questions (FAQs)</span>
            </label>
            <textarea
              rows={3}
              value={business.faqs}
              onChange={(e) => setBusiness({ ...business, faqs: e.target.value })}
              placeholder="Q: Do you offer a free trial? A: Yes, 14 days free trial available..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Business Hours</span>
              </label>
              <input
                type="text"
                value={business.business_hours}
                onChange={(e) => setBusiness({ ...business, business_hours: e.target.value })}
                placeholder="Mon - Fri: 9 AM - 6 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Location & Address</span>
              </label>
              <input
                type="text"
                value={business.location}
                onChange={(e) => setBusiness({ ...business, location: e.target.value })}
                placeholder="City, Country, Address"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact Info</span>
              </label>
              <input
                type="text"
                value={business.contact_info}
                onChange={(e) => setBusiness({ ...business, contact_info: e.target.value })}
                placeholder="Email, Phone number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Additional Business Details & Policies</span>
            </label>
            <textarea
              rows={2}
              value={business.additional_info}
              onChange={(e) => setBusiness({ ...business, additional_info: e.target.value })}
              placeholder="Any other specific guidelines or policies the AI should know..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Business Knowledge Base saved successfully!</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Knowledge Base'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
