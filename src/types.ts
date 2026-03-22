
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
  commentaries?: Commentary[];
}

export interface GraphMetadata {
  title: string;
  description?: string;
  createdBy?: string;
  version?: number;
  metaArea?: string;
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
