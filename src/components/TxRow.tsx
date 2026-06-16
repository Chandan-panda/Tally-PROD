import { useAccounts, useCategories } from '../api'
import { Money, cls } from './ui'
import type { Transaction } from '../types'

export default function TxRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const cat = categories.find(c => c.id === tx.category_id)
  const acc = accounts.find(a => a.id === tx.account_id)
  const toAcc = accounts.find(a => a.id === tx.to_account_id)
  const isTransfer = tx.type === 'transfer'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface2"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2 text-lg">
        {isTransfer ? '\u21c4' : cat?.icon || '\u2728'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {tx.note || (isTransfer ? `${acc?.name || '?'} \u2192 ${toAcc?.name || '?'}` : cat?.name || 'Uncategorized')}
        </span>
        <span className="block truncate text-xs text-soft">
          {isTransfer ? 'Transfer' : `${cat?.name || 'Uncategorized'} \u00b7 ${acc?.name || ''}`}
          {tx.tags?.length ? ` \u00b7 ${tx.tags.map(t => `#${t}`).join(' ')}` : ''}
        </span>
      </span>
      <span className={cls('shrink-0 text-sm font-semibold tabular-nums', tx.type === 'income' ? 'text-pos' : tx.type === 'expense' ? 'text-neg' : 'text-soft')}>
        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '\u2212' : ''}<Money n={Number(tx.amount)} />
      </span>
    </button>
  )
}
