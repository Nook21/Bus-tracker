import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import VerifyEmailModal from '../../components/auth/VerifyEmailModal';
import { getAllCompanies, createCompany, approveCompany, toggleCompanyStatus } from '../../api/admin';

const initialForm = {
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  password: '',
  confirmPassword: '',
};

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)', test: (p) => /\d/.test(p) },
  { label: 'Special character (@$!%*?&#^)', test: (p) => /[@$!%*?&#^]/.test(p) },
];

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState('');

  // Verification modal state
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllCompanies();
      setCompanies(res.data.companies);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    const allRulesPassed = passwordRules.every((r) => r.test(formData.password));
    if (!allRulesPassed) {
      setFormError('Password does not meet all requirements.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCompany(formData);
      // Close registration modal, open verification modal
      setModalOpen(false);
      setPendingEmail(res.data.email);
      setVerifyOpen(true);
      setFormData(initialForm);
      fetchCompanies();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySuccess = () => {
    setVerifyOpen(false);
    setVerifySuccess('Company email verified successfully! The company can now log in.');
    fetchCompanies();
    setTimeout(() => setVerifySuccess(''), 5000);
  };

  const handleApprove = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: 'approve' }));
    try { await approveCompany(id); fetchCompanies(); }
    finally { setActionLoading((p) => ({ ...p, [id]: null })); }
  };

  const handleToggle = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: 'toggle' }));
    try { await toggleCompanyStatus(id); fetchCompanies(); }
    finally { setActionLoading((p) => ({ ...p, [id]: null })); }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError('');
    setFormData(initialForm);
  };

  const filtered = companies.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.companyEmail.toLowerCase().includes(search.toLowerCase())
  );

  const passwordStrength = formData.password
    ? passwordRules.filter((r) => r.test(formData.password)).length
    : 0;

  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <DashboardLayout>
      <PageHeader
        title="Companies"
        subtitle="Manage transport companies on the platform"
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            + Register Company
          </button>
        }
      />

      {/* Global success alert */}
      {verifySuccess && (
        <Alert type="success" message={verifySuccess} onClose={() => setVerifySuccess('')} />
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="🔍 Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Company</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Contact</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Drivers</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Trips</th>
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
                    <p className="text-3xl mb-2">🏢</p>
                    <p>{search ? 'No companies match your search.' : 'No companies yet. Register your first company.'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-900">{c.companyName}</p>
                      <p className="text-xs text-gray-400">{c.companyPhone}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{c.companyEmail}</td>
                    <td className="py-3 px-3 text-gray-700 font-medium">{c.totalDrivers}</td>
                    <td className="py-3 px-3">
                      {c.activeTrips > 0
                        ? <span className="badge-active">{c.activeTrips} active</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className={c.isActive ? 'badge-active' : 'badge-inactive'}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!c.isVerified && (
                          <span className="badge-pending">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!c.isVerified && (
                          <button
                            onClick={() => { setPendingEmail(c.companyEmail); setVerifyOpen(true); }}
                            className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded-lg font-medium transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        {!c.isApproved && (
                          <button
                            onClick={() => handleApprove(c.id)}
                            disabled={actionLoading[c.id] === 'approve'}
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {actionLoading[c.id] === 'approve' ? '...' : 'Approve'}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(c.id)}
                          disabled={actionLoading[c.id] === 'toggle'}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                            c.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {actionLoading[c.id] === 'toggle' ? '...' : c.isActive ? 'Deactivate' : 'Activate'}
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

      {/* ── Register Company Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Register New Company"
        size="lg"
      >
        {formError && (
          <Alert type="error" message={formError} onClose={() => setFormError('')} />
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="label">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Addis Transport PLC"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="label">Company Phone <span className="text-red-500">*</span></label>
              <input
                type="tel"
                className="input-field"
                placeholder="+251 9XX XXX XXX"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                required
              />
            </div>
            {/* Email */}
            <div>
              <label className="label">Company Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="company@example.com"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
            <span className="text-blue-500 flex-shrink-0">ℹ️</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              After registration, a <strong>6-digit verification code</strong> will be sent to the company email.
              The company must verify their email before they can log in.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || passwordStrength < 5 || formData.password !== formData.confirmPassword}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
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
        accentColor="#7c3aed"
      />
    </DashboardLayout>
  );
};

export default AdminCompanies;
