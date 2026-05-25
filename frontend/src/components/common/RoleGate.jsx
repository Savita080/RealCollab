// components/common/RoleGate.jsx — conditionally renders children based on role
export default function RoleGate({ children, show, fallback = null }) {
  // `show` is a boolean: e.g. show={isAdmin} or show={canEdit}
  return show ? children : fallback;
}
