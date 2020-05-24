import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS = require("VSS/VSS");
import { IEntity as IIdentity } from "VSS/Identities/Picker/RestClient";

export interface IWorkItemsInitializeEvent {
    getMyAssignedWorkItemsDurationInMsec?: string;
    getMyRecentlyTouchedWorkItemsDurationInMsec?: string;
    getWorkItemColorsProviderDurationInMsec?: string;
}

export interface IWorkItemsClickEvent {
    workItem?: string;
}

export interface IIdentityEvent {
    identity: IIdentity;
    error?: any;
}

export interface IAutocompleteEvent {
    telemetryVersion?: string;
    artifactUri?: string;
    autocompleteSessionId?: string;
    autocompleteSessionStartTime?: string;
    time?: string;
    uiEvent?: string;
    pluginName?: string;
    isSearchEnabled?: boolean;
}

export interface IAutocompleteOpenEvent extends IAutocompleteEvent {

}

export interface IAutocompleteSuggestEvent extends IAutocompleteEvent {
    searchTerm?: string;
    suggestionsCount?: string;
    durationInMSec?: string;
    mentionArtifactContext?: MentionAutocomplete.IMentionArtifactContext;
}

export interface IAutocompleteSelectEvent extends IAutocompleteEvent {
    selectionIndex?: string;
    identity?: IIdentity;
}

export interface IAutocompleteCancelEvent extends IAutocompleteEvent {

}

export interface IMentionableEvent {
    artifactUri?: string;
}

export interface IMentionableEditEvent extends IMentionableEvent {

}

export interface IMentionablePreviewEvent extends IMentionableEvent {
    nonTextPartsCount?: string;
    durationInMSec?: string;
    parts?: string;
}

export interface IDiscussionStateEventBase {
    totalCount?: string;
    visibleCount?: string;
}

export interface IDiscussionRenderEvent extends IDiscussionStateEventBase {
    messageCount?: string;
}

export interface IDiscussionShowMoreEvent extends IDiscussionStateEventBase {
}

export class CustomerIntelligenceConstants {
    public static MENTION_AREA = "Mention";

    public static WORKITEMS_INITIALIZE_EVENT = "WorkitemsInitialize";
    public static WORKITEMS_CLICK_EVENT = "WorkitemsClick";
    public static PEOPLE_CLICK_EVENT = "PeopleClick";
    public static AUTOCOMPLETE_OPEN_EVENT = "AutocompleteOpen";
    public static AUTOCOMPLETE_SUGGEST_EVENT = "AutocompleteSuggest";
    public static AUTOCOMPLETE_SELECT_EVENT = "AutocompleteSelect";
    public static AUTOCOMPLETE_CANCEL_EVENT = "AutocompleteCancel";
    public static MENTIONABLE_PREVIEW_EVENT = "MentionablePreview";
    public static MENTIONABLE_EDIT_EVENT = "MentionableEdit";
    
    public static WORKITEMPROVIDER_SEARCHONSERVER_EVENT = "WorkItemProvider.SearchOnServer";

    public static SOCIAL_AREA = "Social";

    public static DISCUSSION_RENDER_EVENT = "DiscussionRender";
    public static DISCUSSION_SHOWMORE_EVENT = "DiscussionShowMore";

    public static MATERIALIZE_IDENTITY = "MaterializeIdentity";
    public static MATERIALIZE_IDENTITY_ERROR = "MaterializeIdentityError";
}

export class EventLogging {
    private static tfsContext: TFS_Host_TfsContext.TfsContext;

    public static publishAutocompleteOpenEvent(properties: IAutocompleteOpenEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.AUTOCOMPLETE_OPEN_EVENT, properties);
    }

    public static publishAutocompleteSuggestEvent(properties: IAutocompleteSuggestEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.AUTOCOMPLETE_SUGGEST_EVENT, properties);
    }

    public static publishAutocompleteSelectEvent(properties: IAutocompleteSelectEvent) {
        const sanitizedIdentity = properties.identity ? EventLogging._sanitizeIdentityEvent({ identity: properties.identity }) : { identity: undefined };
        EventLogging.delayedPublish(CustomerIntelligenceConstants.AUTOCOMPLETE_SELECT_EVENT, { ...properties, identity: sanitizedIdentity.identity });
    }

    public static publishAutocompleteCancelEvent(properties: IAutocompleteCancelEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.AUTOCOMPLETE_CANCEL_EVENT, properties);
    }

    public static publishWorkItemsInitializeEvent(properties: IWorkItemsInitializeEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.WORKITEMS_INITIALIZE_EVENT, properties);
    }

    public static publishWorkItemsClickEvent(properties: IWorkItemsClickEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.WORKITEMS_CLICK_EVENT, properties);
    }

    public static publishPeopleClickEvent(properties: IIdentityEvent, sourcePageProps: Object) {
        const sanitizedIdentityEvent = EventLogging._sanitizeIdentityEvent(properties);

        EventLogging.delayedPublish(CustomerIntelligenceConstants.PEOPLE_CLICK_EVENT, $.extend({}, sanitizedIdentityEvent, sourcePageProps));
    }

    public static publishMentionableEditEvent(properties: IMentionableEditEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.MENTIONABLE_EDIT_EVENT, properties);
    }

    public static publishMentionablePreviewEvent(properties: IMentionablePreviewEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.MENTIONABLE_PREVIEW_EVENT, properties);
    }

    public static publishDiscussionRenderEvent(properties: IDiscussionRenderEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.DISCUSSION_RENDER_EVENT, properties, CustomerIntelligenceConstants.SOCIAL_AREA);
    }

    public static publishDiscussionShowMoreClickEvent(properties: IDiscussionShowMoreEvent) {
        EventLogging.delayedPublish(CustomerIntelligenceConstants.DISCUSSION_SHOWMORE_EVENT, properties, CustomerIntelligenceConstants.SOCIAL_AREA);
    }

    public static publishMaterializeIdentityEvent(properties: IIdentityEvent) {
        const sanitizedIdentityEvent = EventLogging._sanitizeIdentityEvent(properties);
        EventLogging.delayedPublish(CustomerIntelligenceConstants.MATERIALIZE_IDENTITY, sanitizedIdentityEvent);
    }

    public static publishMaterializeIdentityError(properties: IIdentityEvent) {
        const sanitizedIdentityEvent = EventLogging._sanitizeIdentityEvent(properties);
        EventLogging.delayedPublish(CustomerIntelligenceConstants.MATERIALIZE_IDENTITY_ERROR, sanitizedIdentityEvent);
    }

    /**
     * GDPR: Make sure we log only what we can.
     */
    private static _sanitizeIdentityEvent(identityEvent: IIdentityEvent): IIdentityEvent {
        const { identity, error } = identityEvent;
        return {
            identity: {
                localId: identity.localId,
                entityType: identity.entityType,
                originId: identity.originId,
                originDirectory: identity.originDirectory,
                active: identity.active
            } as IIdentity,
            error
        };
    }

    private static _getTfsContext(): TFS_Host_TfsContext.TfsContext {
        if (!EventLogging.tfsContext) {
            EventLogging.tfsContext = MentionHelpers.getMainTfsContext();
        }
        return EventLogging.tfsContext;
    }

    /** Attaches additional properties by default. (projectId)
    * @param properties The current json object of properties to extend onto.
    */
    private static _extendProperties(properties: any) {
        var projectId = EventLogging._getTfsContext().navigation.projectId;
        properties = (properties || {});
        properties["projectId"] = `${projectId}`;
    }

    /** Wrapper around Host.telemetryService.delayedPublish which automatically populates
    * some default fields (projectId) in properties, and gives the Mention area path.
    * @param eventName The name of the event ("feature") to log.
    * @param properties The properties to pass in as metadata.
    * @param area The area of the event. Defaults to the Mention feature area.
    */
    private static delayedPublish(eventName: string, properties: any, area: string = CustomerIntelligenceConstants.MENTION_AREA) {
        EventLogging._extendProperties(properties);
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                area,
                eventName,
                properties));
    }

    /** Wrapper around Host.telemetryService.publish which automatically populates
    * some default fields (projectId) in properties, and gives the Mention area path.
    * @param eventName The name of the event ("feature") to log.
    * @param properties The properties to pass in as metadata.
    */
    private static publish(eventName: string, properties: any) {
        EventLogging._extendProperties(properties);
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.MENTION_AREA,
            eventName,
            properties));
    }
}

VSS.tfsModuleLoaded("TFS.Social.Telemetry", exports);
