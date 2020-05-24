import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

/**
 * Static object to map errors from the data provider (svc) to messages to display to the client.
 */
export class ViewsErrorMapper {

    /**
     * Convert an error coming from the data provider (the svc) to a message to display to the user.
     * If error or error.message is null/undefined then this returns null. Otherwise it tries to map the error to a friendly error
     * - or it returns the "raw" error.
     * @param {TfsError} error Error returned from from a data provider call (may be an Error instead of a TfsError).
     * @returns Message to display to the user.
     */
    public static mapErrorToUserFriendlyMessage(error: TfsError): string {
        if (!error) {
            return null;
        }

        if (error.serverError && error.serverError.typeKey === "ViewRevisionMismatchException") {
            return ScaledAgileResources.ViewRevisionMismatchExceptionMessage_WebAccess;
        }

        return error.message;
    }
}
