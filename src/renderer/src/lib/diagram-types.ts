export type NodeKind =
  // Compute
  | "physical"
  | "vm"
  | "container"
  | "pod"
  | "serverless"
  | "worker"
  // Orchestration
  | "cluster-component"
  | "namespace"
  | "workload"
  | "deployment"
  | "statefulset"
  | "daemonset"
  // Networking
  | "network"
  | "load-balancer"
  | "api-gateway"
  | "cdn"
  | "dns"
  | "firewall"
  | "proxy"
  // Storage & Data
  | "database"
  | "cache"
  | "object-storage"
  | "block-storage"
  | "file-storage"
  | "data-lake"
  | "data-warehouse"
  // Security
  | "auth-provider"
  | "secrets-manager"
  | "certificate"
  | "vpn"
  | "waf"
  // Monitoring
  | "monitoring"
  | "logging"
  | "tracing"
  | "alerting"
  | "dashboard"
  // CI/CD
  | "ci-cd"
  | "build-pipeline"
  | "artifact-registry"
  | "container-registry"
  | "deployment-pipeline"
  // Users & External
  | "user"
  | "client"
  | "external-access"
  | "third-party-api"
  | "browser"
  // Messaging
  | "message-queue"
  | "event-bus"
  | "kafka"
  | "pubsub"
  | "webhook"
  | "notification-service"
  // Grouping
  | "group"
  | "region"
  | "availability-zone"
  | "subnet"
  // Flow
  | "decision"
  | "process"
  | "start"
  | "end"
  | "terminal"
  | "input-output"
  | "subprocess"
  // Annotation
  | "text";

export type EdgeKind =
  | "lan"
  | "tailscale"
  | "overlay"
  | "routes-to"
  | "provisions"
  | "stores-in"
  | "yes"
  | "no"
  | "conditional"
  | "flow";

export type NodeShape = "rectangle" | "rounded" | "diamond" | "ellipse";
export type LineStyle = "solid" | "dashed" | "dotted";
export type ArrowStyle = "forward" | "both" | "none";
/** Which handle (edge midpoint) on a node a connection attaches to. Values
 * match React Flow's `Position` enum so they can be used as Handle ids
 * directly — keep these lowercase. */
export type HandleSide = "top" | "right" | "bottom" | "left";

export interface DiagramNodeData {
  id: string;
  /** A preset {@link NodeKind} key, or free text the user typed for a
   * custom kind that isn't in the preset list — see {@link isKnownNodeKind},
   * {@link nodeColorFor}, {@link nodeLabelFor}, {@link nodeShapeFor}. */
  kind: string;
  label: string;
  /** Id of the containing node, or null at the top level. */
  parentId: string | null;
  /** Whether this node's children are currently rendered inline. */
  expanded: boolean;
  position: { x: number; y: number };
  /** Size while expanded (sized to fit children). */
  size?: { width: number; height: number };
  /** Size while collapsed, if the user has manually resized it. */
  collapsedSize?: { width: number; height: number };
  description?: string;
  shape?: NodeShape;
  /** Overrides the kind's default accent color. */
  fillColor?: string;
  borderStyle?: LineStyle;
  /** Whether the box background is tinted (default/undefined) or fully
   * transparent, showing just the outline — an Excalidraw-style option. */
  filled?: boolean;
  /** Font size for "text" kind nodes only. */
  fontSize?: TextSize;
}

export type TextSize = "sm" | "md" | "lg" | "xl";

export const TEXT_SIZE_PX: Record<TextSize, number> = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
};

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
};

export interface DiagramEdgeData {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
  lineStyle?: LineStyle;
  arrowStyle?: ArrowStyle;
  /** Which side of the source node this edge leaves from, if pinned. */
  sourceHandle?: HandleSide;
  /** Which side of the target node this edge arrives at, if pinned. */
  targetHandle?: HandleSide;
}

export interface DiagramDocument {
  nodes: DiagramNodeData[];
  edges: DiagramEdgeData[];
}

export const EDGE_STYLES: Record<EdgeKind, { stroke: string; lineStyle: LineStyle }> = {
  lan: { stroke: "#60a5fa", lineStyle: "solid" },
  tailscale: { stroke: "#a78bfa", lineStyle: "dashed" },
  overlay: { stroke: "#fbbf24", lineStyle: "dashed" },
  "routes-to": { stroke: "#34d399", lineStyle: "solid" },
  provisions: { stroke: "#f472b6", lineStyle: "solid" },
  "stores-in": { stroke: "#94a3b8", lineStyle: "dotted" },
  yes: { stroke: "#22c55e", lineStyle: "solid" },
  no: { stroke: "#ef4444", lineStyle: "solid" },
  conditional: { stroke: "#f59e0b", lineStyle: "dashed" },
  flow: { stroke: "#9ca3af", lineStyle: "solid" },
};

export const NODE_COLORS: Record<NodeKind, string> = {
  // Compute
  physical: "#64748b",
  vm: "#3b82f6",
  container: "#0ea5e9",
  pod: "#06b6d4",
  serverless: "#a855f7",
  worker: "#818cf8",
  // Orchestration
  "cluster-component": "#8b5cf6",
  namespace: "#f59e0b",
  workload: "#10b981",
  deployment: "#22c55e",
  statefulset: "#059669",
  daemonset: "#0d9488",
  // Networking
  network: "#06b6d4",
  "load-balancer": "#f59e0b",
  "api-gateway": "#eab308",
  cdn: "#84cc16",
  dns: "#22c55e",
  firewall: "#ef4444",
  proxy: "#f97316",
  // Storage & Data
  database: "#10b981",
  cache: "#14b8a6",
  "object-storage": "#059669",
  "block-storage": "#0d9488",
  "file-storage": "#0891b2",
  "data-lake": "#0e7490",
  "data-warehouse": "#155e75",
  // Security
  "auth-provider": "#e11d48",
  "secrets-manager": "#be123c",
  certificate: "#fb7185",
  vpn: "#f43f5e",
  waf: "#dc2626",
  // Monitoring
  monitoring: "#22d3ee",
  logging: "#67e8f9",
  tracing: "#38bdf8",
  alerting: "#f87171",
  dashboard: "#0ea5e9",
  // CI/CD
  "ci-cd": "#a3e635",
  "build-pipeline": "#84cc16",
  "artifact-registry": "#65a30d",
  "container-registry": "#4d7c0f",
  "deployment-pipeline": "#65a30d",
  // Users & External
  user: "#ec4899",
  client: "#f472b6",
  "external-access": "#f43f5e",
  "third-party-api": "#fb923c",
  browser: "#fbbf24",
  // Messaging
  "message-queue": "#f97316",
  "event-bus": "#fb923c",
  kafka: "#ea580c",
  pubsub: "#f59e0b",
  webhook: "#d97706",
  "notification-service": "#f59e0b",
  // Grouping
  group: "#94a3b8",
  region: "#78716c",
  "availability-zone": "#a8a29e",
  subnet: "#71717a",
  // Flow
  decision: "#f59e0b",
  process: "#3b82f6",
  start: "#22c55e",
  end: "#ef4444",
  terminal: "#ef4444",
  "input-output": "#8b5cf6",
  subprocess: "#6366f1",
  // Annotation
  text: "#a1a1aa",
};

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  // Compute
  physical: "Physical Server",
  vm: "Virtual Machine",
  container: "Container",
  pod: "Pod",
  serverless: "Serverless Function",
  worker: "Worker",
  // Orchestration
  "cluster-component": "Cluster Component",
  namespace: "Namespace",
  workload: "Workload",
  deployment: "Deployment",
  statefulset: "StatefulSet",
  daemonset: "DaemonSet",
  // Networking
  network: "Network",
  "load-balancer": "Load Balancer",
  "api-gateway": "API Gateway",
  cdn: "CDN",
  dns: "DNS",
  firewall: "Firewall",
  proxy: "Proxy",
  // Storage & Data
  database: "Database",
  cache: "Cache",
  "object-storage": "Object Storage",
  "block-storage": "Block Storage",
  "file-storage": "File Storage",
  "data-lake": "Data Lake",
  "data-warehouse": "Data Warehouse",
  // Security
  "auth-provider": "Auth Provider",
  "secrets-manager": "Secrets Manager",
  certificate: "Certificate",
  vpn: "VPN",
  waf: "WAF",
  // Monitoring
  monitoring: "Monitoring",
  logging: "Logging",
  tracing: "Tracing",
  alerting: "Alerting",
  dashboard: "Dashboard",
  // CI/CD
  "ci-cd": "CI/CD Pipeline",
  "build-pipeline": "Build Pipeline",
  "artifact-registry": "Artifact Registry",
  "container-registry": "Container Registry",
  "deployment-pipeline": "Deployment Pipeline",
  // Users & External
  user: "User",
  client: "Client App",
  "external-access": "External Access",
  "third-party-api": "Third-Party API",
  browser: "Browser",
  // Messaging
  "message-queue": "Message Queue",
  "event-bus": "Event Bus",
  kafka: "Kafka",
  pubsub: "Pub/Sub",
  webhook: "Webhook",
  "notification-service": "Notification Service",
  // Grouping
  group: "Group",
  region: "Region",
  "availability-zone": "Availability Zone",
  subnet: "Subnet",
  // Flow
  decision: "Decision",
  process: "Process",
  start: "Start",
  end: "End",
  terminal: "Terminal",
  "input-output": "Input/Output",
  subprocess: "Subprocess",
  // Annotation
  text: "Text",
};

export const NODE_KIND_CATEGORIES: Record<string, NodeKind[]> = {
  Compute: ["physical", "vm", "container", "pod", "serverless", "worker"],
  Orchestration: ["cluster-component", "namespace", "workload", "deployment", "statefulset", "daemonset"],
  Networking: ["network", "load-balancer", "api-gateway", "cdn", "dns", "firewall", "proxy"],
  "Storage & Data": [
    "database",
    "cache",
    "object-storage",
    "block-storage",
    "file-storage",
    "data-lake",
    "data-warehouse",
  ],
  Security: ["auth-provider", "secrets-manager", "certificate", "vpn", "waf"],
  Monitoring: ["monitoring", "logging", "tracing", "alerting", "dashboard"],
  "CI/CD": ["ci-cd", "build-pipeline", "artifact-registry", "container-registry", "deployment-pipeline"],
  "Users & External": ["user", "client", "external-access", "third-party-api", "browser"],
  Messaging: ["message-queue", "event-bus", "kafka", "pubsub", "webhook", "notification-service"],
  Grouping: ["group", "region", "availability-zone", "subnet"],
  Flow: ["decision", "process", "start", "end", "terminal", "input-output", "subprocess"],
  Annotation: ["text"],
};

/** Node kinds that belong to the Flow category — used to auto-shape new
 * nodes and to default new connections from them to the "flow" edge kind. */
export const FLOW_NODE_KINDS: NodeKind[] = NODE_KIND_CATEGORIES.Flow;

/** The kinds most diagrams reach for — pinned above everything else (even
 * Recent) in the node picker so day-to-day use rarely needs to open a group. */
export const COMMON_NODE_KINDS: NodeKind[] = [
  "vm",
  "container",
  "database",
  "load-balancer",
  "api-gateway",
  "user",
  "group",
  "text",
];

/**
 * The 12 fine-grained categories above are too many to show fully expanded
 * at once, so the picker collapses them into these broader groups (each
 * still showing its member categories as sub-headers once expanded).
 */
export const NODE_KIND_SUPER_GROUPS: { label: string; categories: string[] }[] = [
  { label: "Compute & Orchestration", categories: ["Compute", "Orchestration"] },
  { label: "Network & Data", categories: ["Networking", "Storage & Data"] },
  { label: "Ops & Security", categories: ["Security", "Monitoring", "CI/CD"] },
  { label: "People & Messaging", categories: ["Users & External", "Messaging"] },
  { label: "Structure & Flow", categories: ["Grouping", "Flow", "Annotation"] },
];

/** Shape a newly-added node of this kind should start with, overriding the
 * generic "rounded" default. Flowchart kinds get their conventional shapes. */
export const DEFAULT_NODE_SHAPE: Partial<Record<NodeKind, NodeShape>> = {
  decision: "diamond",
  start: "ellipse",
  end: "ellipse",
  terminal: "ellipse",
  process: "rectangle",
  "input-output": "rectangle",
  subprocess: "rounded",
};

/** Neutral fallback color for a custom (user-typed) kind that has no preset
 * color of its own. */
export const CUSTOM_KIND_COLOR = "#6b7280";

/** Kind a newly placed node starts as — placing is a single click now (no
 * "pick a kind first" step); the kind can be changed straight after, from
 * the properties panel that opens automatically on the new node. */
export const DEFAULT_NODE_KIND: NodeKind = "container";

/** True if `kind` matches one of the built-in preset kinds, as opposed to
 * free text the user typed for a custom kind. */
export function isKnownNodeKind(kind: string): kind is NodeKind {
  return Object.prototype.hasOwnProperty.call(NODE_KIND_LABELS, kind);
}

/** A node's accent color: the preset's default, or the neutral fallback for
 * a custom kind. Callers should still prefer the node's own `fillColor`
 * override first — this is only the kind-level default. */
export function nodeColorFor(kind: string): string {
  return isKnownNodeKind(kind) ? NODE_COLORS[kind] : CUSTOM_KIND_COLOR;
}

/** A node's display label: the preset's friendly label, or the typed text
 * itself for a custom kind — it doubles as its own label. */
export function nodeLabelFor(kind: string): string {
  return isKnownNodeKind(kind) ? NODE_KIND_LABELS[kind] : kind;
}

/** A node's default shape: the preset's, or "rounded" for a custom kind. */
export function nodeShapeFor(kind: string): NodeShape {
  return isKnownNodeKind(kind) ? (DEFAULT_NODE_SHAPE[kind] ?? "rounded") : "rounded";
}

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  lan: "LAN",
  tailscale: "Tailscale",
  overlay: "Overlay",
  "routes-to": "Routes to",
  provisions: "Provisions",
  "stores-in": "Stores in",
  yes: "Yes",
  no: "No",
  conditional: "Conditional",
  flow: "Flow",
};

export const HANDLE_SIDE_LABELS: Record<HandleSide, string> = {
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
};
