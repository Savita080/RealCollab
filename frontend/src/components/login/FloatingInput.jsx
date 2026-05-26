import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function FloatingInput({ id, label, type = "text", value, onChange, error, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPass ? "text" : "password") : type;
  const lifted = focused || (value && value.length > 0);

  const borderColor = focused
    ? 'var(--cyan)'
    : error
    ? 'var(--status-danger)'
    : 'var(--border)';
  const boxShadow = focused ? 'var(--glow-cyan)' : 'none';

  return (
    <div className="relative">
      <div
        className="relative rounded-xl backdrop-blur-sm transition-all duration-300"
        style={{
          border: `1px solid ${borderColor}`,
          boxShadow,
          background: 'var(--bg-card)',
        }}
      >
        {/* floating label */}
        <label
          htmlFor={id}
          className="absolute left-4 transition-all duration-200 pointer-events-none select-none"
          style={
            lifted
              ? {
                  top: '8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--cyan)',
                }
              : {
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: 'var(--text-3)',
                }
          }
        >
          {label}
        </label>

        <input
          id={id}
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-4 pb-3 text-sm outline-none"
          style={{
            color: 'var(--text-1)',
            paddingTop: lifted ? '24px' : '16px',
          }}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPass((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cyan)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 pl-1 text-[11px]"
            style={{ color: 'var(--status-danger)' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
