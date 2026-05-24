// components/ui/Skeleton.jsx
import s from './Skeleton.module.css';
import { cls } from '../../lib/utils';

export function Skeleton({ w, h = 16, r = 8, className }) {
  return (
    <span
      className={cls(s.sk, className)}
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={s.card}>
      <Skeleton w="60%" h={14} />
      <Skeleton w="90%" h={11} />
      <Skeleton w="45%" h={11} />
      <div className={s.row}>
        <Skeleton w={24} h={24} r={24} />
        <Skeleton w={40} h={20} r={20} />
      </div>
    </div>
  );
}
