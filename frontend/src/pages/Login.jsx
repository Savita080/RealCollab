import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowRight, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../store/auth";
import { cn } from "../lib/utils";
import FloatingInput from "../components/login/FloatingInput";
import LeftPanel from "../components/login/LeftPanel";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fields, setFields] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!fields.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) errs.email = "Enter a valid email";
    if (!fields.password) errs.password = "Password is required";
    else if (fields.password.length < 6) errs.password = "At least 6 characters";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      await login({ email: fields.email, password: fields.password });
      toast.success("Welcome back! 🚀");
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(msg);
      setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050811] font-sans">
      <LeftPanel />

      {/* ── Right Panel ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* subtle background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10 text-white font-bold text-lg">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            RealCollab
          </div>

          {/* glassmorphism card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
              <p className="mt-1 text-sm text-white/40">
                Sign in to continue to your workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FloatingInput
                id="email"
                label="Work email"
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={set("email")}
                error={errors.email}
              />
              <FloatingInput
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={fields.password}
                onChange={set("password")}
                error={errors.password}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative w-full mt-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-300",
                  "bg-gradient-to-r from-cyan-500 to-indigo-500",
                  "hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:brightness-110",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </form>

            {/* divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[11px] text-white/25 tracking-widest uppercase">or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Google OAuth Button */}
            <GoogleAuthButton label="Continue with Google" />

            <p className="mt-6 text-center text-xs text-white/30">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-cyan-400/80 hover:text-cyan-400 transition-colors font-medium"
              >
                Start for free
              </Link>
            </p>
          </div>

          <p className="mt-5 text-center text-[11px] text-white/20">
            By signing in, you agree to our{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">
              Terms
            </span>{" "}
            and{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">
              Privacy Policy
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}