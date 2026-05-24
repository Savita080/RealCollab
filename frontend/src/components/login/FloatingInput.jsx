import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";

export default function FloatingInput({ id, label, type = "text", value, onChange, error, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPass ? "text" : "password") : type;
  const lifted = focused || (value && value.length > 0);

  return (
    <div className="relative">
      <div
        className={cn(
          "relative rounded-xl border transition-all duration-300",
          focused
            ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
            : error
            ? "border-red-500/60"
            : "border-white/10",
          "bg-white/5 backdrop-blur-sm"
        )}
      >
        {/* floating label */}
        <label
          htmlFor={id}
          className={cn(
            "absolute left-4 transition-all duration-200 pointer-events-none select-none",
            lifted
              ? "top-2 text-[10px] font-semibold tracking-widest uppercase text-cyan-400"
              : "top-1/2 -translate-y-1/2 text-sm text-white/40"
          )}
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
          className={cn(
            "w-full bg-transparent px-4 pb-3 text-sm text-white outline-none",
            lifted ? "pt-6" : "pt-4"
          )}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPass((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-cyan-400 transition-colors"
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
            className="mt-1 pl-1 text-[11px] text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}