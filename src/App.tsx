import dagre from "dagre";
import { toSvg } from "html-to-image";
import { Box, ChevronRight, Code2, Download, Hash, Zap } from "lucide-react";
import React, {
    useCallback,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
import ReactFlow, {
    Background,
    BackgroundVariant,
    ConnectionMode,
    Controls,
    Handle,
    Panel,
    Position,
    ReactFlowProvider,
    applyEdgeChanges,
    applyNodeChanges,
    getNodesBounds,
    useReactFlow,
    type Edge,
    type Node,
} from "reactflow";
import "reactflow/dist/style.css";

const nodeWidth = 380; // Slightly wider for readability

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: "TB",
        nodesep: 150,
        ranksep: 400, // Large vertical gap for tall cards
        marginx: 100,
        marginy: 100,
    });

    nodes.forEach((node) => {
        // We calculate height based on the EXACT number of lines found
        const lineCount = node.data.fields?.length || 5;
        const estimatedHeight = 160 + lineCount * 30;
        dagreGraph.setNode(node.id, {
            width: nodeWidth,
            height: estimatedHeight,
        });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            const lineCount = node.data.fields?.length || 5;
            const estimatedHeight = 160 + lineCount * 30;
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - estimatedHeight / 2,
                },
            };
        }),
        edges,
    };
};

interface IField {
    name: string;
    type: string;
    isConnected: boolean;
}

interface ISchemaNode {
    data: {
        label: string;
        fields: IField[];
    };
    type: string;
}
const SchemaNode = ({ data, type }: ISchemaNode) => {
    const isEnum = type === "enumNode";

    // Semantic Mapping
    const nodeBorder = isEnum
        ? "border-node-enum-border shadow-node-enum-glow"
        : "border-node-interface-border shadow-node-interface-glow";
    const headerBg = isEnum
        ? "bg-node-enum-header border-node-enum-border"
        : "bg-node-interface-header border-node-interface-border";
    const labelColor = isEnum
        ? "text-node-enum-text"
        : "text-node-interface-text";

    return (
        <div
            className={`bg-node-bg border-2 ${nodeBorder} flex min-w-90 flex-col overflow-visible rounded-xl shadow-2xl`}
        >
            {/* Card Header */}
            <div className={`${headerBg} border-b-2 p-4`}>
                <div
                    className={`flex items-center gap-2 ${labelColor} mb-1 text-[10px] font-black tracking-widest`}
                >
                    {isEnum ? <Hash size={14} /> : <Box size={14} />}
                    {isEnum ? "ENUMERATION" : "INTERFACE"}
                </div>
                <div className="truncate font-mono text-base font-bold text-zinc-100">
                    {data.label}
                </div>
            </div>

            {/* Card Body */}
            <div className="bg-node-body-bg space-y-1 p-4">
                {data.fields.map((field, i) => (
                    <div
                        key={i}
                        className="border-field-border group flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
                    >
                        <div className="flex flex-1 items-center gap-2 truncate">
                            <ChevronRight
                                size={10}
                                className={`${field.isConnected ? "text-blue-500" : "text-zinc-700"}`}
                            />
                            <span className="truncate font-mono text-[12px] text-zinc-300">
                                {field.name}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center">
                            <span
                                className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                                    field.isConnected
                                        ? "bg-field-connected-bg border-field-connected-border text-field-connected-text font-bold"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-500"
                                } tracking-tighter uppercase`}
                            >
                                {field.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <Handle
                type="target"
                position={Position.Top}
                className="bg-node-handle! h-3! w-3! border-2! border-black!"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="bg-node-handle! h-3! w-3! border-2! border-black!"
            />
        </div>
    );
};

const nodeTypes = { enumNode: SchemaNode, interfaceNode: SchemaNode };

interface IDiagramCanvas {
    code: string;
    setNodes: Dispatch<SetStateAction<Node[]>>;
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    nodes: Node[];
    edges: Edge[];
}

function DiagramCanvas({
    code,
    setNodes,
    setEdges,
    nodes,
    edges,
}: IDiagramCanvas) {
    const { fitView } = useReactFlow();

    const visualize = useCallback(() => {
        // 1. Remove comments but keep lines
        const noComments = code.replace(
            /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
            "$1",
        );
        const cleanCode = noComments.trim();

        const parsedNodes: {
            id: string;
            label: string;
            type: string;
            fields: IField[];
        }[] = [];
        const newEdges: Edge[] = [];

        // 2. Capture Enums
        const enumRegex = /enum\s+(\w+)\s*{([\s\S]*?)}/g;
        let match;
        while ((match = enumRegex.exec(cleanCode)) !== null) {
            const options = match[2]
                .split(",")
                .map((s) => ({
                    name: s.trim().split("=")[0].trim(),
                    type: "val",
                    isConnected: false,
                }))
                .filter((o) => o.name);
            parsedNodes.push({
                id: match[1],
                type: "enumNode",
                label: match[1],
                fields: options,
            });
        }

        function flattenNestedObjects(body: string): string {
            let result = "";
            let depth = 0;
            let buffer = "";

            for (let i = 0; i < body.length; i++) {
                const char = body[i];

                if (char === "{") {
                    depth++;
                    buffer += char;
                } else if (char === "}") {
                    depth--;
                    buffer += char;
                    if (depth === 0) {
                        // Flush buffer as a single flattened line
                        result += buffer.replace(/\s+/g, " ");
                        buffer = "";
                    }
                } else if (depth > 0) {
                    buffer += char;
                } else {
                    result += char;
                }
            }

            return result;
        }

        // 3. Lossless Interface Parser
        const interfaceStartRegex =
            /interface\s+(\w+)(?:\s+extends\s+[\w,\s<>.]+)?\s*\{/g;

        let startMatch;
        while ((startMatch = interfaceStartRegex.exec(cleanCode)) !== null) {
            const interfaceName = startMatch[1];
            const bodyStart = startMatch.index + startMatch[0].length;

            // Walk the string depth-first to find the TRUE closing brace
            let depth = 1;
            let i = bodyStart;
            while (i < cleanCode.length && depth > 0) {
                if (cleanCode[i] === "{") depth++;
                else if (cleanCode[i] === "}") depth--;
                i++;
            }

            const body = cleanCode.slice(bodyStart, i - 1); // i-1 excludes the final }

            // Flatten inline nested objects (your flattenNestedObjects is fine here)
            const flattenedBody = flattenNestedObjects(body);

            const lines = flattenedBody
                .split("\n")
                .map((l) => l.trim())
                .filter(
                    (l) =>
                        l &&
                        l !== "}" &&
                        !l.startsWith("//") &&
                        !l.startsWith("*") &&
                        !l.startsWith("/*"),
                );

            const fields: IField[] = [];

            lines.forEach((line) => {
                const colonIndex = line.indexOf(":");
                if (colonIndex !== -1) {
                    const fieldName = line
                        .substring(0, colonIndex)
                        .replace("?", "")
                        .trim();
                    let fieldType = line
                        .substring(colonIndex + 1)
                        .replace(/;$/, "")
                        .trim();

                    if (fieldType.startsWith("{")) {
                        fieldType = "{ Object }";
                    }

                    fields.push({
                        name: fieldName,
                        type: fieldType,
                        isConnected: false,
                    });
                } else if (line.length > 0 && line !== "}") {
                    fields.push({
                        name: line.replace(";", ""),
                        type: "prop",
                        isConnected: false,
                    });
                }
            });

            parsedNodes.push({
                id: interfaceName,
                type: "interfaceNode",
                label: interfaceName,
                fields,
            });
        }

        // 4. Connection Scan
        const finalNodes = parsedNodes.map((source) => {
            if (source.type === "interfaceNode") {
                source.fields = source.fields.map((f) => {
                    let found = false;
                    parsedNodes.forEach((target) => {
                        if (source.id === target.id) return;
                        const reg = new RegExp(`\\b${target.id}\\b`);
                        if (reg.test(f.type)) {
                            newEdges.push({
                                id: `e-${source.id}-${target.id}`,
                                source: target.id,
                                target: source.id,
                                animated: true,
                                style: {
                                    stroke: "var(--color-node-interface-edge)",
                                    strokeWidth: 2,
                                },
                            });
                            found = true;
                        }
                    });
                    return { ...f, isConnected: found };
                });
            }
            return source;
        });

        const reactNodes: Node[] = finalNodes.map((n) => ({
            id: n.id,
            type: n.type,
            data: { label: n.label, fields: n.fields },
            position: { x: 0, y: 0 },
        }));

        const layouted = getLayoutedElements(reactNodes, newEdges);
        setNodes([]);
        setEdges([]);
        requestAnimationFrame(() => {
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
            setTimeout(() => {
                fitView({ duration: 800, padding: 0.2 });
            }, 50);
        });
    }, [code, fitView, setEdges, setNodes]);

    useEffect(() => {
        visualize();
    }, [visualize]);

    return (
        <div className="bg-canvas-bg h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(chs) =>
                    setNodes((nds: Node[]) => applyNodeChanges(chs, nds))
                }
                onEdgesChange={(chs) =>
                    setEdges((eds: Edge[]) => applyEdgeChanges(chs, eds))
                }
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
            >
                <Background
                    color="var(--color-grid-line)"
                    gap={50}
                    size={1}
                    variant={BackgroundVariant.Lines}
                />
                <Controls className="border-zinc-800! bg-zinc-900! fill-white! shadow-2xl" />
                <Panel position="top-right">
                    <button
                        onClick={visualize}
                        className="bg-action-primary text-action-text hover:bg-action-hover flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-black tracking-widest uppercase shadow-2xl transition-all"
                    >
                        <Zap size={14} /> Rebuild Diagram
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
}

export default function TSVisualizer() {
    const [code, setCode] = useState(`/**
 * @version 2.4.0
 * Primary Customer Schema for Enterprise Resource Planning
 */

export enum CustomerSegment {
  B2C = "Individual",
  B2B = "Corporate",
  B2G = "Government"
}

export enum AccountStatus {
  Active,
  Suspended,
  UnderReview,
  Archived
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ICustomer extends Document {
  _id: string;
  customerId: number;
  segment: CustomerSegment;
  status: AccountStatus;

  // Basic Info
  name: string;
  email: string;
  phone?: string;

  // Nested Objects (Testing the Object Flattener)
  additionalInfo: {
    tags: string[];
    notes: string;
    internalRating: number;
  };

  // Connections
  billingAddress: IAddress;
  shippingAddress: IAddress;

  // Audit Fields (Testing Lossless Parsing)
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}`);
    const [leftWidth, setLeftWidth] = useState(450);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startWidth = leftWidth;
        const onMouseMove = (mE: MouseEvent) =>
            setLeftWidth(startWidth + (mE.clientX - startX));
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleDownload = async () => {
        if (!nodes || nodes.length === 0) return;

        const viewport = document.querySelector(
            ".react-flow__viewport",
        ) as HTMLElement;
        if (!viewport) return;

        // 1. Get exact boundaries of all your schema cards
        const bounds = getNodesBounds(nodes);

        // 2. Add some "industrial padding" so cards aren't touching the edge of the SVG
        const padding = 100;
        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;

        // 3. This is the fix for "Half-Cut":
        // We calculate a transform that shifts the 'minX' and 'minY' to the (0,0) of the SVG
        // This ensures that even if nodes are at negative coordinates, they are visible.
        const xTransform = -bounds.x + padding;
        const yTransform = -bounds.y + padding;

        try {
            const dataUrl = await toSvg(viewport, {
                backgroundColor: "var(--color-canvas-bg)",
                width: width,
                height: height,
                style: {
                    width: `${width}px`,
                    height: `${height}px`,
                    // Force the viewport to shift specifically to cover the bounds
                    transform: `translate(${xTransform}px, ${yTransform}px) scale(1)`,
                },
                filter: (node) => {
                    const exclusionClasses = [
                        "react-flow__controls",
                        "react-flow__panel",
                    ];
                    return !exclusionClasses.some((cls) =>
                        node.classList?.contains(cls),
                    );
                },
            });

            const link = document.createElement("a");
            link.download = `ts-to-diagram-export.svg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Export error:", error);
        }
    };

    return (
        <div className="bg-app-bg flex h-screen w-full flex-col overflow-hidden font-sans text-zinc-100">
            {/* --- NEW HEADER --- */}
            <header className="border-header-border bg-header-bg flex h-16 shrink-0 items-center justify-between border-b px-6">
                <div className="flex items-center gap-3">
                    <div className="bg-action-primary rounded-lg p-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        <Code2 size={20} className="text-white" />
                    </div>
                    <h1 className="header-title-glow text-lg font-black tracking-tighter uppercase">
                        TS To{" "}
                        <span className="text-node-interface-text">
                            Diagram
                        </span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        className="bg-btn-secondary-bg border-btn-secondary-border hover:bg-btn-secondary-hover flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-bold transition-colors"
                    >
                        <Download size={14} />
                        Download SVG
                    </button>
                    <a
                        href="https://github.com/sahilatahar/TS-to-Diagram"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-xs font-bold text-black shadow-lg transition-transform hover:bg-white active:scale-95"
                    >
                        Star on GitHub
                    </a>
                </div>
            </header>
            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex flex-1 overflow-hidden">
                <div
                    style={{ width: leftWidth }}
                    className="border-border-main bg-editor-bg relative flex flex-col border-r"
                >
                    <div className="border-border-main bg-panel-header flex items-center gap-3 border-b p-4">
                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                        <h2 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                            Source Input
                        </h2>
                    </div>
                    <textarea
                        value={code}
                        placeholder="Paste your TypeScript code here"
                        onChange={(e) => setCode(e.target.value)}
                        spellCheck={false}
                        className="focus:text-node-interface-text flex-1 resize-none bg-transparent p-6 font-mono text-[12px] leading-relaxed text-zinc-500 transition-colors outline-none"
                    />
                    <div
                        onMouseDown={handleMouseDown}
                        className="hover:bg-action-hover absolute top-0 -right-0.75 z-50 h-full w-1.5 cursor-col-resize transition-colors"
                    />
                </div>

                <div className="bg-canvas-bg relative flex-1">
                    <ReactFlowProvider>
                        <DiagramCanvas
                            code={code}
                            nodes={nodes}
                            edges={edges}
                            setNodes={setNodes}
                            setEdges={setEdges}
                        />
                    </ReactFlowProvider>
                </div>
            </div>
        </div>
    );
}
