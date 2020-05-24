import Q = require("q"); 
import Diag = require("VSS/Diag");

import Mention = require("Mention/Scripts/TFS.Mention");
import {
    IAutocompletePlugin,
    IAutocompletePluginOptions,
    IInputText,
    IRange,
    IResultWithTelemetry,
    IAutocompleteReplacement
} from "Mention/Scripts/TFS.Mention.Autocomplete";
import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");
import URI = require("Presentation/Scripts/URI");
import Utils_UI = require("VSS/Utils/UI");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import {
    IdentityPickerDropdownControl,
    IIdentityPickerIdCardDialogOptions,
    IdCardDialog,
    UpdateActiveDescendantEventData,
    IIdentityPickerDropdownOptions
} from "VSS/Identities/Picker/Controls";
import IdentitiesPickerRestClient = require("VSS/Identities/Picker/RestClient");
import IdentitiesPickerServices = require("VSS/Identities/Picker/Services");
import Service = require("VSS/Service");
import UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import MentionResources = require("Mention/Scripts/Resources/TFS.Resources.Mention");
import * as Events_Services from "VSS/Events/Services";
import * as Utils_Core from "VSS/Utils/Core";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { DirectoryEntityType } from "VSS/WebApi/Constants";

import { ContributedFeatureState, ContributedFeatureEnabledValue } from "VSS/FeatureManagement/Contracts";
import { Identity } from "VSS/Identities/Contracts";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";
import * as WebApiConstants from "VSS/WebApi/Constants";
import * as GraphContracts from "VSS/Graph/Contracts";
import { GraphHttpClient } from "VSS/Graph/RestClient";
import { IIdentityEvent } from "Mention/Scripts/TFS.Social.Telemetry";

const operationScope: IdentitiesPickerServices.IOperationScope = {
    Source: true,
    IMS: true
};

export enum PeopleGroup {
    Everyone = 0
}

/**
 * Represents a mentioned identity.  If the identity is a materialized group, 'id' will be set to the vsid for the
 * group. For users, the uniqueId is not defined.
 */
export interface IIdentityMention {
    name: string;
    id?: string;
};

/* Represents a record from the DisplayNameStoragekey translation map.
 * originalDisplayName is the identity's actual display name as stored in VSTS.
 * mangledDisplayName is the mangled version of the originalDisplayName that is returned
 * when originalDisplayName conflicts with another record that has the same value
 */
export interface IDisplayNameRecord {
    originalDisplayName: string;
    mangledDisplayName: string;
}

export class Helpers {
    public static PersonArtifactType = "Person";
    public static PATTERN_WORD_START_SEPARATOR = "(?:^|[\\s\\(])";
    public static PATTERN_WORD_END_SEPARATOR = "(?:$|[\\s\\)])";
    public static PATTERN_NAME_ONE_WORD = "[^\\s]+";
    public static PATTERN_NAME_MULTI_WORD = `${Helpers.PATTERN_NAME_ONE_WORD}(\\s+[^\\s]*){0,4}`;

    public static REGEX_NAME_TRIGGER_HEAD = new RegExp(`(${Helpers.PATTERN_WORD_START_SEPARATOR})@`, "g");
    public static REGEX_NAME_TRIGGER_WHEN_OPEN = new RegExp(`(${Helpers.PATTERN_WORD_START_SEPARATOR})@(${Helpers.PATTERN_NAME_MULTI_WORD})?$`, "g");
    public static REGEX_NAME_TRIGGER_WHEN_CLOSED = new RegExp(`(${Helpers.PATTERN_WORD_START_SEPARATOR})@(${Helpers.PATTERN_NAME_ONE_WORD})?$`, "g");

    public static REGEX_MENTION_USERS_AND_MATERIALIZEDGROUPS = new RegExp("@<(\\S{1,256}?)>|@<(.{1,256}? \\[id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\])>|@<(.{1,256}?)>|@<([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})>", "g");
    public static REGEX_PERSON_MENTION_IN_WORKITEM_DISC = new RegExp(`${Mention.Constants.HTML_MENTION_VERSION_20},[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, "i");

    public static REGEX_CONSECUTIVE_WHITESPACES = /\s\s/;

    public static regexMention(): RegExp {
        // Matches identities in plain text like @<textWithNoSpaces> or @<textThatMayHaveSpaces [id:guid]> or @<guid> or @<anytext>
        return Helpers.REGEX_MENTION_USERS_AND_MATERIALIZEDGROUPS;
    }

    // Returns true if the metadata string contains a version in the allowed format.
    public static metadataContainsValidVersion(metadata: string): boolean {
        return (Utils_String.startsWith(metadata, Mention.Constants.HTML_MENTION_VERSION_10) || Utils_String.startsWith(metadata, Mention.Constants.HTML_MENTION_VERSION_20))
    }

    public static matchAndRemoveWordStartSeparator(regex: RegExp, text: string): RegExpExecArray {
        const match = regex.exec(text);
        if (match) {
            const wordStartSeparatorLength = match[1] && match[1].length ? match[1].length : 0;
            let trimmedMatch = <RegExpExecArray>[match[0].substring(wordStartSeparatorLength)];
            trimmedMatch = <RegExpExecArray>trimmedMatch.concat(match.slice(2));
            trimmedMatch.index = match.index + wordStartSeparatorLength;
            trimmedMatch.input = match.input;
            return trimmedMatch;
        }
        return null;
    }

    public static getMentionTrigger(textBeforeCursor: string, isOpen: boolean) {
        let match: RegExpExecArray;

        let startFrom = 0;
        Helpers.REGEX_NAME_TRIGGER_HEAD.lastIndex = 0;
        while (match = Helpers.REGEX_NAME_TRIGGER_HEAD.exec(textBeforeCursor)) {
            startFrom = match.index;
        }

        if (isOpen) {
            Helpers.REGEX_NAME_TRIGGER_WHEN_OPEN.lastIndex = startFrom;
            match = Helpers.matchAndRemoveWordStartSeparator(Helpers.REGEX_NAME_TRIGGER_WHEN_OPEN, textBeforeCursor);
        }
        else {
            Helpers.REGEX_NAME_TRIGGER_WHEN_CLOSED.lastIndex = startFrom;
            match = Helpers.matchAndRemoveWordStartSeparator(Helpers.REGEX_NAME_TRIGGER_WHEN_CLOSED, textBeforeCursor);
        }
        if (match) {
            Helpers.regexMention().lastIndex = 0;
            const mentionMatch = Helpers.regexMention().exec(match[0]);
            const triggerStartsWithButIsNotEntirelyACompleteMention = mentionMatch && mentionMatch.index === 0 && mentionMatch[0].length < match[0].length;
            if (!triggerStartsWithButIsNotEntirelyACompleteMention) {
                let prefix = match[1] || "";
                if (Helpers.REGEX_CONSECUTIVE_WHITESPACES.exec(prefix)) {
                    return null;
                }
                if (prefix.indexOf("<") === 0) {
                    prefix = prefix.substring(1);
                }
                if (prefix.indexOf(">") === prefix.length - 1) {
                    prefix = prefix.substring(0, prefix.length - 1);
                }
                return {
                    prefix: prefix,
                    index: match.index,
                    match: match[0]
                }
            }
        }
        return null;
    }

    public static useNotificationsPipeline(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UseNotificationPipelineForMentions) &&
            FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.AllowGroupMentions);
    }

    public static useStorageKeysInMentions(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UseStorageKeyInMentions);
    }

    public static getSupportedEntityTypes(): IdentitiesPickerServices.IEntityType {
        const identityType: IdentitiesPickerServices.IEntityType = {
            User: true,
            Group: Helpers.useNotificationsPipeline()
        };

        return identityType;
    }

    public static getIdentityId(identity: IdentitiesPickerRestClient.IEntity) {
        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            if (Helpers.useStorageKeysInMentions()) {
                return identity.displayName;
            } else {
                return identity.signInAddress != null ? identity.signInAddress : identity.displayName;
            }
        }
        if (identity.entityType === DirectoryEntityType.Group) {
            // Add '[' and ']' around the scope for groups.
            return `[${identity.scopeName}]\\${identity.samAccountName}`;
        }
        return `${identity.scopeName}\\${identity.samAccountName}`;
    }

    public static getMetadataFromTextMention(mentionText: string): string {
        if (mentionText) {
            const endIndex = mentionText.lastIndexOf("]");
            const startIndex = mentionText.lastIndexOf(" [", endIndex);

            if (startIndex >= 0 && endIndex > startIndex) {
                return mentionText.substring(startIndex + 2, endIndex);
            }
        }

        return null;
    }

    public static getVsidFromMetadata(metadata: string): string {
        if (!metadata || !Helpers.metadataContainsValidVersion(metadata)) {
            return null;
        }

        // Format of the metadata is one of four forms:
        // RichText: "version:1.0", "version:1.0,id:guid", "version:2.0,guid"
        // PlainText: "id:guid"

        // id:guid
        let vsid = Helpers.getDataFromMetadata(metadata, Mention.Constants.HTML_MENTION_ID_ATTR);

        // other cases
        if (!vsid) {
            const items = metadata.split(",");
            if (items.length === 2) {
                vsid = items[1];
            }
        }

        if (vsid && Utils_String.isGuid(vsid)) {
            return vsid;
        }

        return null;
    }

    public static getDataFromMetadata(metadata: string, propertyName: string): string {
        if (!metadata || !propertyName) {
            return null;
        }

        const items = metadata.split(",");
        propertyName = propertyName + Mention.Constants.METADATA_ATTR_SEPARATOR;

        for (let property of items) {
            property = property.trim();
            if (property.indexOf(propertyName) === 0) {
                return property.substr(propertyName.length);
            }
        }

        return null;
    }

    public static formatUniqueId(uniqueId: string): string {
        if (!uniqueId || uniqueId.length === 0) {
            return "";
        }

        return Helpers.formatIdentifier(Mention.Constants.HTML_MENTION_ID_ATTR_PREFIX + uniqueId);
    }

    public static formatIdentityAttribute(identity: IdentitiesPickerRestClient.IEntity): string {
        const identityUniqueId = Helpers.getIdentityAttribute(identity);

        if (identityUniqueId && identity.entityType === DirectoryEntityType.Group) {
            return Helpers.formatIdentifier(identityUniqueId);
        }
        return "";
    }

    public static getIdentityAttribute(identity: IdentitiesPickerRestClient.IEntity): string {
        let identityAttribute: string;

        if (Helpers.useStorageKeysInMentions()) {
            if (identity) {
                identityAttribute = identity.localId;
            }
        }
        else {
            // Only add the id attribute for materialized groups for now to be consistent
            // with plaintext mentions
            if (identity && identity.entityType === DirectoryEntityType.Group) {
                if (identity.localId) {
                    identityAttribute = Mention.Constants.HTML_MENTION_ID_ATTR_PREFIX + identity.localId;
                }
            }
        }

        return identityAttribute;
    }

    private static formatIdentifier(id: string): string {
        return `[${id}]`;
    }
}

export class PersonAutocompleteProvider implements IAutocompletePlugin<IAutocompletePluginOptions> {
    private _options: IAutocompletePluginOptions;
    private _identityPickerDropdown: IdentityPickerDropdownControl;
    private _inputText: IInputText;
    private _isOpen: boolean;
    /**
     * To keep track of the associated identity picker.
     */
    private _identityPickerDropdownId: string;

    constructor(options?: IAutocompletePluginOptions) {
        this._options = options || {};
    }

    public initialize() {
        this._identityPickerDropdownId = GUIDUtils.newGuid();

        const identityPickerDropdownOptions: IIdentityPickerDropdownOptions = {
            operationScope: operationScope,
            identityType: Helpers.getSupportedEntityTypes(),
            onItemSelect: MentionHelpers.delegate(this, (item: IdentitiesPickerRestClient.IEntity) => {
                this._selectIdentity(<JQueryEventObject>{}, item);
            }),
            onHide: (event) => {
                if (!event) {
                    event = $.Event("identityPickerHide");
                }
                // it is possible to have text before @ so close the mention only if the @ doesn't have a space before it
                if (this._inputText && this._inputText.textBeforeSelection !== "@" && !(/\s@$/).test(this._inputText.textBeforeSelection)) {
                    this.close(event, this._inputText);
                }
            },
            showMru: true,
            showContactCard: Helpers.useStorageKeysInMentions(),
            useRemainingSpace: this._options.useRemainingSpace,
            alignment: {
                positioningElement: this._options.positioningElement
            },
            consumerId: Mention.Constants.IDENTITY_PICKER_CONSUMER_ID,
            eventOptions: {
                uniqueId: this._identityPickerDropdownId,
            },
            preDropdownRender: (entityList: IdentitiesPickerRestClient.IEntity[]) => {
                return Helpers.useStorageKeysInMentions() ? entityList : this.filterEntities(entityList);
            }
        };

        this._identityPickerDropdown = Controls.create(IdentityPickerDropdownControl, this._getMenuContainer(), identityPickerDropdownOptions);
        this._identityPickerDropdown.hide();
    }

    private filterEntities(entityList: IdentitiesPickerRestClient.IEntity[]): IdentitiesPickerRestClient.IEntity[] {
        if (entityList && entityList.length > 0) {
            return entityList.filter((entity: IdentitiesPickerRestClient.IEntity) => {
                return entity.localId !== null || entity.entityType !== DirectoryEntityType.Group;
            });
        }
        return entityList;
    }

    public getPluginName(): string {
        return "PersonAutocompleteProvider";
    }

    public canOpen(inputText: IInputText): IRange {
        const trigger = Helpers.getMentionTrigger(inputText.textBeforeSelection, this._isOpen);
        if (!!trigger) {
            return {
                start: trigger.index,
                end: inputText.textBeforeSelection.length
            }
        }
        return null;
    }

    public open(event: JQueryEventObject, inputText: IInputText) {
        this._inputText = inputText;
        this._isOpen = true;

        const $textInput = this._getMentionTextArea();
        if ($textInput) {
            const isContentEditable = $textInput.length && $textInput[0].tagName === "DIV"; // content editable should not have aria-expanded
            $textInput.attr({
                "aria-owns": this._identityPickerDropdown.getId(),
                "aria-expanded": isContentEditable ? null : "true",
                "aria-autocomplete": "list"
            });

            Events_Services.getService()
                .attachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updateActiveDescendantHandler);
        }
    }

    public suggest(event: JQueryEventObject, inputText: IInputText): PromiseLike<IResultWithTelemetry<{}, Telemetry.IAutocompleteSuggestEvent>> {
        const deferred = $.Deferred<IResultWithTelemetry<{}, Telemetry.IAutocompleteSuggestEvent>>();
        const startTime = new Date().getTime();
        this._inputText = inputText;
        const trigger = Helpers.getMentionTrigger(inputText.textBeforeSelection, true);

        const successCallback = (identities: IdentitiesPickerRestClient.IEntity[]) => {
            if (this._isOpen !== this._identityPickerDropdown.isVisible()) {
                if (this._isOpen) {
                    this._identityPickerDropdown.show();
                }
                else {
                    this._identityPickerDropdown.hide();
                }
            }
            deferred.resolve({
                result: void 0,
                telemetry: {
                    suggestionsCount: `${identities.length}`,
                    durationInMSec: `${new Date().getTime() - startTime}`
                }
            });
        };
        const errorCallback = (errorData: any) => {
            deferred.reject(errorData);
        };

        if (trigger.prefix) {
            this._identityPickerDropdown.getIdentities(trigger.prefix).then(MentionHelpers.delegate(this, successCallback), MentionHelpers.delegate(this, errorCallback));
        }
        else {
            this._identityPickerDropdown.showAllMruIdentities().then(MentionHelpers.delegate(this, successCallback));
        }

        return deferred;
    }

    public close(event: JQueryEventObject, inputText: IInputText) {
        if (!this._isOpen) {
            return;
        }
        this._inputText = inputText;
        this._isOpen = false;
        this._identityPickerDropdown.hide();

        const $textInput = this._getMentionTextArea();
        if ($textInput) {
            const isContentEditable = $textInput.length && $textInput[0].tagName === "DIV"; // content editable should not have aria-expanded
            $textInput.attr({
                "aria-owns": null,
                "aria-autocomplete": null,
                "aria-activedescendant": null,
                "aria-expanded": isContentEditable ? null : "false"
            });
            Events_Services.getService()
                .detachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updateActiveDescendantHandler);
        }
        if (this._options.close) {
            this._options.close(event, this._inputText);
        }
    }

    public handle(event: JQueryEventObject): boolean {
        if (event.type === "blur") {
            if (this._identityPickerDropdown.isVisible() && !$('.identity-picker-dropdown:hover', this._getMenuContainer()).length) {
                this.close(event, this._inputText);
            }
        } else if (event.type === "keydown" && !MentionHelpers.eventHasPrintableCharacter(event)) {
            if (event.keyCode === UI.KeyCode.ENTER || event.keyCode === UI.KeyCode.TAB) {
                const selectedItem = this._identityPickerDropdown.getSelectedItem();
                if (selectedItem) {
                    this._selectIdentity(event, selectedItem);
                    return false;
                }
            }
            return this._identityPickerDropdown.handleKeyEvent(event);
        }
    }

    public dispose() {
        // make sure we detach event in possible case when onClose doesn't fire.
        Events_Services.getService()
            .detachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updateActiveDescendantHandler);
        this._identityPickerDropdown.dispose();
    }

    public prefetch() {
        if (this._identityPickerDropdown) {
            this._identityPickerDropdown.load();
        }
    }

    private _selectIdentity(event: JQueryEventObject, identity: IdentitiesPickerRestClient.IEntity) {
        const selectionIndex = this._identityPickerDropdown.getSelectedIndex();

        const trigger = Helpers.getMentionTrigger(this._inputText.textBeforeSelection, true);
        const identityDisplayText = Helpers.getIdentityId(identity);
        let additionalMetadata = "";

        const callback = (displayText: string, additionalMetaData: string, pickerIdentity: IdentitiesPickerRestClient.IEntity): void => {
            if (pickerIdentity) {
                const inputText = {
                    textBeforeSelection: this._inputText.textBeforeSelection.substr(0, trigger.index) + "@<" + displayText + additionalMetadata + "> ",
                    textInSelection: "",
                    textAfterSelection: this._inputText.textAfterSelection
                };
                this._inputText = inputText;
                if (this._options.select) {
                    const replacement: IAutocompleteReplacement = {
                        getPlainText: () => inputText,
                        getHtml: () => createPeopleHtmlMention(pickerIdentity)
                    };

                    const telemetryProperties = {
                        selectionIndex: `${selectionIndex}`,
                        identity: pickerIdentity,
                    };

                    this._options.select(event, replacement, telemetryProperties);
                }
                this.close(event, this._inputText);
                if (pickerIdentity.localId) {
                    // Add only materialized identities - no point adding null to the MRU
                    this._identityPickerDropdown.addIdentitiesToMru([pickerIdentity.localId]);
                }
            }

            this._identityPickerDropdown.hide();
        };

        if (Helpers.useStorageKeysInMentions()) {
            const translationProvider = DisplayNameStorageKeyTranslationProvider.getDefault();
            if (!identity.localId) {
                // Materialize identity
                Telemetry.EventLogging.publishMaterializeIdentityEvent({ identity });
                translationProvider.getStorageKeyFollowingMaterialization(identity)
                    .then((storageKey) => {
                        return PeopleProvider.getInstance().getByUniqueId(storageKey)
                            .then((pickerIdentity) => {
                                if (pickerIdentity) {
                                    // we need to always re-read the display name in case it is changed in VSTS.
                                    const displayText = Helpers.getIdentityId(pickerIdentity);
                                    const mangledDisplayText = translationProvider.addDisplayNameAndStorageKey(displayText, storageKey);
                                    callback(mangledDisplayText, additionalMetadata, pickerIdentity);
                                    return pickerIdentity;
                                } else {
                                    return Q.reject("pickerIdentity is null after materialization");
                                }
                            });
                    })
                    .then(null, (error) => {
                        this._handleMaterializationError(identity, error, identityDisplayText);
                        // Close the picker drop down so that it doesn't get in the way of materialization error dialog
                        this._identityPickerDropdown.hide();
                    });
            } else {
                // It's a materialized identity so, just add it to the translation map and proceed further to show the display name
                const mangledDisplayText = translationProvider.addDisplayNameAndStorageKey(identityDisplayText, identity.localId);
                callback(mangledDisplayText, additionalMetadata, identity);
            }
        } else if (identity.entityType === DirectoryEntityType.Group) {
            additionalMetadata = " " + Helpers.formatIdentityAttribute(identity);
            callback(identityDisplayText, additionalMetadata, identity);
        } else {
            // fallback to the original flow when FF is off
            callback(identityDisplayText, additionalMetadata, identity);
        }
    }

    private _handleMaterializationError(identity: IdentitiesPickerRestClient.IEntity, error: any, identityDisplayText: string): void {
        const $errorMessage = $("<div>")
            .css("font-weight", "bold")
            .html(Utils_String.format(MentionResources.MentionMaterializeIdentityFailError,
                PeopleHtmlMentionsRenderingProvider.CSS_CLASS_PERSON_MENTION,
                Utils_String.htmlEncode(identityDisplayText)));

        const errorMessageDialog = (displayNameInRawText: string): void => {
            Dialogs.showMessageDialog($errorMessage,
                {
                    title: MentionResources.MentionMaterializeErrorDialogTitle,
                    buttons: [Dialogs.MessageDialog.buttons.close]
                }).then((dialogResult) => {
                    //Doesn't matter whether user choses Ok or Cancel or Esc
                    return null;
                });
        };

        Telemetry.EventLogging.publishMaterializeIdentityError({
            identity,
            error
        });
        errorMessageDialog(identityDisplayText);
    }

    private _getMenuContainer(): JQuery {
        return this._options.menuContainer
            ? this._options.menuContainer()
            : $(document.body);
    }

    private _updateActiveDescendantHandler = (args: UpdateActiveDescendantEventData): void => {
        const $textInput = this._getMentionTextArea();
        if ($textInput && args
            // make sure to handle only your own picker.
            && args.uniqueId === this._identityPickerDropdownId) {
            // delay is needed for screen reader to work properly.
            Utils_Core.delay(this, 0, () => {
                $textInput.attr("aria-activedescendant", args.activeDescendantId);
            });
        }
    }

    private _getMentionTextArea(): JQuery {
        return this._options.textElement
            ? this._options.textElement()
            : null;
    }
}

export class PeopleMentionsRenderingProvider implements Mention.IMentionsRenderingProvider {
    public static CSS_CLASS_PERSON_MENTION = "mention-preview-person";
    public static CSS_CLASS_PERSON_MENTION_ME = "mention-preview-me";
    public static CSS_CLASS_PERSON_MENTION_CARD = "mention-card";
    public static CSS_CLASS_PERSON_MENTION_CLICKABLE = "mention-preview-person-clickable";
    private static _IDENTITY_DATA_ATTRIBUTE = "data-identity";

    private static _instance: PeopleMentionsRenderingProvider;

    public static getDefault(): PeopleMentionsRenderingProvider {
        if (!PeopleMentionsRenderingProvider._instance) {
            PeopleMentionsRenderingProvider._instance = new PeopleMentionsRenderingProvider();
        }
        return PeopleMentionsRenderingProvider._instance;
    }

    public getArtifactType() { return Helpers.PersonArtifactType; }

    public renderPerson(identity: IIdentityMention, insertHtml: (html: string) => JQuery, enableContactCard: boolean = true): IPromise<Mention.MentionRendererHTMLComponent> {
        const callback = (identityEntity: IdentitiesPickerRestClient.IEntity): Mention.MentionRendererHTMLComponent => {
            if (identityEntity) {
                const identityToolTip = Helpers.getIdentityId(identityEntity);
                const $span = $("<span>")
                    .addClass(PeopleMentionsRenderingProvider.CSS_CLASS_PERSON_MENTION)
                    .text("@" + identityEntity.displayName);

                if (identityToolTip !== identityEntity.displayName) {
                    $span.attr("title", identityToolTip);
                }

                if (PeopleProvider.getInstance().isIdentityCurrentUser(identityEntity)) {
                    $span.addClass(PeopleMentionsRenderingProvider.CSS_CLASS_PERSON_MENTION_ME);
                }

                const $mention = insertHtml($span[0].outerHTML)
                    .attr("tabindex", "0")
                    .attr("aria-label", "@" + identityEntity.displayName);

                if (enableContactCard) {
                    $mention.attr("role", "button")
                        .addClass(PeopleMentionsRenderingProvider.CSS_CLASS_PERSON_MENTION_CLICKABLE);

                    $mention.attr(PeopleMentionsRenderingProvider._IDENTITY_DATA_ATTRIBUTE, JSON.stringify(identityEntity));
                    PeopleMentionsRenderingProvider._registerMentionClickHandler($mention, identityEntity);
                }
                const peopleMention: Mention.MentionRendererHTMLComponent = {
                    htmlComponent: $mention,
                    displayText: "@" + identityEntity.displayName
                }
                return peopleMention;
            }
            return null;
        };

        if (identity) {
            //Always check for the pattern for materialized groups first
            if (identity.id) {
                return PeopleProvider.getInstance().getByUniqueId(identity.id).then((identity: IdentitiesPickerRestClient.IEntity) => {
                    return callback(identity);
                });
            } else if (Helpers.useStorageKeysInMentions()) {
                //For cases when we're rendering the mentions that already contain storage keys in them
                if (Utils_String.isGuid(identity.name)) {
                    return PeopleProvider.getInstance().getByUniqueId(identity.name).then((pickerIdentity: IdentitiesPickerRestClient.IEntity) => {
                        if (pickerIdentity) {
                            DisplayNameStorageKeyTranslationProvider.getDefault().addDisplayNameAndStorageKey(Helpers.getIdentityId(pickerIdentity), identity.name);
                        }
                        return callback(pickerIdentity);
                    });
                } else {
                    const storageKey = DisplayNameStorageKeyTranslationProvider.getDefault().getStorageKeyUsingDisplayName(identity.name);
                    if (storageKey) {
                        return PeopleProvider.getInstance().getByUniqueId(storageKey).then((identity: IdentitiesPickerRestClient.IEntity) => {
                            return callback(identity);
                        });
                    } else {
                        //Always fallback to reading with accountname otherwise, mentions with e-mail addresses will not be resolved
                        return PeopleProvider.getInstance().getByUniqueName(identity.name).then((identity: IdentitiesPickerRestClient.IEntity) => {
                            return callback(identity);
                        });
                    }
                }
            } else {
                return PeopleProvider.getInstance().getByUniqueName(identity.name).then((identity: IdentitiesPickerRestClient.IEntity) => {
                    return callback(identity);
                });
            }
        }
    }

    public renderMention(mention: Mention.IMentionTextPart, insertHtml: (html: string) => JQuery, enableContactCard: boolean = true): IPromise<Mention.MentionRendererHTMLComponent> {
        Diag.Debug.assertParamIsNotNull(mention, "mention");

        // Split out the unique id and name from the mention text if it exists.
        const metadata = Helpers.getMetadataFromTextMention(mention.ArtifactId);
        let uniqueId = Helpers.getDataFromMetadata(metadata, Mention.Constants.HTML_MENTION_ID_ATTR);

        let artifactId = mention.ArtifactId;
        let mentionText = mention.Text;

        if (uniqueId) {
            // Id was part of the string, strip it out of the text so we don't render it
            const idText = " " + Helpers.formatUniqueId(uniqueId);

            artifactId = artifactId.replace(idText, "");
            mentionText = mentionText.replace(idText, "");
        }

        return this.renderPerson({ name: artifactId, id: uniqueId }, insertHtml, enableContactCard)
            .then((peopleMention) => {
                if (!peopleMention) {
                    const $mentionText = $("<span>").text(mentionText);
                    const $mention = insertHtml($mentionText[0].outerHTML);
                    let mentionHTML: Mention.MentionRendererHTMLComponent = {
                        htmlComponent: $mention,
                        displayText: "@" + artifactId
                    }
                    return mentionHTML;
                }
                return peopleMention;
            });
    }

    public getTelemetryMentionSummary(mention: Mention.IMentionTextPart): string {
        return `${this.getArtifactType()}:${mention.ArtifactId}`;
    }

    public static registerMentionClickHandler(element: HTMLElement, sourcePageTelemetryProperties?: Object): void {
        let $ele = $(element);
        this._registerMentionClickHandler($("." + this.CSS_CLASS_PERSON_MENTION_CLICKABLE, $ele), undefined, sourcePageTelemetryProperties);
    }

    private static _registerMentionClickHandler(
        $element: JQuery,
        identity?: IdentitiesPickerRestClient.IEntity,
        sourcePageTelemetryProperties?: Object): void {
        $element.click(e => {
            let identityEntity = identity;
            if (!identityEntity) {
                identityEntity = JSON.parse(e.target.getAttribute(this._IDENTITY_DATA_ATTRIBUTE));
            }
            this._renderMentionDialog($(e.target), identityEntity, e, sourcePageTelemetryProperties);
        });

        $element.keydown((e) => {
            let identityEntity = identity;
            if (!identityEntity) {
                identityEntity = JSON.parse(e.target.getAttribute(this._IDENTITY_DATA_ATTRIBUTE));
            }

            if (e.which === Utils_UI.KeyCode.ENTER || e.which === Utils_UI.KeyCode.SPACE) {
                this._renderMentionDialog($(e.target), identityEntity, e, sourcePageTelemetryProperties);
            }
        });
    }

    private static _renderMentionDialog(
        $element: JQuery,
        identity: IdentitiesPickerRestClient.IEntity,
        event: any,
        sourcePageTelemetryProperties?: Object) {
        event.stopPropagation();

        const elementWindow = MentionHelpers.getWindow($element[0]);
        const $iframe = (elementWindow && window !== elementWindow && elementWindow.frameElement)
            ? $(elementWindow.frameElement)
            : null;

        const dialog = Controls.Enhancement.enhance(IdCardDialog, "<div/>", {
            uniqueIdentifier: identity.entityId,
            anchor: $element,
            anchorContainer: $iframe,
            xvalue: 0,
            operationScope: operationScope,
            identityType: Helpers.getSupportedEntityTypes(),
            httpClient: null,
            consumerId: Mention.Constants.IDENTITY_PICKER_CONSUMER_ID,
        } as IIdentityPickerIdCardDialogOptions);

        dialog.getElement().closest('.ui-dialog').addClass(PeopleMentionsRenderingProvider.CSS_CLASS_PERSON_MENTION_CARD);

        Telemetry.EventLogging.publishPeopleClickEvent({ identity }, sourcePageTelemetryProperties);
    }
}

/**
 * Used in cases when we need to render html-like mentions.
 * E.g: Mobile Discussion form, where we transform plaintext mentions into html
 * before saving, for backward compatibility with desktop rich editor.
 */
export class PeopleHtmlMentionsRenderingProvider extends PeopleMentionsRenderingProvider {

    public renderMention(mention: Mention.IMentionTextPart, insertHtml: (html: string) => JQuery): IPromise<Mention.MentionRendererHTMLComponent> {
        Diag.Debug.assertParamIsNotNull(mention, "mention");

        // Split out the unique id and name from the mention text if it exists.
        const metadata = Helpers.getMetadataFromTextMention(mention.ArtifactId);

        // Mentions can be written in plaintext in the following formats:
        // @<email@address>, @<group display name [id:guid]>, and @<display name>
        // @<display name> will only be present after the storage keys feature flag is turned on
        // However, @<email@address>, @<group display name [id:guid]> can exist if the flag is on or off,
        // in the case where binaries have been deployed, but servicing hasn't been run yet.
        const uniqueId = metadata
            ? Helpers.getDataFromMetadata(metadata, Mention.Constants.HTML_MENTION_ID_ATTR)
            : Helpers.useStorageKeysInMentions()
                ? DisplayNameStorageKeyTranslationProvider.getDefault().getStorageKeyUsingDisplayName(mention.ArtifactId)
                : null;

        const callback = (identity: IdentitiesPickerRestClient.IEntity): Mention.MentionRendererHTMLComponent => {
            if (identity) {
                const html = createPeopleHtmlMention(identity);
                const $mention = insertHtml(html);
                const mentionHTHL: Mention.MentionRendererHTMLComponent = {
                    htmlComponent: $mention,
                    displayText: "@"+identity.displayName
                };
                return mentionHTHL;
            }
            return null;
        };

        if (uniqueId) {
            return PeopleProvider.getInstance().getByUniqueId(uniqueId)
                .then((identity: IdentitiesPickerRestClient.IEntity) => {
                    return callback(identity);
                });
        } else {
            return PeopleProvider.getInstance().getByUniqueName(mention.ArtifactId)
                .then((identity: IdentitiesPickerRestClient.IEntity) => {
                    return callback(identity);
                });
        }
    }
}

export class PeopleMentionParser extends Mention.ArtifactMentionParser {
    private static _instance: PeopleMentionParser;

    public static getDefault(): PeopleMentionParser {
        if (!PeopleMentionParser._instance) {
            PeopleMentionParser._instance = new PeopleMentionParser();
        }
        return PeopleMentionParser._instance;
    }

    public parseFromText(text: string): Mention.ArtifactMentionParserTextResult[] {
        const artifacts: Mention.ArtifactMentionParserTextResult[] = [];
        const regex = Helpers.regexMention();
        regex.lastIndex = 0;
        let match;
        while (match = regex.exec(text)) {
            artifacts.push({
                index: {
                    start: match.index,
                    end: regex.lastIndex,
                },
                id: match[4] || match[3] || match[2] || match[1] //we now have 4 regex groups
            });
        }
        return artifacts;
    }

    public parseFromHtml($html: JQuery, foundMention: ($a, mention) => void): void {
        const $personMentions = $html.find(`a[href^="${Mention.Constants.HTML_MENTION_LEGACY_FORMAT_HREF}"]`);
        $personMentions.each((i, elem) => {
            const $a = $(elem);
            const mention = this.parseFromMailtoAnchor($a);
            if (mention) {
                foundMention($a, mention);
            }
        });

        const $personNewMentions = $html.find(`a[${Mention.Constants.HTML_MENTION_ATTR_NAME}^="${Mention.Constants.HTML_MENTION_VERSION_20}"]`);
        $personNewMentions.each((i, elem) => {
            const $a = $(elem);
            const mention = this.parseFromAnchor($a);
            if (mention) {
                foundMention($a, mention);
            }
        });
    }

    public getArtifactType() {
        return Helpers.PersonArtifactType;
    }

    private parseFromMailtoAnchor($a: JQuery): IIdentityMention {
        const url = $a.attr("href");
        const u = new URI(url);

        const metadata = $a.attr(Mention.Constants.HTML_MENTION_ATTR_NAME) as string;
        const uniqueId = Helpers.getDataFromMetadata(metadata, Mention.Constants.HTML_MENTION_ID_ATTR);

        return { name: decodeURI(u.path()), id: uniqueId };
    }

    private parseFromAnchor($a: JQuery): IIdentityMention {
        const metadata = $a.attr(Mention.Constants.HTML_MENTION_ATTR_NAME);
        const vsid = Helpers.getVsidFromMetadata(metadata);
        const displayName = $a.text();
        return { name: displayName, id: vsid };
    }
}

export class PeopleMentionProcessor {
    public static processHtml($html: JQuery, enableContactCard: boolean = true) {
        PeopleMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            PeopleMentionsRenderingProvider.getDefault()
                .renderPerson(mention, (html) => $("<span>").append(html), enableContactCard)
                .then((result) => {
                    if (result) {
                        $a.replaceWith(result.htmlComponent);
                    }
                });
        });
    }
}

export class DisplayNameStorageKeyTranslationProvider implements Mention.IMentionTranslationProvider {
    private static _instance: DisplayNameStorageKeyTranslationProvider;
    private displayNameToStorageKeyMap: IDictionaryStringTo<string> = {}; //Map to translate the displaynames in raw text to storage keys
    private storageKeyToDisplayNameMap: IDictionaryStringTo<IDisplayNameRecord> = {}; //ReverseMap used while rendering

    public static getDefault(): DisplayNameStorageKeyTranslationProvider {
        if (!DisplayNameStorageKeyTranslationProvider._instance) {
            DisplayNameStorageKeyTranslationProvider._instance = new DisplayNameStorageKeyTranslationProvider();
        }
        return DisplayNameStorageKeyTranslationProvider._instance;
    }

    //Adds displayname and storage key to maps and returns the mangled (in case of conflicts)/original displayname that was stored finally
    //in the maps. NOTE: input parameter 'displayName' should always be an unmangled string - Ex: Foo Bar and NOT Foo Bar(1)
    public addDisplayNameAndStorageKey(displayName: string, storageKey: string): string {
        let retDisplayName: string = displayName;

        if (storageKey && displayName && Utils_String.isGuid(storageKey)) {
            if (!this.isDisplayNameAndStorageKeyAlreadyAdded(storageKey, displayName)) {
                //Make sure that the displayname is not mapped already to a different storage key and if so, mangle the display name to avoid 
                //conflicts with existing keys
                retDisplayName = this.checkIfDisplayNameExistsInMapAndMangle(displayName);

                //It's ok to overwrite the existing keys as we want the user's latest display name associated with
                //the storage key
                this.displayNameToStorageKeyMap[retDisplayName] = storageKey.toUpperCase();
                this.storageKeyToDisplayNameMap[storageKey.toUpperCase()] = { originalDisplayName: displayName, mangledDisplayName: retDisplayName };
            }
        }

        return retDisplayName;
    }

    public getDisplayNameRecordUsingStorageKeyAsync(storageKey: string): IPromise<IDisplayNameRecord> {
        if (!storageKey || !Utils_String.isGuid(storageKey)) {
            return Q.resolve(null);
        } else {
            const storageKeyUpperCase = storageKey.toUpperCase();
            if (this.storageKeyToDisplayNameMap[storageKeyUpperCase]
                && this.storageKeyToDisplayNameMap.hasOwnProperty(storageKeyUpperCase)) {
                return Q.resolve(this.storageKeyToDisplayNameMap[storageKeyUpperCase]);
            } else {
                return PeopleProvider.getInstance()
                    .getByUniqueId(storageKey)
                    .then((identityPickerResult: IdentitiesPickerRestClient.IEntity) => {
                        if (identityPickerResult) {
                            const displayName = Helpers.getIdentityId(identityPickerResult);
                            this.addDisplayNameAndStorageKey(displayName, storageKey);
                            return this.storageKeyToDisplayNameMap[storageKeyUpperCase];
                        } else {
                            return null;
                        }
                    }, (error) => Q.resolve(null));
            }
        }
    }

    public getStorageKeyUsingDisplayName(displayName: string): string {
        if (displayName && this.displayNameToStorageKeyMap[displayName] && this.displayNameToStorageKeyMap.hasOwnProperty(displayName)) {
            return this.displayNameToStorageKeyMap[displayName];
        } else {
            return null;
        }
    }

    public translateDisplayNamesToStorageKeys(rawUntranslatedText: string): string {
        const resultArray: string[] = [];
        const codeBlocks = Mention.MentionProcessor.getDefault().parseCodeBlocksFromText(rawUntranslatedText);
        const result: Mention.ITextPart[] = PeopleMentionParser.getDefault().parseMentions(rawUntranslatedText, 0, codeBlocks);

        result.forEach((part) => {
            if (part.Type === Mention.TextPartType.Mention) {
                const mention = part as Mention.IMentionTextPart;
                if (mention.ArtifactType === Helpers.PersonArtifactType) {
                    const translatedValue = this.getStorageKeyUsingDisplayName(mention.ArtifactId);
                    if (translatedValue) {
                        resultArray.push("@<" + translatedValue + ">");
                    } else {
                        resultArray.push(part.Text);
                    }

                } else {
                    resultArray.push(part.Text);
                }
            } else {
                resultArray.push(part.Text);
            }
        });

        return resultArray.join("");
    }

    public translateStorageKeysToDisplayNames(rawUntranslatedText: string): IPromise<string> {
        const deferred = Q.defer<string>();
        const promiseStringArray: IPromise<string>[] = [];
        const codeBlocks = Mention.MentionProcessor.getDefault().parseCodeBlocksFromText(rawUntranslatedText);
        const parsedTextInputItems: Mention.ITextPart[] = PeopleMentionParser.getDefault().parseMentions(rawUntranslatedText, 0, codeBlocks);

        parsedTextInputItems.forEach((part, index) => {
            if (part.Type === Mention.TextPartType.Mention) {
                const mention = part as Mention.IMentionTextPart;
                if (mention.ArtifactType === Helpers.PersonArtifactType) {
                    promiseStringArray[index] = this.getDisplayNameRecordUsingStorageKeyAsync(mention.ArtifactId).then((displayNameRecord) => {
                        if (!displayNameRecord || !displayNameRecord.mangledDisplayName) {
                            return Q.resolve(part.Text);
                        } else {
                            return Q.resolve("@<" + displayNameRecord.mangledDisplayName + ">");
                        }
                    });
                } else {
                    promiseStringArray[index] = Q.resolve(part.Text);
                }
            } else {
                promiseStringArray[index] = Q.resolve(part.Text);
            }
        });

        Q.all(promiseStringArray).then((translatedArray) => {
            deferred.resolve(translatedArray.join(""));
        });

        return deferred.promise;
    }

    /**
     * Materializes provided identity and returns its storage key.
     * Returns error in all other cases.
     */
    public getStorageKeyFollowingMaterialization(identity: IdentitiesPickerRestClient.IEntity): IPromise<string> {
        return MaterializeIdentityProvider.getInstance().MaterializeIdentity(identity)
            .then((storageKey) => {
                if (storageKey) {
                    return storageKey;
                } else {
                    return Q.reject("MaterializeIdentityProvider.MaterializeIdentity returned empty storageKey");
                }
            });
    }

    private isDisplayNameAndStorageKeyAlreadyAdded(storageKey: string, displayName: string): boolean {
        return this.storageKeyToDisplayNameMap[storageKey.toUpperCase()] &&
            this.storageKeyToDisplayNameMap.hasOwnProperty(storageKey.toUpperCase()) &&
            this.storageKeyToDisplayNameMap[storageKey.toUpperCase()].originalDisplayName === displayName &&
            this.displayNameToStorageKeyMap[displayName] &&
            this.displayNameToStorageKeyMap.hasOwnProperty(displayName) &&
            this.displayNameToStorageKeyMap[displayName] === storageKey.toUpperCase();
    }

    /**
     * Checks if display name already exists in the translation map and returns a mangled version of it that is
     * not is not in the map yet
     * @param displayName
     */
    private checkIfDisplayNameExistsInMapAndMangle(displayName: string): string {
        let retDisplayName: string = displayName;

        if (this.displayNameToStorageKeyMap[displayName] && this.displayNameToStorageKeyMap.hasOwnProperty(displayName)) {
            let counter: number = 1;
            retDisplayName = displayName + "(" + counter + ")";
            while (this.displayNameToStorageKeyMap[retDisplayName]) {
                counter++;
                retDisplayName = displayName + "(" + counter + ")";
            }
        }

        return retDisplayName;
    }
}

export class MaterializeIdentityProvider {
    private static _instance: MaterializeIdentityProvider;
    private _graphHttpClient: GraphHttpClient;

    public static getInstance(): MaterializeIdentityProvider {
        if (!MaterializeIdentityProvider._instance) {
            MaterializeIdentityProvider._instance = new MaterializeIdentityProvider();
        }
        return MaterializeIdentityProvider._instance;
    }

    constructor() {
        this._graphHttpClient = Service.VssConnection.getConnection().getHttpClient(GraphHttpClient, WebApiConstants.ServiceInstanceTypes.SPS);
    }

    //Materializes user or group based on the type of identity passed in and returns storage key of the materialized
    //identity or null if the materialization fails
    public MaterializeIdentity(identityPickerEntity: IdentitiesPickerRestClient.IEntity): IPromise<string> {
        if (identityPickerEntity && identityPickerEntity.entityType && identityPickerEntity.originId) {
            if (identityPickerEntity.entityType === DirectoryEntityType.User) {
                return this.MaterializeAadUser(identityPickerEntity.originId)
                    .then((graphMember: GraphContracts.GraphMember) => this.getStorageKey(graphMember))
                    .then((result: GraphContracts.GraphStorageKeyResult) => result.value);
            }

            if (identityPickerEntity.entityType === DirectoryEntityType.Group) {
                return this.MaterializeAadGroup(identityPickerEntity.originId)
                    .then((graphMember: GraphContracts.GraphMember) => this.getStorageKey(graphMember))
                    .then((result: GraphContracts.GraphStorageKeyResult) => result.value);
            }
        }

        return Q.resolve(null);
    }

    private MaterializeAadGroup(originId: string): IPromise<GraphContracts.GraphMember> {
        if (originId) {
            return this._graphHttpClient.createGroup(<GraphContracts.GraphGroupOriginIdCreationContext>{ originId: originId });
        }

        throw new Error("Origin Id cannot be null or empty!");
    }

    private MaterializeAadUser(originId: string): IPromise<GraphContracts.GraphMember> {
        if (originId) {
            return this._graphHttpClient.createUser(<GraphContracts.GraphUserOriginIdCreationContext>{ originId: originId });
        }

        throw new Error("Origin Id cannot be null or empty!");
    }

    private getStorageKey(member: GraphContracts.GraphMember): IPromise<GraphContracts.GraphStorageKeyResult> {
        if (member) {
            return this._graphHttpClient.getStorageKey(member.descriptor);
        }

        throw new Error("Graph member cannot be null!");
    }
}

export class PeopleProvider {
    public static QUEUE_WAIT_MSEC = 10;
    public static MAX_BATCH_SIZE = 50;

    private static _instance: PeopleProvider;

    private _cache: Mention.ArtifactsCache<IdentitiesPickerRestClient.IEntity>;
    private _cacheById: Mention.ArtifactsCache<IdentitiesPickerRestClient.IEntity>;

    public static getInstance(): PeopleProvider {
        if (!PeopleProvider._instance) {
            PeopleProvider._instance = new PeopleProvider();
        }
        return PeopleProvider._instance;
    }

    constructor() {
        this._cache = new Mention.ArtifactsCache<IdentitiesPickerRestClient.IEntity>(
            (keys) => this._loadPeople(keys),
            PeopleProvider.QUEUE_WAIT_MSEC,
            PeopleProvider.MAX_BATCH_SIZE);

        this._cacheById = new Mention.ArtifactsCache<IdentitiesPickerRestClient.IEntity>(
            (keys) => this._loadPeopleByIds(keys),
            PeopleProvider.QUEUE_WAIT_MSEC,
            PeopleProvider.MAX_BATCH_SIZE);
    }

    public getArtifactType() { return Helpers.PersonArtifactType; }

    public getByUniqueName(uniqueName: string): IPromise<IdentitiesPickerRestClient.IEntity> {
        return this._cache.getArtifactPromise(uniqueName.toUpperCase());
    }

    public getByUniqueId(uniqueId: string): IPromise<IdentitiesPickerRestClient.IEntity> {
        return this._cacheById.getArtifactPromise(uniqueId.toUpperCase());
    }

    public isIdentityCurrentUser(identity: IdentitiesPickerRestClient.IEntity): boolean {
        const userId = Context.getDefaultWebContext().user.id;
        if (!userId || !identity || !identity.localId) {
            return false;
        }

        return userId.toUpperCase() === identity.localId.toUpperCase();
    }

    protected _getIdentityPickerService(): IdentitiesPickerServices.IdentityService {
        return Service.VssConnection.getConnection().getService(IdentitiesPickerServices.IdentityService);
    }

    protected _loadPeople(keys: string[]): { [key: string]: IPromise<IdentitiesPickerRestClient.IEntity> } {

        const deferreds: { [key: string]: Q.Deferred<IdentitiesPickerRestClient.IEntity> } = {};
        const promises: { [key: string]: IPromise<IdentitiesPickerRestClient.IEntity> } = {};
        const identityService = this._getIdentityPickerService();
        keys = keys.map((k) => k.toUpperCase());
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            deferreds[key] = Q.defer<IdentitiesPickerRestClient.IEntity>();
            promises[key] = deferreds[key].promise;
        }
        const query = keys.join(";");
        const qtrPromises = identityService.getIdentities(query,
            operationScope,
            Helpers.getSupportedEntityTypes());
        for (let queryToken in qtrPromises) {
            qtrPromises[queryToken].then(
                (queryTokenResults) => {
                    const resultKey = queryTokenResults.queryToken.toUpperCase();
                    if (deferreds.hasOwnProperty(resultKey)) {
                        const deferred = deferreds[resultKey];
                        if (!queryTokenResults || !queryTokenResults.queryToken || !queryTokenResults.identities) {
                            deferred.reject("Invalid result object");
                        }
                        else {
                            if (Context.getPageContext().webAccessConfiguration.isHosted) {
                                deferred.resolve(queryTokenResults.identities.length > 0 ? queryTokenResults.identities.filter(identity => Utils_String.ignoreCaseComparer(identity.signInAddress, queryTokenResults.queryToken) === 0)[0] : null);
                            }
                            else {
                                const resultKeyParts = resultKey.split("\\");
                                if (resultKeyParts.length != 2) {
                                    deferred.reject("Invalid unique ID");
                                }

                                const scopePrefix = resultKeyParts[0];
                                const accountName = resultKeyParts[1];

                                const exactMatches = queryTokenResults.identities.filter((identity) => {
                                    return (
                                        Utils_String.ignoreCaseComparer(identity.samAccountName, accountName) == 0 &&
                                        Utils_String.ignoreCaseComparer(identity.scopeName, scopePrefix) == 0);
                                });

                                deferred.resolve(exactMatches.length > 0 ? exactMatches[0] : null);
                            }
                        }
                    }
                },
                (error) => {
                    keys.forEach((key) => {
                        deferreds[key].reject(error);
                    });
                }
            );
        }

        return promises;
    }

    protected _loadPeopleByIds(keys: string[]): { [key: string]: IPromise<IdentitiesPickerRestClient.IEntity> } {

        const deferreds: { [key: string]: Q.Deferred<IdentitiesPickerRestClient.IEntity> } = {};
        const promises: { [key: string]: IPromise<IdentitiesPickerRestClient.IEntity> } = {};
        const identityService = this._getIdentityPickerService();
        keys = keys.map((k) => k.toUpperCase());
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            deferreds[key] = Q.defer<IdentitiesPickerRestClient.IEntity>();
            promises[key] = deferreds[key].promise;
        }
        const query = keys.join(";");
        const queryTypeHint: IdentitiesPickerServices.IQueryTypeHint = {
            UID: true
        };

        const qtrPromises = identityService.getIdentities(query,
            operationScope,
            Helpers.getSupportedEntityTypes(),
            undefined,
            queryTypeHint);

        for (let queryToken in qtrPromises) {
            qtrPromises[queryToken].then(
                (queryTokenResults: IdentitiesPickerRestClient.QueryTokenResultModel) => {
                    const resultKey = queryTokenResults.queryToken.toUpperCase();
                    if (deferreds.hasOwnProperty(resultKey)) {
                        const deferred = deferreds[resultKey];
                        if (!queryTokenResults || !queryTokenResults.queryToken || !queryTokenResults.identities) {
                            deferred.reject("Invalid result object");
                        }
                        else {
                            deferred.resolve(queryTokenResults.identities.length > 0 ? queryTokenResults.identities[0] : null);
                        }
                    }
                },
                (error) => {
                    keys.forEach((key) => {
                        deferreds[key].reject(error);
                    });
                }
            );
        }

        return promises;
    }
}

export function createPeopleHtmlMention(person: IdentitiesPickerRestClient.IEntity): string {
    const additionalData = Helpers.getIdentityAttribute(person);

    if (Helpers.useStorageKeysInMentions()) {
        return Mention.createHtmlMention("#", `@${person.displayName}`, additionalData, "2.0");
    }
    else {
        return Mention.createHtmlMention(`${Mention.Constants.HTML_MENTION_LEGACY_FORMAT_HREF}${Helpers.getIdentityId(person)}`, `@${person.displayName}`, additionalData);
    }
}

export function getDisplayNameStorageKeyTranslatorInstance(): Mention.IMentionTranslationProvider {
    return DisplayNameStorageKeyTranslationProvider.getDefault();
}