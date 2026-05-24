import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../store/auth";
import { cn } from "../lib/utils";
import GoogleAuthButton from "../components/GoogleAuthButton";

const dots = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 4,
}));

function FloatingInput({ id, label, type, value, onChange, error, icon: Icon }) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const hasValue = value.length > 0;

  return (
    <div>
      <div className={cn(
        "relative rounded-xl border bg-white/[0.04] backdrop-blur-sm transition-all duration-300",
        focused ? "border-violet-400 shadow-[0_0_20px_rgba(167,139,250,0.2)]"
               : error  ? "border-red-500/60"
               : "border-white/10"
      )}>
        <Icon size={15} className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
          focused ? "text-violet-400" : "text-white/25"
        )} />

        <label htmlFor={id} className={cn(
          "absolute left-11 pointer-events-none transition-all duration-200 select-none",
          focused || hasValue
            ? "top-2 text-[10px] font-semibold uppercase tracking-widest text-violet-400"
            : "top-1/2 -translate-y-1/2 text-sm text-white/35"
        )}>
          {label}
        </label>

        <input
          id={id}
          type={isPassword ? (showPw ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full bg-transparent pl-11 pr-10 pb-3 text-sm text-white outline-none",
            focused || hasValue ? "pt-6" : "pt-4"
          )}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-violet-400 transition-colors"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 pl-1 text-[11px] text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;

  const passed = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const color = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"][passed];
  const label = ["", "Weak", "Fair", "Good", "Strong"][passed];
  const textColor = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400"][passed];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className={cn("h-1 flex-1 rounded-full transition-all duration-300", n <= passed ? color : "bg-white/10")} />
        ))}
      </div>
      <p className={cn("text-[11px]", textColor)}>{label} password</p>
    </motion.div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  function validate() {
    const e = {};
    if (!name.trim())                        e.name     = "Full name is required";
    if (!/\S+@\S+\.\S+/.test(email))        e.email    = "Enter a valid email";
    if (password.length < 8)                 e.password = "Minimum 8 characters";
    if (confirm !== password)                e.confirm  = "Passwords do not match";
    if (!agreed)                             e.agree    = "You must accept the terms";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    setErrors({});
    setLoading(true);
    try {
      await register({ name, email, password });
      toast.success("Account created! Welcome 🎉");
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      toast.error(msg);
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050811] px-4 py-16 relative overflow-hidden">

      {/* background glows */}
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "50px 50px"
      }} />

      {/* floating particles */}
      {dots.map(dot => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-cyan-400/25 pointer-events-none"
          style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: dot.size, height: dot.size }}
          animate={{ opacity: [0, 1, 0], y: [0, -40, -80] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity }}
        />
      ))}

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* top glow line on card */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)]">

          {/* logo + heading */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-5 text-white font-bold text-xl">
              RealCollab
            </Link>
            <h1 className="text-2xl font-black text-white tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-white/40">Join 2,400+ teams already shipping faster</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FloatingInput id="name"     label="Full name"        type="text"     icon={User} value={name}     onChange={e => setName(e.target.value)}     error={errors.name} />
            <FloatingInput id="email"    label="Work email"       type="email"    icon={Mail} value={email}    onChange={e => setEmail(e.target.value)}    error={errors.email} />
            <div>
              <FloatingInput id="password" label="Password"       type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} error={errors.password} />
              <PasswordStrength password={password} />
            </div>
            <FloatingInput id="confirm"  label="Confirm password" type="password" icon={Lock} value={confirm}  onChange={e => setConfirm(e.target.value)}  error={errors.confirm} />

            {/* terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className={cn(
                    "mt-0.5 w-4 h-4 flex-shrink-0 rounded border transition-all flex items-center justify-center",
                    agreed ? "bg-violet-500 border-violet-500" : "border-white/20 group-hover:border-violet-400/50"
                  )}
                >
                  {agreed && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-white/40 leading-relaxed">
                  I agree to the <span className="text-violet-400 underline underline-offset-2">Terms</span> and <span className="text-violet-400 underline underline-offset-2">Privacy Policy</span>
                </span>
              </label>
              <AnimatePresence>
                {errors.agree && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 pl-7 text-[11px] text-red-400">
                    {errors.agree}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 hover:brightness-110 hover:shadow-[0_0_30px_rgba(167,139,250,0.35)] transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <> Create Account <ArrowRight size={15} /></>}
            </motion.button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[11px] text-white/25 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <GoogleAuthButton label="Sign up with Google" />

          <p className="mt-6 text-center text-xs text-white/30">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">Sign in</Link>
          </p>
        </div>

        <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      </motion.div>
    </div>
  );
}