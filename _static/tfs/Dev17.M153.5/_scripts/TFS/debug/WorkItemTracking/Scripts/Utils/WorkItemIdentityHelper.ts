import { IdentityHelper, IIdentityReference } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { GraphSubject } from "VSS/Graph/Contracts";
import { GraphHttpClient5 } from "VSS/Graph/RestClient";
import { VssConnection } from "VSS/Service";
import { ServiceInstanceTypes, SubjectType } from "VSS/WebApi/Constants";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { publishErrorToTelemetry } from "VSS/Error";
import { getErrorMessage } from "VSS/VSS";
import { getService as getEventsService } from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as Utils_String from "VSS/Utils/String";

let _referencedIdentitiesByDistinctDisplayName: IDictionaryStringTo<WorkItemIdentityRef> = {};
let _referencedIdentitiesByDescriptor: IDictionaryStringTo<WorkItemIdentityRef> = {};
let _isIdentityRefResolvedByDescriptor: IDictionaryStringTo<boolean> = {};
let _graphClient: GraphHttpClient5;

getEventsService().attachEvent(HubEventNames.PreXHRNavigate, () => {
    // clear all the caches during xhr navigation to ensure we don't let this cache grow indefinitely
    _referencedIdentitiesByDistinctDisplayName = {};
    _referencedIdentitiesByDescriptor = {};
    _isIdentityRefResolvedByDescriptor = {};
    _graphClient = null;
});

/**
 * If the value is a WorkItemIdentityRef, add it to the resolved cache.  This ensures
 * that any call to resolveIdentityRefToWorkItemIdentityRef will not hit the graph
 * service for this identity.
 */
export function setResolvedByDescriptorIfWorkItemIdentityRef(value: any): void {
    if (isWorkItemIdentityRef(value) &&
        value.identityRef &&
        value.identityRef.descriptor) {
        _isIdentityRefResolvedByDescriptor[value.identityRef.descriptor] = true;
    }
}

/**
 * If the value is a WorkItemIdentityRef and the consumer isn't explicitly asking
 * for it, return the distinctDisplayName.
 *
 * If it's not a WorkItemIdentityRef, and they explicitly are asking for it, attempt
 * to convert the value to an IdentityRef by parsing the details from the combo string.
 *
 * Otherwise just return the original value.
 */
export function convertPotentialIdentityRefFromFieldValue(value: any, asIdentityRef?: boolean): any {
    const valueIsWorkItemIdentityRef = isWorkItemIdentityRef(value);
    const valueIsIdentityRef = isIdentityRef(value);
    if (asIdentityRef && !valueIsWorkItemIdentityRef && !valueIsIdentityRef) {
        return createIdentityRefFromDistinctDisplayName(value);
    } else if (valueIsWorkItemIdentityRef) {
        const workItemIdentityRef = (<WorkItemIdentityRef>value);
        return asIdentityRef ? workItemIdentityRef.identityRef : workItemIdentityRef.distinctDisplayName || workItemIdentityRef.identityRef.displayName;
    } else if (valueIsIdentityRef) {
        const identityRef = (<IdentityRef>value);
        return asIdentityRef ? identityRef : identityRef.displayName;
    }

    return value;
}

/**
 * Returns true if the provided value is not null and a WorkItemIdentityRef
 */
export function isWorkItemIdentityRef(value: any): value is WorkItemIdentityRef {
    if (value && value.identityRef !== undefined) {
        const workItemIdentityRef = <WorkItemIdentityRef>value;
        // cache the work item identity ref by distinct display name
        if (workItemIdentityRef.distinctDisplayName &&
            !_referencedIdentitiesByDistinctDisplayName[workItemIdentityRef.distinctDisplayName]) {
            _referencedIdentitiesByDistinctDisplayName[workItemIdentityRef.distinctDisplayName] = workItemIdentityRef;
        }

        // cache the work item identity ref by descriptor
        if (workItemIdentityRef.identityRef &&
            workItemIdentityRef.identityRef.descriptor &&
            !_referencedIdentitiesByDescriptor[workItemIdentityRef.identityRef.descriptor]) {
            _referencedIdentitiesByDescriptor[workItemIdentityRef.identityRef.descriptor] = workItemIdentityRef;
        }

        return true;
    } else {
        return false;
    }
}

/**
 * Returns true if the provided value is not null and an IdentityRef
 */
export function isIdentityRef(value: any): value is IdentityRef {
    return !!(value && value.displayName !== undefined);
}

/**
 * Constructs an IdentityRef from distinct display name.
 *
 * This is required to handle the scenario where the IdentityRef feature flag is off.
 */
export function createIdentityRefFromDistinctDisplayName(value: string): IdentityRef {
    if (_referencedIdentitiesByDistinctDisplayName[value]) {
        return _referencedIdentitiesByDistinctDisplayName[value].identityRef;
    }

    const parsedIdentity = IdentityHelper.parseUniquefiedIdentityName(value);
    const imageUrl = IdentityHelper.getIdentityImageUrlByIdentity(parsedIdentity);

    // aad identities cannot be resolved by the graph APIs, so keep as a non-identity constant
    if (parsedIdentity && parsedIdentity.isAadIdentity) {
        return {
            displayName: value
        } as IdentityRef;
    }

    return parsedIdentity && {
        displayName: parsedIdentity.displayName,
        uniqueName: parsedIdentity.uniqueName,
        imageUrl: imageUrl,
        _links: {
            avatar: {
                href: imageUrl
            }
        }
    } as IdentityRef;
}

/**
 * Constructs a WorkItemIdentityRef from an IEntity.
 *
 * This is for handling identities resolved by the identity picker, since the stored value
 * on the work item field is combo string.
 */
export function createWorkItemIdentityRefFromEntity(entity: IEntity): WorkItemIdentityRef {
    // only materialized users have a descriptor, and we only want to cache materialized users
    if (entity && entity.subjectDescriptor) {
        const workItemIdentityRef = {
            distinctDisplayName: WITIdentityHelpers.getUniquefiedIdentityName(entity),
            identityRef: {
                displayName: entity.displayName,
                descriptor: entity.subjectDescriptor
            }
        } as WorkItemIdentityRef;

        if (!_referencedIdentitiesByDescriptor[entity.subjectDescriptor]) {
            _referencedIdentitiesByDescriptor[entity.subjectDescriptor] = workItemIdentityRef;
        }

        if (!_referencedIdentitiesByDistinctDisplayName[workItemIdentityRef.distinctDisplayName]) {
            _referencedIdentitiesByDistinctDisplayName[workItemIdentityRef.distinctDisplayName] = workItemIdentityRef;
        }

        return workItemIdentityRef;
    } else {
        return null;
    }
}

/**
 * If the value is a WorkItemIdentityRef, return as is.
 *
 * If it's not a WorkItemIdentityRef and is a string of the format "DisplayName <uniqueName>",
 * attempt to convert the value to  WorkItemIdentityRef by parsing the details from the combo string.
 * into an IdentityRef and keeping the value as the distinctDisplayName.
 *
 * Is for some reason, parseUniquefiedIdentityName returns null, we fallback to a dummy 
 * IdentityRef with displayName same as the value.
 */
export function convertWorkItemIdentityRefFromFieldValue(value: string | WorkItemIdentityRef): WorkItemIdentityRef {
    if (isWorkItemIdentityRef(value)) {
        return value;
    }

    let identityRef = convertPotentialIdentityRefFromFieldValue(value, true);
    if (!identityRef) {
        // In the unlikely event of parseUniquefiedIdentityName failing to parse this identity,
        // fall back to a dummy IdentityRef to let consumers of this method always assume that it won't be null.
        identityRef = {
            displayName: value
        } as IdentityRef;
    }

    return {
        distinctDisplayName: value,
        identityRef
    };
}

/**
 * Gets the avatar url from the WorkItemIdentityRef or IdentityRef object.
 * If the avatar.href is not set and imageUrl is set, returns imageUrl.
 * If neither is set (possible in case of back-compat identities like TfsContext.currentIdentity),
 * then leverages the legacy helper to support the member-only scenarios.
 * Falls back to the Unassigned avatar image.
 * @param witIdentityRef
 */
export function getAvatarUrl(witIdentityRef: WorkItemIdentityRef | IdentityRef | IIdentityReference): string {
    const valueIsWorkItemIdentityRef = isWorkItemIdentityRef(witIdentityRef);
    const identityRef: IdentityRef = valueIsWorkItemIdentityRef ? (witIdentityRef as WorkItemIdentityRef).identityRef : witIdentityRef as IdentityRef;

    if (identityRef) {
        const { _links, imageUrl } = identityRef;
        if (_links && _links.avatar && _links.avatar.href) {
            return _links.avatar.href;
        }

        // Fall back to the imageUrl for back compat scenarios
        if (imageUrl) {
            return imageUrl;
        }

        // This can happen in case of identities like TfsContext.currentIdentity, which should be invoked only for members.
        // Leverage the legacy helper to support those member-only scenarios with the back-compat identities.
        return IdentityHelper.getIdentityImageUrlByIdentity(witIdentityRef as IIdentityReference);
    }

    return IdentityHelper.getIdentityImageUrlByIdentity(null); // Default to the Unassigned avatar
}

/**
 * Removes duplicates from an array of WorkItemIdentityRef objects, treating distinctDisplayName as the key
 * and then sorts it by distinctDisplayName using localeIgnoreCaseComparer.
 * @param workitemIdentityRefs
 */
export function uniqueSortWorkItemIdentityRefObjects(workitemIdentityRefs: WorkItemIdentityRef[]): WorkItemIdentityRef[] {
    if (!workitemIdentityRefs || workitemIdentityRefs.length === 0) {
        return workitemIdentityRefs;
    }

    const uniqueIdentities: IDictionaryStringTo<WorkItemIdentityRef> = {};
    workitemIdentityRefs.forEach(w => uniqueIdentities[w.distinctDisplayName] = w);
    const sortedWorkitemIdentityRefs = Object.keys(uniqueIdentities).sort(localeIgnoreCaseComparer);

    return sortedWorkitemIdentityRefs.map(s => uniqueIdentities[s]);
}

/**
 * Resolves the IdentityRef to a full WorkItemIdentityRef by going to the Graph service if
 * the identity has not previously been resolved.
 */
export async function resolveIdentityRefToWorkItemIdentityRef(identityRef: IdentityRef): Promise<WorkItemIdentityRef> {
    if (identityRef && identityRef.descriptor) {
        // if we've cached it, but not resolved it, we should ensure it gets
        // resolved so that the model we give the consumer is fully hydrated.
        let workItemIdentityRef = _referencedIdentitiesByDescriptor[identityRef.descriptor];
        if (workItemIdentityRef && _isIdentityRefResolvedByDescriptor[identityRef.descriptor]) {
            return Promise.resolve(workItemIdentityRef);
        }

        _initializeGraphClient();

        try {
            let subjects = await _graphClient.lookupSubjects({
                lookupKeys: [identityRef]
            });

            subjects = <IDictionaryStringTo<GraphSubject>>(<any>subjects).value;
            if (subjects[identityRef.descriptor]) {
                const graphSubject = subjects[identityRef.descriptor];
                let localId: string;

                // GraphHttpClient.lookupMembers returns the organization scoped id, so need to
                // make a second call to get the local scoped id for AAD Groups.
                if (graphSubject.descriptor && Utils_String.startsWith(graphSubject.descriptor, SubjectType.AadGroup, Utils_String.localeIgnoreCaseComparer)) {
                    const storageKey = await _graphClient.getStorageKey(graphSubject.descriptor);
                    if (storageKey) {
                        localId = storageKey.value;
                    }
                }

                workItemIdentityRef = {
                    distinctDisplayName: WITIdentityHelpers.getDistinctDisplayNameFromGraphSubject(graphSubject, localId),
                    // trusting the identity ref from the resolution instead of the one the caller provided
                    identityRef: {
                        descriptor: graphSubject.descriptor,
                        displayName: graphSubject.displayName,
                        imageUrl: graphSubject._links && graphSubject._links.avatar && graphSubject._links.avatar.href,
                        _links: graphSubject._links,
                    } as IdentityRef
                };

                // caching so the convert helpers can convert the combo string and descriptor to work item identity ref
                _referencedIdentitiesByDistinctDisplayName[workItemIdentityRef.distinctDisplayName] = workItemIdentityRef;
                _referencedIdentitiesByDescriptor[workItemIdentityRef.identityRef.descriptor] = workItemIdentityRef;
                _isIdentityRefResolvedByDescriptor[workItemIdentityRef.identityRef.descriptor] = true;

                return workItemIdentityRef;
            }
        } catch (exception) {
            // no-op, log a ci event
            publishErrorToTelemetry({
                name: "UnableToResolveWorkItemIdentityRef",
                message: getErrorMessage(exception)
            });
        }
    }

    // non identity values populate distinctDisplayName with displayName for consistency
    return {
        distinctDisplayName: identityRef && identityRef.displayName,
        identityRef: identityRef
    };
}

function _initializeGraphClient(): void {
    if (!_graphClient) {
        _graphClient = VssConnection.getConnection().getHttpClient(GraphHttpClient5, ServiceInstanceTypes.SPS);
    }
}
