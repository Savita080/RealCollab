// components/ui/Button.jsx
import { forwardRef } from 'react';
import { cls } from '../../lib/utils';
import styles from './Button.module.css';

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  ...props
}, ref) => (
  <button
    ref={ref}
    className={cls(styles.btn, styles[variant], styles[size], loading && styles.loading, className)}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? <span className={styles.spinner} /> : icon && <span className={styles.icon}>{icon}</span>}
    {children && <span>{children}</span>}
  </button>
));

Button.displayName = 'Button';
export default Button;
