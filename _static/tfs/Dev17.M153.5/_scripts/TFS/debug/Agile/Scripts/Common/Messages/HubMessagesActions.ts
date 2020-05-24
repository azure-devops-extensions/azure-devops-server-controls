import { Action } from "VSS/Flux/Action";
import { IHubMessagesExceptionInfo } from "Agile/Scripts/Common/Messages/HubMessagesContracts";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import { registerDiagActions } from "VSS/Flux/Diag";

const ACTION_SCOPE = "HUB_MESSAGES";

@registerDiagActions
export class HubMessagesActions {
    public readonly addExceptionsInfo = new Action<IHubMessagesExceptionInfo[]>(ACTION_SCOPE);
    public readonly clearPageMessage = new Action<string>(ACTION_SCOPE);
    public readonly addMessage = new Action<IMessage>(ACTION_SCOPE);
    public readonly clearAllMessages = new Action<void>(ACTION_SCOPE);
}