/**
 * Knowledge Graph Types for MSME Entity Management
 * V1: Lean, deterministic matching with stable IDs
 */

export interface Entity {
  id: string; // Stable URN format: "urn:msme:entity:type:id"
  type: EntityType;
  canonicalName: string;
  aliases: Alias[];
  metadata: EntityMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Alias {
  id: string;
  text: string;
  language: 'en' | 'hi';
  type: 'exact' | 'synonym' | 'abbreviation' | 'translation';
  confidence: number; // 0-1, for fuzzy matching
  isApproved: boolean;
  submittedBy?: string; // User ID who submitted
  submittedAt?: string;
}

export interface EntityMetadata {
  description?: string;
  category?: string;
  parentId?: string; // For hierarchical entities
  tags: string[];
  isActive: boolean;
  usageCount: number; // Track how often this entity is used
}

export type EntityType = 
  | 'industry'
  | 'skill'
  | 'location'
  | 'department'
  | 'job_title'
  | 'company_size'
  | 'certification'
  | 'technology'
  | 'service_type';

export interface MatchResult {
  entity: Entity;
  alias: Alias;
  score: number; // 0-1, higher is better match
  matchType: 'exact' | 'fuzzy' | 'trigram';
}

export interface SearchOptions {
  type?: EntityType;
  language?: 'en' | 'hi';
  limit?: number;
  minScore?: number;
}

export interface PendingAlias {
  id: string;
  entityId?: string; // If linking to existing entity
  text: string;
  language: 'en' | 'hi';
  type: 'exact' | 'synonym' | 'abbreviation' | 'translation';
  context?: string; // Where user submitted this from
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface TypeaheadResult {
  id: string;
  text: string;
  entityId: string;
  entityType: EntityType;
  canonicalName: string;
  score: number;
  isExact: boolean;
}
