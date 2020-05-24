export function getAreaPathLeafNode(path: string): string {
    const nodes = path ? path.split("\\") : [""];
    return nodes[nodes.length - 1];
}
