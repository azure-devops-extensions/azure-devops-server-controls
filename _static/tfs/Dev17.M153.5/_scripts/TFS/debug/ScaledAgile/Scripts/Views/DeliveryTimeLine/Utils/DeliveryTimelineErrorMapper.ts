import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { IMessage } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { Message } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { MessageBarType } from "OfficeFabric/MessageBar";

/**
 * Static object to map errors from the data provider (svc) to messages to display to the client.
 */
export class DeliveryTimelineErrorMapper {

    /**
     * Convert an error coming from the data provider (the svc) to a message to display to the user.
     *  If error or error.message is null/undefined then this returns null. Otherwise it tries to map the error to a friendly error - or it returns the "raw" error.
     * @param {TfsError} error Error returned from from a data provider call (may be an Error instead of a TfsError).
     * @returns IMessage to display to the user.
     */
    public static mapErrorToMessage(error: TfsError): IMessage {
        if (!error) {
            return null;
        }

        if (error.serverError && error.serverError.typeKey === "ViewRevisionMismatchException") {
            return new Message(MessageBarType.info, ScaledAgileResources.PlanUpdated_Client);
        }

        return new Message(MessageBarType.error, error.message);
    }
}
