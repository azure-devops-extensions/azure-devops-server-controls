import * as VSS from "VSS/VSS";
import * as VSSError from "VSS/Error";

/**
 * Publishes Error to Telemetry
 *
 * @param name - Name to use if error does not have name
 * @param error - the error to publish
 */
export function publishError(name: string, error: any) {
    if (!error || !error.name || !error.message) {
        VSSError.publishErrorToTelemetry({
            name: name,
            message: VSS.getErrorMessage(error)
        });
    }
    else {
        VSSError.publishErrorToTelemetry(error);
    }
}