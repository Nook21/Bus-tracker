import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';
import VerifyEmailModal from '../../components/auth/VerifyEmailModal';

const roleConfig = {
  admin: {
    title: 'Admin Login',
    subtitle: 'System Administration Portal',
    icon: '⚙️',
    gradient: 'from-orange-500 to-orange-700',
    accent: '#ea580c',
    ring: 'focus:ring-orange-400',
  },
  company: {
    title: 'Company Login',
    subtitle: 'Transport Company Portal',
    icon: '🏢',
    gradient: 'from-purple-600 to-purple-800',
    accent: '#7c3aed',
    ring: 'focus:ring-purple-400',
  },
  driver: {
    title: 'Driver Login',
    subtitle: 'Driver Mobile Portal',
    icon: '🚌',
    gradient: 'from-emerald-500 to-emerald-700',
    accent: '#059669',
    ring: 'focus:ring-emerald-400',
  },
  default: {
    title: 'Login',
    subtitle: 'Bus Tracker Ethiopia',
    icon: '🚌',
    gradient: 'from-blue-700 to-blue-900',
    accent: '#1d4ed8',
    ring: 'focus:ring-blue-400',
  },
};

const LoginPage = ({ role }) => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const config = roleConfig[role] || roleConfig.default;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const map = { admin: '/admin/dashboard', company: '/company/dashboard', driver: '/driver/dashboard' };
      navigate(map[user.role] || '/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const map = { admin: '/admin/dashboard', company: '/company/dashboard', driver: '/driver/dashboard' };
      navigate(map[userData.role] || '/');
    } catch (err) {
      const data = err.response?.data;
      // Company needs email verification
      if (data?.requiresVerification) {
        setPendingEmail(data.email || email);
        setVerifyOpen(true);
        return;
      }
      setError(data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuccess = (data) => {
    setVerifyOpen(false);
    // Auto-login after verification using the token returned by verifyEmail
    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const map = { admin: '/admin/dashboard', company: '/company/dashboard', driver: '/driver/dashboard' };
      window.location.href = map[data.user.role] || '/';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.gradient} px-8 py-10 text-center relative overflow-hidden`}>
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
            <div className="relative">
              <div className="text-5xl mb-3">{config.icon}</div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{config.title}</h1>
              <p className="text-white/70 text-sm mt-1">{config.subtitle}</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <Alert type="error" message={error} onClose={() => setError('')} />

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${config.ring} focus:border-transparent transition-all text-sm bg-gray-50 focus:bg-white`}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium hover:underline transition-colors"
                    style={{ color: config.accent }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${config.ring} focus:border-transparent transition-all text-sm bg-gray-50 focus:bg-white`}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-2`}
              >
                {loading ? <LoadingSpinner size="sm" /> : null}
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Other portals */}
        {role && (
          <div className="mt-5 text-center">
            <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Other portals</p>
            <div className="flex justify-center gap-4">
              {['admin', 'company', 'driver']
                .filter((r) => r !== role)
                .map((r) => (
                  <Link
                    key={r}
                    to={`/${r}/login`}
                    className="text-white/60 hover:text-white text-xs capitalize font-medium transition-colors border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg"
                  >
                    {r === 'admin' ? '⚙️' : r === 'company' ? '🏢' : '🚌'} {r}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        accentColor={config.accent}
      />

      {/* Email Verification Modal (triggered when unverified user tries to login) */}
      <VerifyEmailModal
        isOpen={verifyOpen}
        email={pendingEmail}
        onSuccess={handleVerifySuccess}
        onClose={() => setVerifyOpen(false)}
        accentColor={config.accent}
      />
    </div>
  );
};

export default LoginPage;
