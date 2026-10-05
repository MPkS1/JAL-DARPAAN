import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import type { Cap } from '../store/auth';
import { useAuth } from '../store/auth';
import { ROLE_META } from '../data/users';

interface Props {
  cap: Cap;
  title?: string;
}

/** Shown when a user deep-links to a page their role is not permitted to open. */
export default function Restricted({ cap, title = 'This page is restricted' }: Props) {
  const { user } = useAuth();
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <Lock size={26} className="mx-auto text-amber-300" />
      <h2 className="mt-2 font-display text-[18px] font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-text-800">
        You are signed in as <span className="font-semibold text-text-900">{user ? ROLE_META[user.role].label : 'unknown role'}</span>,
        which does not include the capability “{cap}”. This restriction mirrors the production JWT + RBAC design — sign in with a
        higher-authority demo account (National or State) from the login page to access it.
      </p>
      <Link to="/" className="btn-primary mt-5 !py-2 !text-[12.5px]">
        <ArrowLeft size={14} /> Back to Command Center
      </Link>
    </div>
  );
}
