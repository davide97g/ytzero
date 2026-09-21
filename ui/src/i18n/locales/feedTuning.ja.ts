import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesJa = {
  displayFeedTuning: "フィード調整",
  feedTuningHint: "どこまで見たら視聴済みとするか、更新時にホームが何を読み直すか。同じしきい値が「続きを見る」の内容と、おすすめが視聴済みとみなす基準を決めます。おすすめのスコア調整は 設定 → プラグイン → おすすめ にあります。",
  feedCompleteRatio: "視聴済みとみなす位置",
  feedCompleteRatioHint: "これを超えた動画は「続きを見る」から外れ、視聴済みにしていなくてもホームには戻りません。",
  feedProgressMinSeconds: "再生位置を記録する最小秒数",
  feedProgressMinSecondsHint: "これ未満は視聴ではなく一瞥とみなし、再生位置を残しません。",
  feedProgressMinDuration: "再開できる最短の動画",
  feedProgressMinDurationHint: "これより短い動画は常に一度で見終えたものとして扱います。",
  feedContinueLimit: "「続きを見る」の本数",
  feedContinueLimitHint: "見終えていない動画を一度に何本並べるか。",
  feedRefreshScope: "更新時に読み直す範囲",
  feedRefreshScopeHint: "新着を取得したあと、ホームの更新ボタンが何を作り直すか。",
  feedRefreshScopeVideos: "動画のグリッド",
  feedRefreshScopeEverything: "ページ全体",
  feedTuningSortHint: "ホームの並び順。更新直後も同じ順序です。",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
