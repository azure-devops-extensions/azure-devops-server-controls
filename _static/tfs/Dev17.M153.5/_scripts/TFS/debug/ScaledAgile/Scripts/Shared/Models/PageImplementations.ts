import {
    IMessage, IStateChangeParams,
    PageLoadingState, IMessageLink
} from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { MessageBarType } from "OfficeFabric/MessageBar";

/**
 * A message that will be delivered to the Main view to be displayed
 */
export class Message implements IMessage {
    public readonly id: string;
    
    constructor(public messageType: MessageBarType, public message: string, public closeable: boolean = true, public link?: IMessageLink) {
        this.id = GUIDUtils.newGuid();
    }
}

/**
 * Parameter to be pass with the StateChange action
 */
export class StateChangeParams implements IStateChangeParams {
    /**
     * Constructor that set the state as well as a message if needed
     * @param {PageLoadingState} state - New state
     * @param {Message} message - Message to show. Optional.
     */
    constructor(public state: PageLoadingState, public message?: Message) { }
}
