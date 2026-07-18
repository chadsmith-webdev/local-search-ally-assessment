export interface Repository<TRecord extends { id: string }> {
  findById(id: string): Promise<TRecord | null>;
  save(record: TRecord): Promise<TRecord>;
}

export interface IdempotencyStore {
  hasProcessed(key: string): Promise<boolean>;
  markProcessed(key: string): Promise<void>;
}

export class InMemoryRepository<TRecord extends { id: string }> implements Repository<TRecord> {
  private readonly records = new Map<string, TRecord>();

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async save(record: TRecord) {
    this.records.set(record.id, record);
    return record;
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly keys = new Set<string>();

  async hasProcessed(key: string) {
    return this.keys.has(key);
  }

  async markProcessed(key: string) {
    this.keys.add(key);
  }
}
