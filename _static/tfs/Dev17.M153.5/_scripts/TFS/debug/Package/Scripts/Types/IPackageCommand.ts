import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";

export interface IPackageCommand {
    readonly id: string;

    // tells what protocol command this refers to
    // optional since there are package commands like follow which are not protocol related
    readonly protocolCommand?: ProtocolCommands;

    readonly displayText: string;
    readonly titleText: string;
    readonly icon?: string;
    readonly disabled?: boolean;
    readonly actionMethod: () => void;
}
