
export type NodeType = 'fulltext' | 'notes' | 'REG' | 'background' | 'title' | 'info' | 'youtube' | 'image' | 'html-node';

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
}

export interface KnowledgeDocument {
  nodes: Node[];
  edges: any[];
}
