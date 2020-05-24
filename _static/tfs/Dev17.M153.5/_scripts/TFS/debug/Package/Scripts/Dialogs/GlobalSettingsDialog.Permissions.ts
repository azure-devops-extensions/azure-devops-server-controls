import * as Controls from "VSS/Controls";
import { ITabContent } from "VSS/Controls/TabContent";
import * as IdentityContracts from "VSS/Identities/Contracts";
import * as Identity_Picker from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as IdentityRestClient from "VSS/Identities/RestClient";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";
import * as WebApiConstants from "VSS/WebApi/Constants";

import { CiConstants, IdentityDescriptor, PerfScenarios } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { IdentityPickerHelpers } from "Package/Scripts/Helpers/IdentityPickerHelpers";
import * as PackageResources from "Feed/Common/Resources";
import { GlobalPermission, GlobalRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedHttpClient } from "Package/Scripts/WebApi/VSS.Feed.WebApi";

export class PermissionsTab extends Controls.Control<{}> implements ITabContent {
    private _onDirtyStateChanged: () => void;

    private _creatorPickerControl: Identity_Picker.IdentityPickerSearchControl;

    private _initialCreatorIds: string[];
    private _initialIsEveryoneAllowed: boolean;

    private _isDirty = false;
    private _isValid = true;
    private _isEveryoneAllowed = false;

    private _$feedCreatorsRadioButtonPrivate: JQuery;
    private _$feedCreatorsRadioButtonPublic: JQuery;
    private _$permissionsContainer: JQuery;

    private _feedHttpClient: FeedHttpClient;
    private _identityHttpClient: IdentityRestClient.IdentitiesHttpClient;

    public initialize() {
        super.initialize();
        const $element = this.getElement();

        this._initialCreatorIds = [];
        this._initialIsEveryoneAllowed = false;

        this._feedHttpClient = Service.getClient(FeedHttpClient);
        this._identityHttpClient = Service.VssConnection.getConnection().getHttpClient(
            IdentityRestClient.IdentitiesHttpClient,
            WebApiConstants.ServiceInstanceTypes.SPS
        );

        this._element.addClass("permissions-tab-container");
        this._$permissionsContainer = $("<div/>")
            .addClass("feed-global-settings-dialog-content")
            .appendTo($element);
    }

    public beginLoad($container: JQuery): IPromise<any> {
        const loadScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.GlobalPermissionsLoad
        );
        this.createIn($container);

        return this._feedHttpClient.getGlobalPermissions().then((permissions: GlobalPermission[]) => {
            const identitiesList: string[] = [];

            for (const permission of permissions) {
                // We are only interested in CreateFeed permissions
                if (this._isPermissionCreateFeed(permission) == false) {
                    continue;
                }

                const descriptor = permission.identityDescriptor;
                if (descriptor == <any>IdentityDescriptor.EveryoneGroup) {
                    this._initialIsEveryoneAllowed = true;
                    this._isEveryoneAllowed = true;
                } else if (descriptor != <any>IdentityDescriptor.NamespaceAdministratorsGroup) {
                    identitiesList.push(<any>descriptor);
                }
            }

            if (identitiesList.length == 0 || this._initialIsEveryoneAllowed) {
                // No need to query for identities
                this._drawPermissions([]);
                loadScenario.end();
            } else {
                return this._identityHttpClient
                    .readIdentities(identitiesList.join())
                    .then((identities: IdentityContracts.Identity[]) => {
                        const users: IUser[] = [];
                        for (const identity of identities) {
                            const user: IUser = {
                                tfid: identity.id,
                                name: identity.customDisplayName
                                    ? identity.customDisplayName
                                    : identity.providerDisplayName
                            };
                            users.push(user);
                        }

                        this._drawPermissions(users);
                        loadScenario.end();
                    });
            }
        });
    }

    public beginSave(): IPromise<boolean> {
        if (this.isValid()) {
            const saveScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.GlobalPermissionsSave
            );
            let addedIds: string[] = [];
            let allIds = [];
            const descriptorsToSet = [];
            const descriptorsToRemove = [];

            if (this._isEveryoneAllowed) {
                // Update EveryoneGroup
                descriptorsToSet.push(<any>IdentityDescriptor.EveryoneGroup);
                // These are the ids that will no longer have permission
                allIds = this._initialCreatorIds;
            } else {
                // Update EveryoneGroup
                descriptorsToRemove.push(<any>IdentityDescriptor.EveryoneGroup);
                // Let's figure out if any accounts got added or removed
                addedIds = this._getAddedIdentities();
                const removedIds = this._getRemovedIdentities();
                allIds = addedIds.concat(removedIds);
            }

            // If we need to remove or add the permission to specific users, get their identities
            if (allIds.length > 0) {
                return this._identityHttpClient
                    .readIdentities(null, allIds.join())
                    .then((identities: IdentityContracts.Identity[]) => {
                        if (allIds.length !== identities.length) {
                            throw new Error(PackageResources.GlobalSettingsDialogPermissions_ReadIdentitiesError);
                        }

                        for (const identity of identities) {
                            // We already handled these well-known groups but in case they appear here again, ignore them
                            if (
                                identity.descriptor == <any>IdentityDescriptor.NamespaceAdministratorsGroup ||
                                identity.descriptor == <any>IdentityDescriptor.EveryoneGroup
                            ) {
                                continue;
                            }
                            if (this._isEveryoneAllowed) {
                                // Remove permission to all other identities
                                descriptorsToRemove.push(identity.descriptor);
                            } else {
                                if (addedIds.indexOf(identity.id) != -1) {
                                    // Grant permission
                                    descriptorsToSet.push(identity.descriptor);
                                } else {
                                    // Remove permission
                                    descriptorsToRemove.push(identity.descriptor);
                                }
                            }
                        }
                    })
                    .then(
                        () => {
                            return this._updatePermissionsOnIdentities(descriptorsToSet, descriptorsToRemove).then(
                                () => {
                                    saveScenario.end();
                                    CustomerIntelligenceHelper.publishEvent(
                                        CiConstants.GlobalSettingsPermissionsChanged
                                    );

                                    // @TODO: This method has a return type of IPromise<boolean>, but didn't return anything (i.e. undefined).
                                    // Adding the return statement below makes the compiler happy but also keeps things working exactly the way
                                    // they were before. Same in the else branch below.
                                    return undefined;
                                },
                                (error: Error) => {
                                    CustomerIntelligenceHelper.publishEvent(
                                        CiConstants.GlobalSettingsPermissionsError,
                                        { error: error.message }
                                    );
                                }
                            );
                        },
                        (error: Error) => {
                            CustomerIntelligenceHelper.publishEvent(CiConstants.GlobalSettingsPermissionsError, {
                                error: error.message
                            });
                        }
                    );
            } else {
                return this._updatePermissionsOnIdentities(descriptorsToSet, descriptorsToRemove).then(() => {
                    saveScenario.end();
                    return undefined;
                });
            }
        }
    }

    public isDirty(): boolean {
        return this._isDirty;
    }

    public isValid(): boolean {
        return this._isValid;
    }

    public registerStateChangedEvents(eventHandler: () => void) {
        this._onDirtyStateChanged = eventHandler;
    }

    public onTabActivated(initialLoad: boolean): void {
        const $focusedItems = $(":focus");
        $focusedItems.blur();
    }

    // Check dirty by comparing the initial state to the current state
    private _checkDirty() {
        this._isDirty =
            this._initialIsEveryoneAllowed != this._isEveryoneAllowed ||
            (!this._listEqualsUnordered(this._initialCreatorIds, this._getCreatorsTfidsInPicker()) &&
                !this._isEveryoneAllowed);

        if ($.isFunction(this._onDirtyStateChanged)) {
            this._onDirtyStateChanged();
        }
    }

    private _getIdentityList(identities: IUser[], initialUserList: string[]): any {
        for (const identity of identities) {
            initialUserList.push(identity.tfid);
        }

        return initialUserList;
    }

    private _getDiffSet(initialSet, currentSet) {
        return initialSet.filter(element => {
            return currentSet.indexOf(element) === -1;
        });
    }

    private _getAddedIdentities(): string[] {
        return this._getDiffSet(this._getCreatorsTfidsInPicker(), this._initialCreatorIds);
    }

    private _getRemovedIdentities(): string[] {
        return this._getDiffSet(this._initialCreatorIds, this._getCreatorsTfidsInPicker());
    }

    private _validateCreatorIdentityPicker(): void {
        this._checkDirty();
    }

    // Draw the permissions UI
    private _drawPermissions(permissions: IUser[]) {
        // Title
        $("<div/>")
            .addClass("feed-global-settings-dialog-title")
            .text(PackageResources.GlobalSettingsDialogPermissions_Text)
            .appendTo(this._$permissionsContainer);
        $("<br/>").appendTo(this._$permissionsContainer);

        // Creator area
        const publicRadioButtonDiv = $("<div/>");
        this._$feedCreatorsRadioButtonPublic = $("<input/>")
            .addClass("dialog-content-input")
            .attr("id", "feedcreator-public")
            .attr("name", "feedcreator")
            .attr("type", "radio")
            .attr("value", "public")
            .text("Public")
            .prop("checked", this._isEveryoneAllowed)
            .appendTo(publicRadioButtonDiv);
        $("<label/>")
            .addClass("dialog-content-description")
            .attr("for", "feedcreator-public")
            .text(PackageResources.GlobalSettingsDialog_FeedPermissionsAll)
            .appendTo(publicRadioButtonDiv);
        publicRadioButtonDiv.appendTo(this._$permissionsContainer);
        $("<br/>").appendTo(this._$permissionsContainer);

        const privateRadioButtonDiv = $("<div/>");
        this._$feedCreatorsRadioButtonPrivate = $("<input/>")
            .addClass("dialog-content-input")
            .attr("id", "feedcreator-private")
            .attr("name", "feedcreator")
            .attr("type", "radio")
            .attr("value", "private")
            .text("Private")
            .prop("checked", !this._isEveryoneAllowed)
            .appendTo(privateRadioButtonDiv);
        $("<label/>")
            .addClass("dialog-content-description")
            .attr("for", "feedcreator-private")
            .text(PackageResources.GlobalSettingsDialog_FeedPermissionsAdmin)
            .appendTo(privateRadioButtonDiv);
        privateRadioButtonDiv.appendTo(this._$permissionsContainer);
        $("<br/>").appendTo(this._$permissionsContainer);

        // Assign handlers for click event on radio buttons
        this._$feedCreatorsRadioButtonPublic.bind("click", event => {
            this._changeCreatorsRadio(event);
            this._checkDirty();
        });
        this._$feedCreatorsRadioButtonPrivate.bind("click", event => {
            this._changeCreatorsRadio(event);
            this._checkDirty();
        });

        // Creator identity picker
        this._creatorPickerControl = IdentityPickerHelpers.createIdentityPicker(
            this._$permissionsContainer,
            "feed-global-settings-dialog-permissions-creator",
            (item: Identities_Picker_RestClient.IEntity) => {
                this._creatorPickerControl.addIdentitiesToMru([item]);
            },
            "DF374B0E-D4FC-4264-A614-4334E625B1CE"
        );

        this._creatorPickerControl._bind(Identity_Picker.IdentityPickerSearchControl.INVALID_INPUT_EVENT, () =>
            this._validateCreatorIdentityPicker()
        );
        this._creatorPickerControl._bind(Identity_Picker.IdentityPickerSearchControl.VALID_INPUT_EVENT, () =>
            this._validateCreatorIdentityPicker()
        );
        this._creatorPickerControl.setEntities([], this._getIdentityList(permissions, this._initialCreatorIds));
        this._checkCreatorIdentityPickerVisibility();
    }

    // Enables/disables creator identity picker
    private _checkCreatorIdentityPickerVisibility() {
        if (this._isEveryoneAllowed) {
            $(".identity-picker-input")
                .prop("disabled", "disabled")
                .attr("aria-disabled", "true");
            $(".identity-picker-search-drop-icon").hide();
            $(".identity-picker-resolved").hide();
        } else {
            $(".identity-picker-input")
                .removeAttr("disabled")
                .attr("aria-disabled", "false");
            $(".identity-picker-search-drop-icon").show();
            $(".identity-picker-resolved").show();
        }

        $(".feed-global-settings-dialog-permissions-creator").toggleClass("disabled", this._isEveryoneAllowed);
    }

    // Gets the Tfids of the identities currently in the picker
    private _getCreatorsTfidsInPicker(): string[] {
        const identities = this._creatorPickerControl.getIdentitySearchResult().resolvedEntities;
        const ids = [];

        for (const identity of identities) {
            ids.push(identity.localId);
        }

        return ids;
    }

    // Compares two lists and returns whether they contain the same elements
    private _listEqualsUnordered(list1: string[], list2: string[]): boolean {
        if (list1.length !== list2.length) {
            return false;
        }

        // Sort the two list to get a guaranteed order
        list1.sort();
        list2.sort();

        // Compare item by item
        for (const i in list1) {
            if (list1[i] !== list2[i]) {
                return false;
            }
        }

        return true;
    }

    // Save whatever the user has clicked on the UI
    private _changeCreatorsRadio(event) {
        this._isEveryoneAllowed = this._$feedCreatorsRadioButtonPublic.prop("checked");
        this._checkCreatorIdentityPickerVisibility();
    }

    // Update permissions on a set of Identities
    private _updatePermissionsOnIdentities(descriptorsToSet, descriptorsToRemove): IPromise<boolean> {
        const permissionsToUpdate: GlobalPermission[] = [];

        for (const descriptor of descriptorsToSet) {
            const permission: GlobalPermission = {
                identityDescriptor: descriptor,
                role: GlobalRole.FeedCreator
            };

            permissionsToUpdate.push(permission);
        }

        for (const descriptor of descriptorsToRemove) {
            const permission: GlobalPermission = {
                identityDescriptor: descriptor,
                role: GlobalRole.None
            };

            permissionsToUpdate.push(permission);
        }

        return this._feedHttpClient
            .setGlobalPermissions(permissionsToUpdate)
            .then((permissions: GlobalPermission[]) => {
                return true;
            });
    }

    private _isPermissionCreateFeed(permission: GlobalPermission): boolean {
        if (permission.role === GlobalRole.FeedCreator) {
            return true;
        }

        const feedCreatorName = GlobalRole[GlobalRole.FeedCreator].toLowerCase();

        return permission.role.toString().toLowerCase() === feedCreatorName;
    }
}

// Signifies a user from web access perspective
export interface IUser {
    tfid: string;
    name: string;
}

VSS.tfsModuleLoaded("VSS.Feed.Controls.GlobalSettingsDialog.Permissions", exports);
