// One interface for every LLM backend that can write a VideoSpec.
export interface SpecRequest {
  system: string;
  user: string;
}

export interface SpecProvider {
  /** Returns the raw model text (expected to contain the VideoSpec JSON). */
  generateSpec(req: SpecRequest): Promise<string>;
}

export class ProviderError extends Error {
  readonly provider: string;
  constructor(provider: string, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
  }
}
