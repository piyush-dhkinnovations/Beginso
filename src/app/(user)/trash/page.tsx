import { TrashView } from '@/components/trash/TrashView';

// Personal-space Trash. Scoped to the forms this user created and never moved into a workspace.
export default function PersonalTrashPage() {
  return <TrashView scope="personal" />;
}
