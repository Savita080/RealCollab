import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Users, CheckSquare, Clock, Star } from "lucide-react"
import axios from "axios"

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
})

function StatCard({ icon: Icon, label, value, color }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const step = value / 40
    const t = setInterval(() => {
      start += step
      if (start >= value) { setCount(value); clearInterval(t) }
      else setCount(Math.floor(start))
    }, 30)
    return () => clearInterval(t)
  }, [value])

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, padding: "24px 28px",
      backdropFilter: "blur(20px)",
      display: "flex", alignItems: "center", gap: 18,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${color}20`,
        border: `1px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ color: "#8B8FA8", fontSize: 13, marginTop: 5 }}>{label}</div>
      </div>
    </div>
  )
}

function WorkspaceCard({ ws, onClick }) {
  const colors = ["#6C63FF", "#00D4FF", "#00FF88", "#FF6B35", "#FF3366"]
  const color = colors[ws.name.charCodeAt(0) % colors.length]

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: `0 20px 48px ${color}25` }}
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "0",
        cursor: "pointer", overflow: "hidden",
        transition: "box-shadow 0.25s",
      }}
    >
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 8 }}>
          {ws.name}
        </div>
        <div style={{ color: "#8B8FA8", fontSize: 13, marginBottom: 20, minHeight: 36 }}>
          {ws.description || "No description yet."}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex" }}>
            {(ws.members || []).slice(0, 4).map((m, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: colors[i % colors.length],
                border: "2px solid #0A0A0F",
                marginLeft: i > 0 ? -8 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff",
              }}>
                {(m.name || m.email || "?")[0].toUpperCase()}
              </div>
            ))}
          </div>
          <span style={{
            fontSize: 11, color: color, fontWeight: 600,
            background: `${color}18`, padding: "4px 10px", borderRadius: 100,
          }}>
            {ws.projectCount || 0} projects
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    axios.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => setWorkspaces(r.data))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { icon: Star,        label: "Active Workspaces", value: workspaces.length || 0,  color: "#6C63FF" },
    { icon: CheckSquare, label: "Tasks Due Today",   value: 12,  color: "#00D4FF"  },
    { icon: Users,       label: "Members Online",    value: 5,   color: "#00FF88"  },
    { icon: Clock,       label: "Pending Reviews",   value: 3,   color: "#FF6B35"  },
  ]

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      padding: "48px 52px", fontFamily: "'Inter', sans-serif",
    }}>

      {/* Greeting */}
      <motion.div {...fadeUp(0)} style={{ marginBottom: 44 }}>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800,
          color: "#fff", marginBottom: 6,
        }}>
          {greeting()}, {user.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p style={{ color: "#8B8FA8", fontSize: 15 }}>
          Here's what's happening across your workspaces today.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp(0.1)} style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 52,
      }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Workspaces */}
      <motion.div {...fadeUp(0.2)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", color: "#fff", fontSize: 24, fontWeight: 700 }}>
            Your Workspaces
          </h2>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg,#6C63FF,#00D4FF)",
              color: "#fff", border: "none", borderRadius: 11,
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(108,99,255,0.4)",
            }}
          >
            <Plus size={16} /> New Workspace
          </motion.button>
        </div>

        {loading ? (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18,
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 160, borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden", position: "relative",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)",
                  animation: "shimmer 1.5s infinite",
                }} />
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "#8B8FA8",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🐙</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, color: "#fff", marginBottom: 8 }}>
              No workspaces yet
            </div>
            <div style={{ fontSize: 14 }}>Create your first workspace to get started.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {workspaces.map((ws, i) => (
              <motion.div key={ws._id} {...fadeUp(i * 0.06)}>
                <WorkspaceCard ws={ws} onClick={() => window.location.href = `/workspace/${ws._id}`} />
              </motion.div>
            ))}

            {/* Create new card */}
            <motion.div
              whileHover={{ y: -4, borderColor: "rgba(108,99,255,0.5)" }}
              style={{
                borderRadius: 20, border: "2px dashed rgba(255,255,255,0.1)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 10, cursor: "pointer", minHeight: 150,
                color: "#8B8FA8", transition: "border-color 0.25s",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(108,99,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Plus size={22} color="#6C63FF" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>New Workspace</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%) }
          100% { transform: translateX(100%) }
        }
      `}</style>
    </div>
  )
}