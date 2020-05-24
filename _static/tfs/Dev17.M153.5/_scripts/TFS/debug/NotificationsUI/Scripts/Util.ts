import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";

/**
 * Validates that value is an email address or comma or semicolon delimited list of email addresses.
 * Returns empty string if input is valid, error message otherwise.
 * @param value 
 */
export function validateEmail(value: string, asciiOnlyAddresses: boolean): string {
    if (!value || value.trim() === "") {
        return NotificationResources.EmailAddressRequiredMessage;
    }

    const regex = /^([^@\[\]\.\s]+(\.[^@\[\]\.\s]+)*)@(([^@\[\]\.\s]+(\.[^@\[\]\.\s]+)+)|(\[([0-9]{1,3}\.){3}[0-9]{1,3}\]))$/;
    value = value.replace(new RegExp(";", "g"), ",");

    const emails = value.split(",");

    for (let email of emails) {
        email = email.trim();
        if (!regex.test(email)) {
            return NotificationResources.EmailAddressInvalidMessage;
        }
        
        if (asciiOnlyAddresses) {
            for (let i = 0; i < email.length; i++) {
                const charCode = email.charCodeAt(i);
                // we only allow 7 bit ASCII (<128)
                // of that range, char codes 0-31 and 127 are control codes per .NET char.IsControl()
                if (charCode < 32 || charCode > 126) {
                    return NotificationResources.EmailAddressInvalidCharactersMessage;
                }
            }
        }
    }
    return "";
}
