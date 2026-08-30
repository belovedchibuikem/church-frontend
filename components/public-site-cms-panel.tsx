'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminContentItem,
  deleteAdminContentItem,
  listAdminContentPages,
  updateAdminContentItem,
  updateAdminContentPage,
  type AdminContentPage,
} from '../lib/admin-content-api.ts';
import type { ContentPageItem } from '../lib/content-api.ts';
import {
  designFixturesEnabled,
  listMediaAttachments,
  platformApiConfigured,
  platformErrorMessage,
  removeMediaAttachment,
  uploadMediaAttachment,
} from '../lib/admin-platform-api.ts';

const ITEM_KINDS = ['heading', 'pillar', 'card', 'metric', 'faq', 'sermon', 'partner', 'schedule', 'block'] as const;

const PAGE_HINTS: Record<string, string> = {
  home: 'Home: hero title/summary, Four Pillars (pillar), Get Started (card), section labels (heading).',
  church: 'Church landing cards and hero image. Location photos are edited on Churches + Media.',
  mission: 'Mission landing cards and hero. Crusade photos are edited on Mission → Crusades.',
  kca: 'KCA landing cards (Why Join, Apply, Verify) and hero image.',
  press: 'Press landing intro cards and hero. Book covers are edited on Press publications.',
  'online-church': 'Online Church hero, overview cards, and schedule rows.',
  events: 'Events page hero title, summary, and hero image. Event records stay in Events admin.',
  giving: 'Give page cards and hero copy.',
  about: 'About page body and cards.',
  vision: 'Vision page copy and cards.',
  faq: 'FAQ questions (title) and answers (body).',
};

type PageDraft = {
  title: string;
  summary: string;
  body: string;
  published: boolean;
};

type ItemDraft = {
  kind: string;
  title: string;
  body: string;
  href: string;
  sort_order: string;
  published: boolean;
};

function itemId(item: ContentPageItem): string {
  return item.id || item.public_id || '';
}

function pageId(page: AdminContentPage): string {
  return page.id || page.public_id || '';
}

function toDraft(page: AdminContentPage): PageDraft {
  return {
    title: page.title ?? '',
    summary: page.summary ?? '',
    body: page.body ?? '',
    published: Boolean(page.published_at),
  };
}

function toItemDraft(item: ContentPageItem): ItemDraft {
  return {
    kind: item.kind || 'card',
    title: item.title ?? '',
    body: item.body ?? '',
    href: item.href ?? '',
    sort_order: String(item.sort_order ?? 0),
    published: Boolean(item.published_at),
  };
}

function publishedAt(next: boolean, current: string | null | undefined): string | null {
  if (!next) return null;
  return current || new Date().toISOString();
}

async function attachImage(file: File, attachableType: 'content_page' | 'content_item', attachableId: string, role: 'hero' | 'cover') {
  const payload = new FormData();
  payload.append('file', file);
  payload.append('attachable_type', attachableType);
  payload.append('attachable_id', attachableId);
  payload.append('role', role);
  payload.append('purpose', 'media.public');
  payload.append('classification', 'public');
  await uploadMediaAttachment(payload);
}

export function PublicSiteCmsPanel() {
  const fixtures = designFixturesEnabled();
  const [pages, setPages] = useState<AdminContentPage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [newItem, setNewItem] = useState<ItemDraft>({
    kind: 'card',
    title: '',
    body: '',
    href: '',
    sort_order: '0',
    published: true,
  });
  const [message, setMessage] = useState('Loading public site pages…');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => pages.find((page) => pageId(page) === selectedId) ?? null,
    [pages, selectedId],
  );

  const refresh = useCallback(async (keepId?: string) => {
    if (fixtures) {
      setMessage('Design fixtures are on — public site CMS saves are disabled.');
      return;
    }
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL so public site CMS can load and save.');
      return;
    }
    const rows = await listAdminContentPages();
    setPages(rows);
    const nextId = (keepId && rows.some((row) => pageId(row) === keepId)
      ? keepId
      : rows[0]
        ? pageId(rows[0])
        : '');
    setSelectedId(nextId);
    const nextPage = rows.find((row) => pageId(row) === nextId);
    setDraft(nextPage ? toDraft(nextPage) : null);
    const drafts: Record<string, ItemDraft> = {};
    for (const item of nextPage?.items ?? []) {
      const id = itemId(item);
      if (id) drafts[id] = toItemDraft(item);
    }
    setItemDrafts(drafts);
    setMessage(rows.length ? `${rows.length} public pages ready to edit.` : 'No CMS pages yet. Seed content pages first.');
  }, [fixtures]);

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage(platformErrorMessage(error, 'Unable to load CMS pages. Confirm platform.configuration.manage and recent MFA.'));
    });
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    setDraft(toDraft(selected));
    const drafts: Record<string, ItemDraft> = {};
    for (const item of selected.items ?? []) {
      const id = itemId(item);
      if (id) drafts[id] = toItemDraft(item);
    }
    setItemDrafts(drafts);
  }, [selected]);

  async function savePage() {
    if (!selected || !draft) return;
    setBusy(true);
    try {
      await updateAdminContentPage(pageId(selected), {
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        published_at: publishedAt(draft.published, selected.published_at),
      });
      setMessage('Page copy saved. It is live on the public site.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not save this page.'));
    } finally {
      setBusy(false);
    }
  }

  async function onHeroUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const file = (form.elements.namedItem('hero') as HTMLInputElement | null)?.files?.[0];
    if (!file) {
      setMessage('Choose a hero image first.');
      return;
    }
    setBusy(true);
    try {
      await attachImage(file, 'content_page', pageId(selected), 'hero');
      form.reset();
      setMessage('Hero image updated.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Hero upload failed. Use PNG, JPEG, or WebP under 25MB.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeHero() {
    if (!selected?.image_url) return;
    setBusy(true);
    try {
      const media = await listMediaAttachments();
      const hero = media.find((row) => row.attachable?.id === pageId(selected) && (row.role === 'hero' || row.role === 'cover'));
      if (hero) await removeMediaAttachment(hero.id);
      setMessage('Hero image removed.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not remove the hero image.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item: ContentPageItem) {
    if (!selected) return;
    const id = itemId(item);
    const draftItem = itemDrafts[id];
    if (!id || !draftItem) return;
    setBusy(true);
    try {
      await updateAdminContentItem(pageId(selected), id, {
        kind: draftItem.kind,
        title: draftItem.title,
        body: draftItem.body,
        href: draftItem.href || null,
        sort_order: Number.parseInt(draftItem.sort_order, 10) || 0,
        published_at: publishedAt(draftItem.published, item.published_at),
      });
      setMessage(`Saved “${draftItem.title || 'item'}”.`);
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not save this block.'));
    } finally {
      setBusy(false);
    }
  }

  async function onItemImage(item: ContentPageItem, file: File) {
    if (!selected) return;
    const id = itemId(item);
    if (!id) return;
    setBusy(true);
    try {
      await attachImage(file, 'content_item', id, 'cover');
      setMessage('Card image updated.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Card image upload failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: ContentPageItem) {
    if (!selected) return;
    const id = itemId(item);
    if (!id || !window.confirm(`Delete “${item.title ?? 'this block'}”? This removes it from the public page.`)) return;
    setBusy(true);
    try {
      await deleteAdminContentItem(pageId(selected), id);
      setMessage('Block deleted.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not delete this block.'));
    } finally {
      setBusy(false);
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!newItem.title.trim() || !newItem.body.trim()) {
      setMessage('Title and description are required for a new block.');
      return;
    }
    setBusy(true);
    try {
      await createAdminContentItem(pageId(selected), {
        kind: newItem.kind,
        title: newItem.title.trim(),
        body: newItem.body.trim(),
        href: newItem.href.trim() || null,
        sort_order: Number.parseInt(newItem.sort_order, 10) || (selected.items?.length ?? 0),
        published_at: publishedAt(newItem.published, null),
      });
      setNewItem({ kind: 'card', title: '', body: '', href: '', sort_order: String((selected.items?.length ?? 0) + 1), published: true });
      setMessage('Block added.');
      await refresh(pageId(selected));
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not add this block.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-cms">
      <aside className="card public-cms-nav">
        <h2>Pages</h2>
        <p className="public-cms-hint" role="status">{message}</p>
        <div className="public-cms-nav-list">
          {pages.map((page) => {
            const id = pageId(page);
            return (
              <button
                type="button"
                className={id === selectedId ? 'active' : ''}
                key={id || page.slug}
                disabled={busy}
                onClick={() => setSelectedId(id)}
              >
                {page.title || page.slug}
                <small>{page.slug}{page.published_at ? '' : ' · draft'}</small>
              </button>
            );
          })}
        </div>
      </aside>
      <div>
        {selected && draft ? (
          <>
            <article className="card public-cms-editor">
              <h2>{selected.title || selected.slug}</h2>
              <p className="public-cms-hint">{PAGE_HINTS[selected.slug] ?? 'Edit the headline, summary, body, and hero image for this public page.'}</p>
              <div className="form-grid">
                <label>
                  <span>Headline</span>
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} disabled={busy || fixtures} />
                </label>
                <label>
                  <span>Published</span>
                  <select
                    value={draft.published ? 'yes' : 'no'}
                    onChange={(event) => setDraft({ ...draft, published: event.target.value === 'yes' })}
                    disabled={busy || fixtures}
                  >
                    <option value="yes">Yes — visible on the public site</option>
                    <option value="no">No — hidden</option>
                  </select>
                </label>
                <label className="full">
                  <span>Summary / subtitle</span>
                  <input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} disabled={busy || fixtures} />
                </label>
                <label className="full">
                  <span>Body</span>
                  <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} disabled={busy || fixtures} />
                </label>
              </div>
              <div className="form-footer">
                <button className="primary-button" type="button" disabled={busy || fixtures} onClick={() => void savePage()}>
                  Save page copy
                </button>
              </div>
              {selected.image_url ? <img className="public-cms-hero-preview" src={selected.image_url} alt="" /> : null}
              <form className="form-grid" onSubmit={(event) => void onHeroUpload(event)}>
                <label className="full">
                  <span>Hero / banner image</span>
                  <input name="hero" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || fixtures} />
                </label>
                <div className="form-footer">
                  <button className="primary-button" type="submit" disabled={busy || fixtures}>Upload hero image</button>
                  {selected.image_url ? (
                    <button className="ghost-button" type="button" disabled={busy || fixtures} onClick={() => void removeHero()}>
                      Remove hero
                    </button>
                  ) : null}
                </div>
              </form>
            </article>

            <div className="public-cms-items">
              {(selected.items ?? []).map((item) => {
                const id = itemId(item);
                const itemDraft = itemDrafts[id] ?? toItemDraft(item);
                return (
                  <article className="card public-cms-item" key={id || `${item.kind}-${item.title}`}>
                    <div className="public-cms-item-head">
                      <h3>{itemDraft.title || 'Untitled block'}</h3>
                      <button className="ghost-button" type="button" disabled={busy || fixtures} onClick={() => void removeItem(item)}>
                        Delete
                      </button>
                    </div>
                    {item.image_url ? <img className="public-cms-cover-preview" src={item.image_url} alt="" /> : null}
                    <div className="form-grid">
                      <label>
                        <span>Kind</span>
                        <select
                          value={itemDraft.kind}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, kind: event.target.value } }))}
                          disabled={busy || fixtures}
                        >
                          {ITEM_KINDS.map((kind) => (
                            <option key={kind} value={kind}>{kind}</option>
                          ))}
                          {!ITEM_KINDS.includes(itemDraft.kind as (typeof ITEM_KINDS)[number]) ? <option value={itemDraft.kind}>{itemDraft.kind}</option> : null}
                        </select>
                      </label>
                      <label>
                        <span>Sort</span>
                        <input
                          value={itemDraft.sort_order}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, sort_order: event.target.value } }))}
                          disabled={busy || fixtures}
                        />
                      </label>
                      <label className="full">
                        <span>Title</span>
                        <input
                          value={itemDraft.title}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, title: event.target.value } }))}
                          disabled={busy || fixtures}
                        />
                      </label>
                      <label className="full">
                        <span>Description</span>
                        <textarea
                          value={itemDraft.body}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, body: event.target.value } }))}
                          disabled={busy || fixtures}
                        />
                      </label>
                      <label>
                        <span>Link URL</span>
                        <input
                          value={itemDraft.href}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, href: event.target.value } }))}
                          disabled={busy || fixtures}
                        />
                      </label>
                      <label>
                        <span>Published</span>
                        <select
                          value={itemDraft.published ? 'yes' : 'no'}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [id]: { ...itemDraft, published: event.target.value === 'yes' } }))}
                          disabled={busy || fixtures}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                      <label className="full">
                        <span>Card image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={busy || fixtures}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void onItemImage(item, file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <div className="form-footer">
                      <button className="primary-button" type="button" disabled={busy || fixtures} onClick={() => void saveItem(item)}>
                        Save block
                      </button>
                    </div>
                  </article>
                );
              })}

              <form className="card public-cms-item" onSubmit={(event) => void addItem(event)}>
                <h3>Add a block</h3>
                <div className="form-grid">
                  <label>
                    <span>Kind</span>
                    <select value={newItem.kind} onChange={(event) => setNewItem({ ...newItem, kind: event.target.value })} disabled={busy || fixtures}>
                      {ITEM_KINDS.map((kind) => (
                        <option key={kind} value={kind}>{kind}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Sort</span>
                    <input value={newItem.sort_order} onChange={(event) => setNewItem({ ...newItem, sort_order: event.target.value })} disabled={busy || fixtures} />
                  </label>
                  <label className="full">
                    <span>Title</span>
                    <input value={newItem.title} onChange={(event) => setNewItem({ ...newItem, title: event.target.value })} disabled={busy || fixtures} />
                  </label>
                  <label className="full">
                    <span>Description</span>
                    <textarea value={newItem.body} onChange={(event) => setNewItem({ ...newItem, body: event.target.value })} disabled={busy || fixtures} />
                  </label>
                  <label className="full">
                    <span>Link URL</span>
                    <input value={newItem.href} onChange={(event) => setNewItem({ ...newItem, href: event.target.value })} disabled={busy || fixtures} />
                  </label>
                </div>
                <div className="form-footer">
                  <button className="primary-button" type="submit" disabled={busy || fixtures}>Add block</button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <article className="card public-cms-editor">
            <p className="public-cms-hint">{message}</p>
          </article>
        )}
      </div>
    </div>
  );
}
