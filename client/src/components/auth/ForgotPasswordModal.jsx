import { useState, useEffect, useRef } from 'react';
import { forgotPasswordApi, verifyResetCodeApi, resetPasswordApi } from '../../api/auth';
import LoadingSpinner from '../common/LoadingSpinner';

const RESEND_COOLDOWN = 60;

// Step 1: Enter email
const StepEmail = ({ onNext, accentColor, loading, setLoading }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email);
      onNext(email);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-4xl mb-2">🔑</div>
        <h3 className="font-bold text-gray-900 text-lg">Forgot Password?</h3>
        <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset code</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex gap-2">
          <span>❌</span><span>{error}</span>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Enter your registered email"
          required
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ background: accentColor }}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <LoadingSpinner size="sm" /> : null}
        {loading ? 'Sending...' : 'Send Reset Code'}
      </button>
    </form>
  );
};

// Step 2: Enter 6-digit code
const StepCode = ({ email, onNext, onResend, accentColor, loading, setLoading }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      const full = newCode.join('');
      if (full.length === 6) handleVerify(full);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode) => {
    const c = fullCode || code.join('');
    if (c.length !== 6) { setError('Enter the complete 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await verifyResetCodeApi({ email, code: c });
      onNext(c, res.data.resetToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code.');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await forgotPasswordApi(email);
      onResend?.();
      setCode(['', '', '', '', '', '']);
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-4xl mb-2">📨</div>
        <h3 className="font-bold text-gray-900 text-lg">Enter Reset Code</h3>
        <p className="text-gray-500 text-sm mt-1">
          Code sent to <span className="font-medium text-gray-700">{email}</span>
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex gap-2">
          <span>❌</span><span>{error}</span>
        </div>
      )}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl transition-all outline-none py-3
              ${digit ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 bg-gray-50'}
              focus:border-red-400 focus:bg-red-50 disabled:opacity-50`}
          />
        ))}
      </div>
      <p className="text-center text-xs text-gray-400">⏱ Code expires in 10 minutes</p>
      <button
        onClick={() => handleVerify()}
        disabled={loading || code.join('').length !== 6}
        style={{ background: accentColor }}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? <LoadingSpinner size="sm" /> : null}
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>
      <div className="text-center">
        {canResend ? (
          <button onClick={handleResend} disabled={resendLoading} className="text-sm font-medium text-gray-600 hover:text-gray-800">
            {resendLoading ? 'Sending...' : '🔄 Resend Code'}
          </button>
        ) : (
          <p className="text-sm text-gray-400">Resend in <span className="font-semibold text-gray-600">{countdown}s</span></p>
        )}
      </div>
    </div>
  );
};

// Step 3: New password
const StepNewPassword = ({ email, code, onSuccess, accentColor, loading, setLoading }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const passwordRules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'Number', test: (p) => /\d/.test(p) },
    { label: 'Special character (@$!%*?&#^)', test: (p) => /[@$!%*?&#^]/.test(p) },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    const allPassed = passwordRules.every((r) => r.test(newPassword));
    if (!allPassed) { setError('Password does not meet all requirements.'); return; }
    setLoading(true);
    try {
      await resetPasswordApi({ email, code, newPassword, confirmPassword });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-4xl mb-2">🔒</div>
        <h3 className="font-bold text-gray-900 text-lg">Create New Password</h3>
        <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex gap-2">
          <span>❌</span><span>{error}</span>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Enter new password"
            required
          />
          <button type="button" onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showNew ? '🙈' : '👁️'}
          </button>
        </div>
        {/* Password strength indicators */}
        {newPassword && (
          <div className="mt-2 space-y-1">
            {passwordRules.map((rule) => (
              <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                <span className={rule.test(newPassword) ? 'text-green-500' : 'text-gray-300'}>
                  {rule.test(newPassword) ? '✓' : '○'}
                </span>
                <span className={rule.test(newPassword) ? 'text-green-600' : 'text-gray-400'}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 text-sm
              ${confirmPassword && confirmPassword !== newPassword
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-blue-500'}`}
            placeholder="Confirm new password"
            required
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showConfirm ? '🙈' : '👁️'}
          </button>
        </div>
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ background: accentColor }}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <LoadingSpinner size="sm" /> : null}
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
};

// Step 4: Success
const StepSuccess = ({ onClose, accentColor }) => (
  <div className="text-center py-4 space-y-4">
    <div className="text-6xl">🎉</div>
    <h3 className="font-bold text-gray-900 text-xl">Password Reset!</h3>
    <p className="text-gray-500 text-sm">Your password has been reset successfully. You can now log in with your new password.</p>
    <button
      onClick={onClose}
      style={{ background: accentColor }}
      className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
    >
      Go to Login
    </button>
  </div>
);

// ─── Main Modal ─────────────────────────────────────────────────────────────
const ForgotPasswordModal = ({ isOpen, onClose, accentColor = '#1e40af' }) => {
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=newpass, 4=success
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setStep(1); setEmail(''); setResetCode(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 4 ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            style={{ background: accentColor, width: `${(step / 4) * 100}%` }}
            className="h-full transition-all duration-500"
          />
        </div>

        <div className="p-6">
          {step === 1 && (
            <StepEmail
              onNext={(e) => { setEmail(e); setStep(2); }}
              accentColor={accentColor}
              loading={loading}
              setLoading={setLoading}
            />
          )}
          {step === 2 && (
            <StepCode
              email={email}
              onNext={(c) => { setResetCode(c); setStep(3); }}
              onResend={() => {}}
              accentColor={accentColor}
              loading={loading}
              setLoading={setLoading}
            />
          )}
          {step === 3 && (
            <StepNewPassword
              email={email}
              code={resetCode}
              onSuccess={() => setStep(4)}
              accentColor={accentColor}
              loading={loading}
              setLoading={setLoading}
            />
          )}
          {step === 4 && <StepSuccess onClose={onClose} accentColor={accentColor} />}

          {step < 4 && (
            <button
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {step === 1 ? '← Back to Login' : '← Back'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
