import { useTheme }    from '../../contexts/ThemeContext';
import { InboxScreen } from '../shared/InboxScreen';
import type { NavFn }  from '../../types';

export function ClientInboxScreen({ nav, user }: { nav: NavFn; user: { id: string | null; name: string } }) {
  const { t, dark } = useTheme();
  return <InboxScreen nav={nav} userId={user.id} userName={user.name} isTrainer={false} t={t} dark={dark} />;
}
