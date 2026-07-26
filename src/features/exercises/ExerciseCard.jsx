/** Single exercise display — list row or grid tile. */
import { Badge, Button } from '../../components/ui.jsx';
import { PlusIcon, CheckIcon } from '../../components/Icons.jsx';
import './exercises.css';

/** Initials-based visual stand-in for the GIF (bundled catalogue has no media). */
function ExerciseGlyph({ name, bodyPart, custom, size }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const tone = custom ? 'custom' : bodyPart.replace(/\s/g, '-');
  return (
    <div className={`ex-glyph ex-glyph--${tone} ${size ? `ex-glyph--${size}` : ''}`} aria-hidden>
      {initials}
    </div>
  );
}

export default function ExerciseCard({ exercise, onAdd, onOpen, added, view = 'list', usage }) {
  const media = exercise.gifUrl
    ? <img className="ex-card__media" src={exercise.gifUrl} alt="" loading="lazy" />
    : <ExerciseGlyph
        name={exercise.name}
        bodyPart={exercise.bodyPart}
        custom={exercise.custom}
        size={view === 'grid' ? 'lg' : undefined}
      />;

  /* ------------------------------ grid tile ------------------------------ */
  if (view === 'grid') {
    return (
      <div className="ex-tile" onClick={() => onOpen?.(exercise)}>
        {media}
        <p className="ex-tile__name">{exercise.name}</p>
        <p className="ex-tile__meta truncate">{exercise.target}</p>
        {usage?.count > 0 && <span className="ex-tile__usage">{usage.count}×</span>}
        {onAdd && (
          <button
            className={`ex-tile__add ${added ? 'ex-tile__add--on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onAdd(exercise); }}
            aria-label={`Add ${exercise.name}`}
          >
            {added ? <CheckIcon width={15} height={15} /> : <PlusIcon width={15} height={15} />}
          </button>
        )}
      </div>
    );
  }

  /* ------------------------------ list row ------------------------------- */
  return (
    <div className="ex-card" onClick={() => onOpen?.(exercise)}>
      {media}

      <div className="grow">
        <p className="ex-card__name truncate">{exercise.name}</p>
        <div className="ex-card__meta">
          {exercise.custom && <Badge tone="success">Yours</Badge>}
          <Badge tone="accent">{exercise.target}</Badge>
          <span className="muted truncate">{exercise.equipment}</span>
          {usage?.count > 0 && <span className="ex-card__usage">{usage.count}×</span>}
        </div>
      </div>

      {onAdd && (
        <Button
          variant={added ? 'secondary' : 'primary'}
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAdd(exercise); }}
          aria-label={`Add ${exercise.name}`}
        >
          {added ? 'Added' : <PlusIcon width={16} height={16} />}
        </Button>
      )}
    </div>
  );
}

export { ExerciseGlyph };
