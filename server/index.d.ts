export interface ApiServer {
  listen(port: number, host: string, callback: () => void): this;
  address(): { port: number } | string | null;
  close(callback: (error?: Error) => void): this;
}

export declare function createApiServer(options?: {
  now?: () => number;
  rateLimit?: number;
}): ApiServer;