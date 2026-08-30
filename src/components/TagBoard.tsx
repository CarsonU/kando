import type { BoardApi } from '../useBoard';
import TagColumn from './TagColumn';

interface TagBoardProps {
  api: BoardApi;
  sortByDue: boolean;
}

/**
 * The "By tag" view: one read-only column per tag (in palette order) plus a
 * final "Untagged" column. Cards appear under every tag they carry; there is no
 * drag-and-drop here (a card's tags are edited from the card's own tag picker).
 */
export default function TagBoard({ api, sortByDue }: TagBoardProps) {
  const tags = Object.values(api.state.tags);

  return (
    <div className="board board--tags">
      {tags.map((tag) => (
        <TagColumn key={tag.id} api={api} tag={tag} sortByDue={sortByDue} />
      ))}
      <TagColumn api={api} tag={null} sortByDue={sortByDue} />
    </div>
  );
}
