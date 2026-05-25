import { useState, useEffect, useRef, useCallback } from 'react';
import { verifyEmailApi, resendVerificationApi } from '../../api/auth';
import LoadingSpinner from '../common/LoadingSpinner';

const RESEND_COOLDOWN = 60; // seconds

const VerifyEmailModal = ({ isOpen, email, onSuccess, onClose, accentColor = '#1e40af' }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(RESEND_COOLDOWN);
    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      setCode(['', '', '', '', '', '']);
      setError('');
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1); // only last char
    setCode(newCode);
    setError('');

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && index === 5) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = useCallback(async (fullCode) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await verifyEmailApi({ email, code: codeToVerify });
      onSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed.';
      setError(msg);
      // Clear code on wrong attempt
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }, [code, email, onSuccess]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess('');
    setError('');
    try {
      await resendVerificationApi(email);
      setResendSuccess('New code sent! Check your email.');
      setCode(['', '', '', '', '', '']);
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!isOpen) return null;

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div style={{ background: accentColor }} className="p-6 text-center">
          <div className="text-4xl mb-2">📧</div>
          <h2 className="text-xl font-bold text-white">Verify Your Email</h2>
          <p className="text-white/70 text-sm mt-1">
            We sent a 6-digit code to<br />
            <span className="text-white font-medium">{maskedEmail}</span>
          </p>
        </div>

        <div className="p-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {resendSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
              <span>✅</span>
              <span>{resendSuccess}</span>
            </div>
          )}

          {/* Code inputs */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
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
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all outline-none
                  ${digit ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-900'}
                  focus:border-blue-500 focus:bg-blue-50
                  disabled:opacity-50`}
              />
            ))}
          </div>

          {/* Expiry notice */}
          <p className="text-center text-xs text-gray-400 mb-4">
            ⏱ Code expires in 10 minutes
          </p>

          {/* Verify button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || code.join('').length !== 6}
            style={{ background: accentColor }}
            className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {loading ? <LoadingSpinner size="sm" /> : '🔐'}
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : '🔄 Resend Code'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend code in <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailModal;
