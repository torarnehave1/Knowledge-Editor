
export interface User {
  email: string;
  role: string;
  user_id: string;
  emailVerificationToken?: string;
}

export type NodeType = string;

export interface Commentary {
  id: string;
  text: string;
  author: string;
  initials: string;
  createdAt: string;
}

export interface Node {
  id: string;
  label: string;
  color: string;
  type: NodeType;
  info: string | null;
  bibl: any[];
  imageWidth: string;
  imageHeight: string;
  visible: boolean;
  path: string | null;
  publicUrl?: string | null;
  commentaries?: Commentary[];
  position?: { x: number; y: number };
  // Reading order, shared with GNewViewer and graph-portfolio (1 = top). A node without one
  // falls back to its array position. See sortNodesByOrder / renumberNodes.
  order?: number;
  // Machine data owned by other tools (work contexts, course lessons, registry
  // schema …). The editor shows it read-only and must save it back untouched.
  metadata?: Record<string, any>;
}

export interface GraphMetadata {
  title: string;
  description?: string;
  createdBy?: string;
  version?: number;
  metaArea?: string;
  seoSlug?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoKeywords?: string;
  publicationState?: 'draft' | 'published';
  publishedAt?: string | null;
  // Set by the password-protection node; passwordHash is btoa(password).
  passwordProtected?: boolean;
  passwordHash?: string | null;
}

export interface GraphListItem {
  id: string;
  title: string;
  metaArea?: string;
  metadata?: any;
  categories?: string[];
  nodeTypes?: Record<string, number>;
  nodeCount?: number;
  updatedAt?: string;
}

export interface KnowledgeDocument {
  metadata?: GraphMetadata;
  nodes: Node[];
  edges: any[];
}

export interface ToolMapping {
  id: string;
  purpose: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  description: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  avatarUrl?: string;
  graphId?: string; // Associated graph for context
  createdAt: string;
  model?: string;
  maxTurns?: number;
  temperature?: number;
  modalities?: string[]; // e.g., ['text', 'image', 'video']
  toolMappings?: ToolMapping[];
}

export interface AgentLog {
  id: string;
  timestamp: number;
  type: 'thought' | 'action' | 'result' | 'error';
  content: string;
  data?: any;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  logs?: AgentLog[];
}
