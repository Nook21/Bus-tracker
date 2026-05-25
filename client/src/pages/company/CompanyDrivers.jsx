import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import VerifyEmailModal from '../../components/auth/VerifyEmailModal';
import { getDrivers, createDriver, toggleDriverStatus } from '../../api/company';

const initialForm = {
  driverName: '',
  driverPhone: '',
  driverEmail: '',
  driverLicense: '',
  assignedBusNumber: '',
  nationalId: '',
  password: '',
  confirmPassword: '',
};

const passwordRules = [
  { label: 'At least 8 characters',            test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A-Z)',            test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)',            test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)',                      test: (p) => /\d/.test(p) },
  { label: 'Special character (@$!%*?&#^)',     test: (p) => /[@$!%*?&#^]/.test(p) },
];

const CompanyDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState('');

  // Verification modal
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDrivers();
      setDrivers(res.data.drivers);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!passwordRules.every((r) => r.test(formData.password))) {
      setFormError('Password does not meet all requirements.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createDriver(formData);
      setModalOpen(false);
      setFormData(initialForm);
      setPendingEmail(res.data.email);
      setVerifyOpen(true);
      fetchDrivers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register driver.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySuccess = () => {
    setVerifyOpen(false);
    setGlobalSuccess('Driver email verified! They can now log in to the driver app.');
    fetchDrivers();
    setTimeout(() => setGlobalSuccess(''), 5000);
  };

  const handleToggle = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await toggleDriverStatus(id);
      fetchDrivers();
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError('');
    setFormData(initialForm);
  };

  const filtered = drivers.filter((d) =>
    d.driverName.toLowerCase().includes(search.toLowerCase()) ||
    d.assignedBusNumber.toLowerCase().includes(search.toLowerCase()) ||
    d.driverEmail.toLowerCase().includes(search.toLowerCase())
  );

  const passwordStrength = formData.password
    ? passwordRules.filter((r) => r.test(formData.password)).length
    : 0;

  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <DashboardLayout>
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} registered driver${drivers.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            + Add Driver
          </button>
        }
      />

      {/* Global success */}
      {globalSuccess && (
        <Alert type="success" message={globalSuccess} onClose={() => setGlobalSuccess('')} />
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="🔍 Search by name, bus, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Driver</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Contact</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Bus</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">License</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-4"><SkeletonLoader rows={5} cols={6} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-2">👤</p>
                    <p>{search ? 'No drivers match your search.' : 'No drivers yet. Add your first driver.'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-900">{d.driverName}</p>
                      <p className="text-xs text-gray-400">{d.nationalId}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-gray-700 text-xs">{d.driverPhone}</p>
                      <p className="text-xs text-gray-400">{d.driverEmail}</p>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">Bus {d.assignedBusNumber}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{d.driverLicense}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        {d.onTrip ? (
                          <span className="badge-active">On Trip</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Idle
                          </span>
                        )}
                        {!d.isVerified && (
                          <span className="badge-pending">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Re-open verify modal for unverified drivers */}
                        {!d.isVerified && (
                          <button
                            onClick={() => { setPendingEmail(d.driverEmail); setVerifyOpen(true); }}
                            className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-lg font-medium transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(d.id)}
                          disabled={actionLoading[d.id]}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                            d.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {actionLoading[d.id] ? '...' : d.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Register Driver Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Register New Driver"
        size="lg"
      >
        {formError && (
          <Alert type="error" message={formError} onClose={() => setFormError('')} />
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text" className="input-field" placeholder="Driver full name"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel" className="input-field" placeholder="+251 9XX XXX XXX"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email" className="input-field" placeholder="driver@example.com"
                value={formData.driverEmail}
                onChange={(e) => setFormData({ ...formData, driverEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Driver License No. <span className="text-red-500">*</span></label>
              <input
                type="text" className="input-field" placeholder="License number"
                value={formData.driverLicense}
                onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Assigned Bus Number <span className="text-red-500">*</span></label>
              <input
                type="text" className="input-field" placeholder="e.g. AA-12345"
                value={formData.assignedBusNumber}
                onChange={(e) => setFormData({ ...formData, assignedBusNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">National ID <span className="text-red-500">*</span></label>
              <input
                type="text" className="input-field" placeholder="National ID number"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength bar */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  passwordStrength <= 2 ? 'text-red-500' : passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {strengthLabels[passwordStrength]}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                      <span className={rule.test(formData.password) ? 'text-green-500' : 'text-gray-300'}>
                        {rule.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span className={rule.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`input-field pr-10 ${
                  formData.confirmPassword && formData.confirmPassword !== formData.password
                    ? 'border-red-300 focus:ring-red-400'
                    : ''
                }`}
                placeholder="Repeat the password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {formData.confirmPassword && formData.confirmPassword !== formData.password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
            {formData.confirmPassword && formData.confirmPassword === formData.password && (
              <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
            <span className="text-emerald-500 flex-shrink-0">ℹ️</span>
            <p className="text-xs text-emerald-700 leading-relaxed">
              After registration, a <strong>6-digit verification code</strong> will be sent to the driver's email.
              The driver must verify their email before they can log in to the driver app.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                passwordStrength < 5 ||
                formData.password !== formData.confirmPassword
              }
              className="btn-success flex-1 flex items-center justify-center gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              {submitting ? 'Registering...' : 'Register & Send Code'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Email Verification Modal ── */}
      <VerifyEmailModal
        isOpen={verifyOpen}
        email={pendingEmail}
        onSuccess={handleVerifySuccess}
        onClose={() => setVerifyOpen(false)}
        accentColor="#059669"
      />
    </DashboardLayout>
  );
};

export default CompanyDrivers;
