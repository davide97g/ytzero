import type { clusterMessagesEn } from "./cluster.en";

const settingLabels = { clusterNodes: "Istanze", clusterSettingPort: "Porta", clusterSettingEvents: "Eventi in tempo reale", clusterSettingFeed: "Aggiornamento del feed", clusterSettingChannels: "Sincronizzazione dei canali", clusterSettingPlaylists: "Sincronizzazione delle playlist", clusterSettingPosts: "Post della community", clusterSettingLive: "Controlli delle dirette", clusterSettingAvatars: "Avatar", clusterSettingMetadata: "Metadati dei video", clusterSettingImports: "Arricchimento delle importazioni" };
const compactLabels: Record<string, string> = { clusterHttpRole: "HTTP" };

export const clusterMessagesIt = {
  ...settingLabels,
  clusterTab: "Cluster",
  clusterTitle: "Stato del cluster",
  clusterDescription: "Heartbeat PostgreSQL in tempo reale, ruoli dei nodi, versioni e impostazioni di runtime non riservate.",
  clusterLoading: "Caricamento dello stato del cluster…",
  clusterHealthy: "In salute",
  clusterNeedsAttention: "Richiede attenzione",
  clusterRefresh: "Aggiorna",
  clusterRefreshFailed: "Aggiornamento automatico non riuscito",
  clusterLoadError: "Impossibile caricare lo stato del cluster",
  clusterWarningNoWorker: "Nessun nodo online sta eseguendo attività in background. I download e il lavoro pianificato non verranno elaborati.",
  clusterWarningMultipleWorkers: "Più di un nodo online sta eseguendo attività in background. Mantieni esattamente un worker per evitare lavoro pianificato duplicato.",
  clusterWarningMixedVersions: "I nodi online eseguono build diverse dell'applicazione. Completa il rilascio o controlla il deployment.",
  clusterOnlineNodes: "Online",
  clusterWorkerNodes: "Worker",
  clusterWorkerNodesHint: "Esattamente un nodo dovrebbe avere YTZERO_BACKGROUND_TASKS=1.",
  clusterHttpNodes: "HTTP",
  clusterAutoRefresh: "Si aggiorna ogni 5 secondi. I nodi disconnessi di recente restano visibili fino a un'ora.",
  clusterNoInstances: "Nessuna istanza del cluster trovata",
  clusterNoInstancesHint: "Attendi il prossimo heartbeat o controlla la connessione a PostgreSQL.",
  clusterCurrentNode: "Questo nodo",
  clusterOnline: "Online",
  clusterOffline: "Offline",
  clusterWorkerRole: "Worker + HTTP",
  clusterHttpRole: "Solo HTTP",
  clusterVersion: "Versione",
  clusterStarted: "Tempo di attività",
  clusterLastSeen: "Contatto",
  clusterRuntimeSettings: "Impostazioni di runtime",
  clusterDemoTitle: "Cluster simulato",
  clusterDemoHint: "Questi cinque nodi sono dati di prova. Non è mostrato alcuno stato reale del cluster.",
  ...compactLabels,
} satisfies Record<keyof typeof clusterMessagesEn, string>;
