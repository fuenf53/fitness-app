/** Search & browse the exercise database, then add picks to a workout. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  searchExercises, bodyParts, equipmentTypes, catalogueSize, fromCustomRow, SORTS,
} from './exerciseApi.js';
import ExerciseCard, { ExerciseGlyph } from './ExerciseCard.jsx';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import { Modal, Input, Select, Spinner, EmptyState, Button, Badge } from '../../components/ui.jsx';
import { SearchIcon, PlusIcon, TrashIcon, GridIcon, ListIcon, FilterIcon } from '../../components/Icons.jsx';
import './exercises.css';

const VIEW_KEY = 'fitapp:exerciseView';

/**
 * Rendering all ~700 results at once costs ~7k DOM nodes, which makes opening
 * the picker and every keystroke visibly slow on a phone. Render a screenful
 * at a time and extend as the list is scrolled — the whole catalogue is still
 * reachable, it just arrives in chunks.
 */
const PAGE_SIZE = 60;

export default function ExercisePicker({ open, onClose, onPick, addedIds = [] }) {
  const { profile, toast } = useApp();
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [sort, setSort] = useState('alpha');
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) ?? 'list');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [custom, setCustom] = useState([]);
  const [usage, setUsage] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setViewMode = (v) => { setView(v); localStorage.setItem(VIEW_KEY, v); };

  /* The user's own exercises are merged into every search. */
  const loadCustom = useCallback(async () => {
    if (!profile?.id) return [];
    try {
      const rows = await db.select(TABLES.customExercises, {
        eq: { user_id: profile.id }, order: 'created_at', ascending: false,
      });
      setCustom(rows);
      return rows;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [profile?.id]);

  /* Logged history, for the "Most used" and "Last used" sorts. */
  const loadUsage = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setUsage(await db.exerciseUsage(profile.id));
    } catch (err) {
      console.error(err);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!open) return;
    loadCustom();
    loadUsage();
  }, [open, loadCustom, loadUsage]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    searchExercises({ query, bodyPart, equipment, custom, sort, usage })
      .then((r) => !cancelled && setResults(r))
      .catch((err) => { console.error(err); !cancelled && setResults([]); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, query, bodyPart, equipment, custom, sort, usage]);

  const added = useMemo(() => new Set(addedIds.map(String)), [addedIds]);
  const searching = query.trim().length > 0;
  const activeFilters =
    (bodyPart !== 'all' ? 1 : 0) + (equipment !== 'all' ? 1 : 0) + (sort !== 'alpha' ? 1 : 0);

  /* ---------------- incremental rendering ---------------- */
  const [limit, setLimit] = useState(PAGE_SIZE);
  const observerRef = useRef(null);
  const totalRef = useRef(0);
  totalRef.current = results.length;

  // Any change to the result set starts the list over from the top.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, bodyPart, equipment, sort, view]);

  /**
   * A callback ref, not useEffect + useRef: results and the loading flag land
   * in separate renders, so an effect keyed on them can run while the sentinel
   * is still unmounted and then never re-run once it appears. This attaches
   * the observer exactly when the node enters or leaves the DOM.
   */
  const sentinelRef = useCallback((node) => {
    observerRef.current?.disconnect();
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLimit((l) => Math.min(l + PAGE_SIZE, totalRef.current));
        }
      },
      { root: node.closest('.modal__body'), rootMargin: '400px' },
    );
    observerRef.current.observe(node);
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const visible = useMemo(() => results.slice(0, limit), [results, limit]);

  async function deleteCustom(ex) {
    await db.remove(TABLES.customExercises, ex.id);
    toast('Exercise removed');
    setDetail(null);
    loadCustom();
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Add exercise" size="lg" bodyClass="modal__body--flush">
        <div className="stack">
          {/* Pinned so the next exercise is always one tap away. */}
          <div className="ex-sticky">
            <div className="ex-bar">
              <div className="ex-search grow">
                <SearchIcon width={18} height={18} className="ex-search__icon" />
                <Input
                  autoFocus
                  placeholder={`Search ${catalogueSize()} exercises…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button className="ex-search__clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
                )}
              </div>

              <button
                className={`icon-toggle ${filtersOpen ? 'icon-toggle--on' : ''}`}
                onClick={() => setFiltersOpen((o) => !o)}
                aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
                aria-expanded={filtersOpen}
              >
                <FilterIcon width={17} height={17} />
                {activeFilters > 0 && <span className="icon-toggle__dot">{activeFilters}</span>}
              </button>

              <button
                className="icon-toggle"
                onClick={() => setViewMode(view === 'list' ? 'grid' : 'list')}
                aria-label={view === 'list' ? 'Switch to grid view' : 'Switch to list view'}
              >
                {view === 'list' ? <GridIcon width={17} height={17} /> : <ListIcon width={17} height={17} />}
              </button>
            </div>

            {filtersOpen && (
              <div className="ex-filters">
                <label className="ex-filter">
                  <span className="ex-filter__label">Muscle</span>
                  <Select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)}>
                    <option value="all">All muscles</option>
                    {bodyParts().map((bp) => <option key={bp} value={bp}>{bp}</option>)}
                  </Select>
                </label>

                <label className="ex-filter">
                  <span className="ex-filter__label">Equipment</span>
                  <Select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                    <option value="all">Any equipment</option>
                    {equipmentTypes().map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                  </Select>
                </label>

                <label className="ex-filter">
                  <span className="ex-filter__label">Sort</span>
                  <Select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    disabled={searching}
                    title={searching ? 'Sorting resumes when the search is cleared' : undefined}
                  >
                    {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </Select>
                </label>

                {activeFilters > 0 && (
                  <button
                    className="ex-filters__reset"
                    onClick={() => { setBodyPart('all'); setEquipment('all'); setSort('alpha'); }}
                  >Reset filters</button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <Spinner />
          ) : results.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No exercises found"
              action={<Button onClick={() => setCreateOpen(true)}>Create “{query.trim() || 'my exercise'}”</Button>}
            >
              Nothing matched that search — add it as your own exercise instead.
            </EmptyState>
          ) : (
            <>
              <div className="row-between">
                <p className="muted" style={{ fontSize: 13 }}>
                  {results.length} exercises
                  {searching && <span className="muted"> · by relevance</span>}
                </p>
                <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)}>
                  <PlusIcon width={15} height={15} /> Create
                </Button>
              </div>

              <div className={view === 'grid' ? 'ex-grid' : 'stack-2'}>
                {visible.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    view={view}
                    added={added.has(ex.id)}
                    usage={usage[ex.id]}
                    onAdd={onPick}
                    onOpen={setDetail}
                  />
                ))}
              </div>

              {/* Scrolling this into view loads the next chunk. */}
              {limit < results.length && (
                <div ref={sentinelRef} className="ex-more">
                  Loading more… ({visible.length} of {results.length})
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* -------------------------- detail sheet -------------------------- */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && (
          <div className="stack">
            <div className="row">
              <ExerciseGlyph name={detail.name} bodyPart={detail.bodyPart} custom={detail.custom} />
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {detail.custom && <Badge tone="success">Yours</Badge>}
                <Badge tone="accent">{detail.target}</Badge>
                <Badge tone="muted">{detail.bodyPart}</Badge>
                <Badge tone="muted">{detail.equipment}</Badge>
                {detail.mechanics && <Badge tone="muted">{detail.mechanics}</Badge>}
              </div>
            </div>

            {usage[detail.id] && (
              <p className="muted" style={{ fontSize: 13 }}>
                You’ve logged this {usage[detail.id].count} time
                {usage[detail.id].count === 1 ? '' : 's'}.
              </p>
            )}

            {detail.instructions.length > 0 && (
              <div>
                <p className="section-title" style={{ marginTop: 0 }}>How to perform</p>
                <ol className="ex-steps">
                  {detail.instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>
            )}

            {detail.exrxUrl && (
              <a className="ex-link" href={detail.exrxUrl} target="_blank" rel="noreferrer noopener">
                More on ExRx.net ↗
              </a>
            )}

            <div className="row">
              {detail.custom && (
                <Button
                  variant="secondary"
                  onClick={() => deleteCustom(detail)}
                  aria-label="Delete exercise"
                >
                  <TrashIcon width={16} height={16} />
                </Button>
              )}
              {onPick && (
                <Button className="grow" onClick={() => { onPick(detail); setDetail(null); }}>
                  Add to workout
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <CustomExerciseForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialName={query.trim()}
        onCreated={async (row) => {
          await loadCustom();
          setQuery('');
          setBodyPart('all');
          setEquipment('all');
          // The exercise was created because it was missing from a workout
          // being built, so add it straight away and close the picker.
          if (onPick) {
            onPick(fromCustomRow(row));
            onClose?.();
          }
        }}
      />
    </>
  );
}
