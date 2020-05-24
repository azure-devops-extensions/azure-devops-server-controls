import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";

export function isCompleteIdentity(identity: Identities_Picker_RestClient.IEntity) {
    if (!identity) {
        return false;
    }

    if (isAadUser(identity) || isAdUser(identity)) {
        return !!(
            identity.mail ||
            identity.mailNickname ||
            identity.jobTitle ||
            identity.department ||
            identity.physicalDeliveryOfficeName ||
            identity.manager ||
            identity.surname ||
            identity.telephoneNumber
        );
    } else if (isVsdUser(identity)) {
        return (
            !!identity.signInAddress
        )
    } else if (isWmdUser(identity)) {
        return !!(
            identity.scopeName ||
            identity.signInAddress
        )
    }

    return false;
}

export function  isAadUser(identity: Identities_Picker_RestClient.IEntity): boolean {
    return identity && identity.originDirectory.trim().toLowerCase() === Identities_Picker_Services.ServiceHelpers.AzureActiveDirectory;
}
export function  isAdUser(identity: Identities_Picker_RestClient.IEntity): boolean {
    return identity && identity.originDirectory.trim().toLowerCase() === Identities_Picker_Services.ServiceHelpers.ActiveDirectory;
}
export function  isVsdUser(identity: Identities_Picker_RestClient.IEntity): boolean {
    return identity && identity.originDirectory.trim().toLowerCase() === Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory;
}
export function  isWmdUser(identity: Identities_Picker_RestClient.IEntity): boolean {
    return identity && identity.originDirectory.trim().toLowerCase() === Identities_Picker_Services.ServiceHelpers.WindowsMachineDirectory;
}