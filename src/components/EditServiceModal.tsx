import { useState, useEffect } from 'react';
import adminDashboardService from '../services/adminDashboard.service';
import { ServiceTypeConfig } from '../types';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: ServiceTypeConfig | null;
}

export default function EditServiceModal({ isOpen, onClose, onSuccess, service }: EditServiceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_rate: 0,
    max_rate: 0,
    duration: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        min_rate: service.minRate,
        max_rate: service.maxRate,
        duration: service.duration,
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    setError('');
    setLoading(true);
    try {
      const result = await adminDashboardService.updateServiceType(service.id, formData);

      if (!result) {
        throw new Error('Failed to update service type');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update service type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Service Type</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rate (₦) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.min_rate}
                onChange={(e) => setFormData({ ...formData, min_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Rate (₦) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.max_rate}
                onChange={(e) => setFormData({ ...formData, max_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration *
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="30 mins">30 minutes</option>
                <option value="60 mins">60 minutes</option>
                <option value="90 mins">90 minutes</option>
                <option value="120 mins">120 minutes</option>
                <option value="30-60 Minutes">30-60 Minutes</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
