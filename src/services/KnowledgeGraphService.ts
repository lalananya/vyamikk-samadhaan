/**
 * Knowledge Graph Service - Deterministic Entity Matching
 * V1: Lean implementation with JSON storage and fuzzy matching
 */

import { Entity, Alias, MatchResult, SearchOptions, TypeaheadResult, PendingAlias, EntityType } from '../types/KnowledgeGraph';

class KnowledgeGraphService {
  private static instance: KnowledgeGraphService;
  private entities: Map<string, Entity> = new Map();
  private aliases: Map<string, Alias> = new Map();
  private pendingAliases: Map<string, PendingAlias> = new Map();
  private isInitialized = false;

  static getInstance(): KnowledgeGraphService {
    if (!KnowledgeGraphService.instance) {
      KnowledgeGraphService.instance = new KnowledgeGraphService();
    }
    return KnowledgeGraphService.instance;
  }

  /**
   * Initialize the knowledge graph with seed data
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load seed data from JSON files
      await this.loadSeedData();
      this.isInitialized = true;
      console.log('🧠 Knowledge Graph initialized with', this.entities.size, 'entities');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph:', error);
      throw error;
    }
  }

  /**
   * Load seed data from JSON files
   */
  private async loadSeedData(): Promise<void> {
    // For now, we'll create some sample data
    // In production, this would load from /server/kg/seeds/*.json
    const sampleEntities = this.createSampleEntities();
    
    sampleEntities.forEach(entity => {
      this.entities.set(entity.id, entity);
      entity.aliases.forEach(alias => {
        this.aliases.set(alias.id, alias);
      });
    });
  }

  /**
   * Create sample entities for V1
   */
  private createSampleEntities(): Entity[] {
    return [
      {
        id: 'urn:msme:entity:industry:manufacturing',
        type: 'industry',
        canonicalName: 'Manufacturing',
        aliases: [
          { id: 'alias-1', text: 'Manufacturing', language: 'en', type: 'exact', confidence: 1.0, isApproved: true },
          { id: 'alias-2', text: 'Production', language: 'en', type: 'synonym', confidence: 0.9, isApproved: true },
          { id: 'alias-3', text: 'उत्पादन', language: 'hi', type: 'translation', confidence: 0.95, isApproved: true },
          { id: 'alias-4', text: 'MFG', language: 'en', type: 'abbreviation', confidence: 0.8, isApproved: true },
        ],
        metadata: {
          description: 'Manufacturing and production industries',
          category: 'Primary',
          tags: ['production', 'factory', 'assembly'],
          isActive: true,
          usageCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'urn:msme:entity:skill:welding',
        type: 'skill',
        canonicalName: 'Welding',
        aliases: [
          { id: 'alias-5', text: 'Welding', language: 'en', type: 'exact', confidence: 1.0, isApproved: true },
          { id: 'alias-6', text: 'वेल्डिंग', language: 'hi', type: 'translation', confidence: 0.95, isApproved: true },
          { id: 'alias-7', text: 'Metal Joining', language: 'en', type: 'synonym', confidence: 0.85, isApproved: true },
        ],
        metadata: {
          description: 'Metal welding and joining skills',
          category: 'Technical',
          tags: ['metalwork', 'construction', 'repair'],
          isActive: true,
          usageCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'urn:msme:entity:location:delhi',
        type: 'location',
        canonicalName: 'Delhi',
        aliases: [
          { id: 'alias-8', text: 'Delhi', language: 'en', type: 'exact', confidence: 1.0, isApproved: true },
          { id: 'alias-9', text: 'दिल्ली', language: 'hi', type: 'translation', confidence: 0.95, isApproved: true },
          { id: 'alias-10', text: 'New Delhi', language: 'en', type: 'synonym', confidence: 0.9, isApproved: true },
          { id: 'alias-11', text: 'NCR', language: 'en', type: 'abbreviation', confidence: 0.7, isApproved: true },
        ],
        metadata: {
          description: 'National Capital Territory of Delhi',
          category: 'Metropolitan',
          tags: ['capital', 'ncr', 'north'],
          isActive: true,
          usageCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Search for entities with typeahead functionality
   */
  async search(query: string, options: SearchOptions = {}): Promise<TypeaheadResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    const results: TypeaheadResult[] = [];

    // Search through all aliases
    for (const alias of this.aliases.values()) {
      if (!alias.isApproved) continue;
      if (options.type && this.entities.get(alias.id)?.type !== options.type) continue;
      if (options.language && alias.language !== options.language) continue;

      const score = this.calculateMatchScore(normalizedQuery, alias.text, alias.type);
      
      if (score >= (options.minScore || 0.3)) {
        const entity = this.entities.get(alias.id);
        if (!entity) continue;

        results.push({
          id: alias.id,
          text: alias.text,
          entityId: entity.id,
          entityType: entity.type,
          canonicalName: entity.canonicalName,
          score,
          isExact: score === 1.0,
        });
      }
    }

    // Sort by score (highest first) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Find exact matches for an entity
   */
  async findExactMatches(query: string, type?: EntityType): Promise<MatchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    const results: MatchResult[] = [];

    for (const alias of this.aliases.values()) {
      if (!alias.isApproved) continue;
      if (type && this.entities.get(alias.id)?.type !== type) continue;

      const normalizedAlias = this.normalizeText(alias.text);
      if (normalizedAlias === normalizedQuery) {
        const entity = this.entities.get(alias.id);
        if (!entity) continue;

        results.push({
          entity,
          alias,
          score: 1.0,
          matchType: 'exact',
        });
      }
    }

    return results;
  }

  /**
   * Submit a pending alias for review
   */
  async submitPendingAlias(
    text: string,
    language: 'en' | 'hi',
    type: 'exact' | 'synonym' | 'abbreviation' | 'translation',
    context?: string,
    entityId?: string
  ): Promise<string> {
    const pendingAlias: PendingAlias = {
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityId,
      text: text.trim(),
      language,
      type,
      context,
      submittedBy: 'current-user', // TODO: Get from auth context
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    this.pendingAliases.set(pendingAlias.id, pendingAlias);
    
    // TODO: In production, persist to database
    console.log('📝 Pending alias submitted:', pendingAlias);
    
    return pendingAlias.id;
  }

  /**
   * Get all pending aliases for admin review
   */
  async getPendingAliases(): Promise<PendingAlias[]> {
    return Array.from(this.pendingAliases.values())
      .filter(alias => alias.status === 'pending')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  /**
   * Approve a pending alias
   */
  async approvePendingAlias(aliasId: string, entityId: string, reviewedBy: string): Promise<void> {
    const pendingAlias = this.pendingAliases.get(aliasId);
    if (!pendingAlias) throw new Error('Pending alias not found');

    // Create new alias
    const newAlias: Alias = {
      id: `alias-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: pendingAlias.text,
      language: pendingAlias.language,
      type: pendingAlias.type,
      confidence: 0.8, // Default confidence for user-submitted aliases
      isApproved: true,
      submittedBy: pendingAlias.submittedBy,
      submittedAt: pendingAlias.submittedAt,
    };

    // Add to entity
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.aliases.push(newAlias);
      entity.updatedAt = new Date().toISOString();
      this.aliases.set(newAlias.id, newAlias);
    }

    // Update pending alias status
    pendingAlias.status = 'approved';
    pendingAlias.entityId = entityId;
    pendingAlias.reviewedBy = reviewedBy;
    pendingAlias.reviewedAt = new Date().toISOString();

    console.log('✅ Pending alias approved:', newAlias);
  }

  /**
   * Reject a pending alias
   */
  async rejectPendingAlias(aliasId: string, reviewedBy: string, notes?: string): Promise<void> {
    const pendingAlias = this.pendingAliases.get(aliasId);
    if (!pendingAlias) throw new Error('Pending alias not found');

    pendingAlias.status = 'rejected';
    pendingAlias.reviewedBy = reviewedBy;
    pendingAlias.reviewedAt = new Date().toISOString();
    pendingAlias.notes = notes;

    console.log('❌ Pending alias rejected:', pendingAlias);
  }

  /**
   * Normalize text for matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculate match score between query and alias text
   */
  private calculateMatchScore(query: string, aliasText: string, aliasType: string): number {
    const normalizedQuery = this.normalizeText(query);
    const normalizedAlias = this.normalizeText(aliasText);

    // Exact match
    if (normalizedQuery === normalizedAlias) {
      return 1.0;
    }

    // Starts with
    if (normalizedAlias.startsWith(normalizedQuery)) {
      return 0.9;
    }

    // Contains
    if (normalizedAlias.includes(normalizedQuery)) {
      return 0.7;
    }

    // Fuzzy matching using simple character overlap
    const overlap = this.calculateCharacterOverlap(normalizedQuery, normalizedAlias);
    return Math.max(0, overlap - 0.3); // Minimum threshold
  }

  /**
   * Calculate character overlap for fuzzy matching
   */
  private calculateCharacterOverlap(str1: string, str2: string): number {
    const chars1 = new Set(str1.split(''));
    const chars2 = new Set(str2.split(''));
    
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string): Promise<Entity | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.entities.get(entityId) || null;
  }

  /**
   * Get all entities of a specific type
   */
  async getEntitiesByType(type: EntityType): Promise<Entity[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return Array.from(this.entities.values()).filter(entity => entity.type === type);
  }
}

export const knowledgeGraphService = KnowledgeGraphService.getInstance();

