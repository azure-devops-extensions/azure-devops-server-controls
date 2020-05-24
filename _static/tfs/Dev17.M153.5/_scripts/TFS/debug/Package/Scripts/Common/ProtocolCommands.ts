/*
 * Bitmask flags for protocol commands.
 * Used when checking protocol's supported commands.
 * Each protocol sets supported commands in their PackageProtocol class.
 * Use JavaScript bitwise AND, &, to check protocol's supported commands.
 */
// tslint:disable:no-bitwise
export enum ProtocolCommands {
    Noop = 0, // 0
    Promote = 1, // 1
    Delete = 1 << 1, // 10
    Download = 1 << 2, // 100
    Unlist = 1 << 3, // 1000
    Relist = 1 << 4, // 10000
    Deprecate = 1 << 5, // 100000
    Undeprecate = 1 << 6, // 1000000
    Restore = 1 << 7, // 10000000
    PermanentDelete = 1 << 8 // 100000000
}

// tslint:disable:no-bitwise
export const SupportedProtocolCommands: number =
    ProtocolCommands.Delete |
    ProtocolCommands.Deprecate |
    ProtocolCommands.Download |
    ProtocolCommands.Noop |
    ProtocolCommands.Promote |
    ProtocolCommands.Relist |
    ProtocolCommands.Undeprecate |
    ProtocolCommands.Unlist |
    ProtocolCommands.Restore |
    ProtocolCommands.PermanentDelete;
