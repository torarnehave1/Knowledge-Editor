import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, MoreHorizontal, Loader2, Check, AlertCircle, X, LayoutGrid, List, Plus, Sparkles,
  Globe, Trash2, Edit2, Edit3, History, Languages, Rocket, CheckCircle2, LogOut, Bot,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore } from '../store/useStore';
import { nodeTypes, useAddSection } from './addSection';
import { useBrand } from '../branding';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const iconButton = 'size-11 flex-none grid place-items-center rounded-xl text-zinc-600 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800';

// Bottom sheet: the mobile replacement for the sidebar and hover menus.
export function Sheet({ open, onClose, title, subtitle, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden fixed inset-0 z-[95] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/50"
          />
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative max-h-[85dvh] flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div aria-hidden className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 self-center mb-3" />
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
                {subtitle && <p className="text-sm text-zinc-500 truncate">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className={cn(iconButton, 'bg-zinc-100 dark:bg-zinc-800')}>
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto -mx-1 px-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SheetAction({ icon: Icon, label, onClick, danger, disabled }: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full min-h-12 px-3 rounded-xl text-left text-base font-medium active:bg-zinc-100 dark:active:bg-zinc-800 disabled:opacity-40',
        danger ? 'text-red-600 dark:text-red-400' : 'text-zinc-800 dark:text-zinc-200'
      )}
    >
      <Icon size={20} className="flex-none" />
      {label}
    </button>
  );
}

export function MobileHeader() {
  const brand = useBrand();
  const {
    doc, viewMode, setViewMode, currentGraphId, saveGraph, saveStatus, error, setError, user, logout,
    setIsVersionHistoryModalOpen, setIsSEOModalOpen, setIsTranslationModalOpen, togglePublicationState,
  } = useStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isGraphs = viewMode === 'graphs';
  const isPublished = doc.metadata?.publicationState === 'published';
  const run = (action: () => void) => () => { setIsMoreOpen(false); action(); };

  return (
    <header className="md:hidden flex-none bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-10">
      <div className="flex items-center gap-1 pl-1 pr-3 pt-2 pb-2">
        {isGraphs ? (
          <>
            <img
              src={brand.logoUrl}
              alt=""
              className="size-8 rounded-lg ml-3 mr-2"
              referrerPolicy="no-referrer"
            />
            <h1 className="flex-1 text-xl font-bold tracking-tight">Graphs</h1>
          </>
        ) : (
          <>
            <button onClick={() => setViewMode('graphs')} aria-label="Back to graphs" className={iconButton}>
              <ChevronLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold leading-tight truncate">{doc.metadata?.title || 'Untitled Graph'}</p>
              <p className="text-[13px] text-zinc-500 truncate">
                {currentGraphId ? (isPublished ? 'Published' : 'Draft') : 'Not saved'} · {doc.nodes.length} sections
              </p>
            </div>
          </>
        )}
        <button onClick={() => setIsMoreOpen(true)} aria-label="More actions" className={iconButton}>
          <MoreHorizontal size={22} />
        </button>
        {!isGraphs && (
          <button
            onClick={() => saveGraph()}
            disabled={saveStatus === 'saving'}
            className={cn(
              'min-h-11 min-w-[72px] px-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all',
              saveStatus === 'success' ? 'bg-emerald-600' : saveStatus === 'error' ? 'bg-red-600' : 'bg-accent'
            )}
          >
            {saveStatus === 'saving' ? <Loader2 size={18} className="animate-spin" /> :
             saveStatus === 'success' ? <><Check size={18} />Saved</> :
             saveStatus === 'error' ? <><AlertCircle size={18} />Error</> :
             'Save'}
          </button>
        )}
      </div>

      {!isGraphs && (
        <div role="tablist" aria-label="View" className="flex p-[3px] mx-3 mb-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
          {([['edit', 'Edit'], ['preview', 'Preview'], ['json', 'JSON']] as const).map(([mode, label]) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex-1 min-h-11 rounded-[10px] text-base transition-all',
                viewMode === mode
                  ? 'bg-white dark:bg-zinc-800 shadow-sm font-semibold text-zinc-900 dark:text-zinc-100'
                  : 'font-medium text-zinc-500'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mx-3 mb-2.5 pl-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/50">
          <AlertCircle size={16} className="flex-none" />
          <span className="flex-1 py-2">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="size-11 flex-none grid place-items-center">
            <X size={16} />
          </button>
        </div>
      )}

      <Sheet open={isMoreOpen} onClose={() => setIsMoreOpen(false)} title="More" subtitle={user?.email}>
        {!isGraphs && (
          <>
            {currentGraphId && (
              <SheetAction icon={History} label="Version history" onClick={run(() => setIsVersionHistoryModalOpen(true))} />
            )}
            {currentGraphId && (
              <SheetAction icon={Globe} label="SEO page" onClick={run(() => setIsSEOModalOpen(true))} />
            )}
            <SheetAction icon={Languages} label="Translate graph" onClick={run(() => setIsTranslationModalOpen(true))} />
            {currentGraphId && user?.role === 'Superadmin' && (
              <SheetAction
                icon={isPublished ? CheckCircle2 : Rocket}
                label={isPublished ? 'Published — tap to unpublish' : 'Publish — make visible to all users'}
                onClick={run(() => togglePublicationState())}
              />
            )}
          </>
        )}
        <SheetAction icon={LogOut} label="Log out" onClick={run(logout)} danger />
      </Sheet>
    </header>
  );
}

function NavItem({ icon: Icon, label, onClick, active, disabled }: {
  icon: any;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'w-16 min-h-12 flex flex-col items-center justify-center gap-0.5 text-xs disabled:opacity-40',
        active ? 'text-accent font-bold' : 'text-zinc-600 dark:text-zinc-400 font-medium'
      )}
    >
      <Icon size={22} />
      {label}
    </button>
  );
}

export function MobileBottomNav() {
  const {
    viewMode, setViewMode, currentGraphId, isTrashView, setIsTrashView,
    setIsNewGraphModalOpen, setIsReorderModalOpen, setIsSEOModalOpen,
    aiProvider, setAiProvider, aiModel, setAiModel, availableModels,
    agents, setActiveAgentId, setIsAgentModalOpen, setIsAgentChatOpen, deleteAgent,
  } = useStore();
  const [sheet, setSheet] = useState<'add' | 'ai' | null>(null);
  const closeSheet = () => setSheet(null);
  const { handleAddSection, insertingTemplate, videoPicker } = useAddSection(closeSheet);

  const isGraphs = viewMode === 'graphs';
  const select = 'w-full min-h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-base px-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-accent';

  return (
    <>
      <nav
        aria-label="Main"
        className="md:hidden flex-none flex items-center justify-around px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800"
      >
        <NavItem
          icon={LayoutGrid}
          label="Graphs"
          active={isGraphs && !isTrashView}
          onClick={() => { setIsTrashView(false); setViewMode('graphs'); }}
        />
        {isGraphs ? (
          <NavItem icon={Edit2} label="Editor" onClick={() => setViewMode('edit')} />
        ) : (
          <NavItem icon={List} label="Outline" onClick={() => setIsReorderModalOpen(true)} />
        )}
        <button
          onClick={() => (isGraphs ? setIsNewGraphModalOpen(true) : setSheet('add'))}
          aria-label={isGraphs ? 'New graph' : 'Add section'}
          className="size-14 flex-none grid place-items-center rounded-[18px] bg-ink dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-ink/30 active:scale-95 transition-transform"
        >
          <Plus size={26} strokeWidth={2.2} />
        </button>
        <NavItem icon={Sparkles} label="AI" onClick={() => setSheet('ai')} />
        {isGraphs ? (
          <NavItem icon={Trash2} label="Trash" active={isTrashView} onClick={() => setIsTrashView(!isTrashView)} />
        ) : (
          <NavItem icon={Globe} label="SEO" disabled={!currentGraphId} onClick={() => setIsSEOModalOpen(true)} />
        )}
      </nav>

      <Sheet open={sheet === 'add'} onClose={closeSheet} title="Add section" subtitle="Added at the end of the graph">
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((item) => (
            <button
              key={item.label}
              onClick={() => handleAddSection(item)}
              disabled={insertingTemplate === item.label}
              className="flex items-center gap-3 min-h-[60px] px-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left text-[15px] leading-tight font-semibold text-zinc-800 dark:text-zinc-200 active:bg-zinc-50 dark:active:bg-zinc-800 disabled:opacity-50"
            >
              <span className={cn('size-9 flex-none grid place-items-center rounded-[10px]', item.color)}>
                <item.icon size={20} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </Sheet>
      {videoPicker}

      <Sheet
        open={sheet === 'ai'}
        onClose={closeSheet}
        title="AI"
        subtitle={(availableModels[aiProvider] || []).find((m) => m.id === aiModel)?.name || aiModel || 'Select model'}
      >
        <div className="grid grid-cols-2 gap-2 mb-5">
          <label className="text-sm font-semibold text-zinc-500">
            Provider
            <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} className={cn(select, 'mt-1.5')}>
              {Object.keys(availableModels).length > 0 ? (
                Object.keys(availableModels).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))
              ) : (
                <option value="gemini">Gemini</option>
              )}
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-500">
            Model
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className={cn(select, 'mt-1.5')}>
              {(availableModels[aiProvider] || []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="text-sm font-semibold text-zinc-500 mb-1.5">Agents</h3>
        {agents.length === 0 && (
          <p className="text-sm text-zinc-500 py-3">No agents defined yet</p>
        )}
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center">
            <button
              onClick={() => { setActiveAgentId(agent.id); setIsAgentChatOpen(true); closeSheet(); }}
              className="flex-1 min-w-0 flex items-center gap-3 min-h-14 px-1 rounded-xl text-left active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <span className="size-9 flex-none grid place-items-center rounded-[10px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Bot size={18} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-zinc-800 dark:text-zinc-200 truncate">{agent.name}</span>
                <span className="block text-sm text-zinc-500 truncate">{agent.description}</span>
              </span>
            </button>
            <button
              onClick={() => { setActiveAgentId(agent.id); setIsAgentModalOpen(true); closeSheet(); }}
              aria-label={`Edit ${agent.name}`}
              className={iconButton}
            >
              <Edit3 size={18} />
            </button>
            <button onClick={() => deleteAgent(agent.id)} aria-label={`Delete ${agent.name}`} className={iconButton}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <button
          onClick={() => { setIsAgentModalOpen(true); closeSheet(); }}
          className="flex items-center gap-3 w-full min-h-12 px-3 mt-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-base font-medium text-zinc-600 dark:text-zinc-400"
        >
          <Plus size={20} />
          New agent
        </button>
      </Sheet>
    </>
  );
}
