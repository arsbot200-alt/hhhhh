export interface AppState {
  sessionString: string | null;
  apiId: string;
  apiHash: string;
}

export interface BotConfig {
  groupLink: string;
  streamVideo: boolean;
  enableAutoReply: boolean;
  autoReplyText: string;
}
