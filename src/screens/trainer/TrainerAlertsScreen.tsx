import { useTrainerTheme } from '../../hooks/useTrainerTheme';
import { InboxScreen }     from '../shared/InboxScreen';
import type { NavFn }      from '../../types';

export function TrainerAlertsScreen({ nav, user }: { nav: NavFn; user: { id: string | null; name: string } }) {
  const { t, dark } = useTrainerTheme();
  return <InboxScreen nav={nav} userId={user.id} userName={user.name} isTrainer t={t} dark={dark} />;
}
