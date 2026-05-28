import { Match } from '../lib/api';
import { resultBadge, formatDate, surfaceIcon, countryFlag } from '../lib/utils';

type Props = { match: Match; showPlayer?: boolean };

export default function MatchRow({ match, showPlayer }: Props) {
  const badge = resultBadge(match.result);
  const playerColor = match.playerId === 1 ? 'text-santiago' : 'text-nicole';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <span className={`text-xs font-bold px-2 py-1 rounded-md min-w-[28px] text-center ${badge.bg} ${badge.text}`}>{badge.label}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
          {showPlayer && <span className={`text-xs ${playerColor} font-semibold`}>{match.player?.name.split(' ')[0]}</span>}
          <span className="truncate">{match.opponentName}</span>
          {match.opponentNationality && <span className="text-gray-400 text-xs">{match.opponentNationality}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          {match.score && <span className="font-mono">{match.score}</span>}
          {match.round && <span className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{match.round}</span>}
          {match.surface && <span>{surfaceIcon[match.surface] || ''}</span>}
          {match.country && <span>{countryFlag[match.country] || match.country}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-gray-500 dark:text-slate-400">{formatDate(match.date)}</div>
        {match.tournament && <div className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[80px]">{match.tournament.name}</div>}
      </div>
    </div>
  );
}
