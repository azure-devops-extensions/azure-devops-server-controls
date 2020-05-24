export enum TopologyType {
    Network = 0,
    DirectedNetwork = 4,
    Dependency = 12,
    Tree = 28
}

export enum LinkDirection {
    Forward,
    Reverse,
    NonDirectional
}

export interface TopologyOptions {
    topology: TopologyType,
    linkDirection: LinkDirection
}