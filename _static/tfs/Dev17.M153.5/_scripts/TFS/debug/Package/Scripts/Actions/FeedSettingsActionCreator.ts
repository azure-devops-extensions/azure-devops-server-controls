import { Action } from "VSS/Flux/Action";
import * as Performance from "VSS/Performance";
import { announce } from "VSS/Utils/Accessibility";

import { ChangeDefaultViewHandler } from "Package/Scripts/Actions/FeedSettings/ChangeDefaultViewHandler";
import { ChangeSelectedPermissionsHandler } from "Package/Scripts/Actions/FeedSettings/ChangeSelectedPermissionsHandler";
import { ChangeSelectedUpstreamSourcesHandler } from "Package/Scripts/Actions/FeedSettings/ChangeSelectedUpstreamSourcesHandler";
import { ChangeSelectedViewsHandler } from "Package/Scripts/Actions/FeedSettings/ChangeSelectedViewsHandler";
import { CurrentPivotHandler } from "Package/Scripts/Actions/FeedSettings/CurrentPivotHandler";
import { DeleteFeedHandler } from "Package/Scripts/Actions/FeedSettings/DeleteFeedHandler";
import { DeletePermissionsHandler } from "Package/Scripts/Actions/FeedSettings/DeletePermissionsHandler";
import { DeleteViewsHandler } from "Package/Scripts/Actions/FeedSettings/DeleteViewsHandler";
import { DisplayRetentionPolicyHandler } from "Package/Scripts/Actions/FeedSettings/DisplayRetentionPolicyHandler";
import {
    ChangeBadgesEnabledHandler,
    ChangeFeedDescriptionHandler,
    ChangeFeedNameHandler,
    ChangeFeedRetentionMaxVersionsHandler,
    ChangeHideDeletedPackageVersionsHandler
} from "Package/Scripts/Actions/FeedSettings/FeedDetailsHandlers";
import { GetScopedBuildPermission } from "Package/Scripts/Actions/FeedSettings/GetScopedBuildPermission";
import {
    ClearErrorHandler,
    DisplayErrorHandler,
    DisplayWarningHandler
} from "Package/Scripts/Actions/FeedSettings/MessageBarHandlers";
import { NavigateToPermissionsHandler } from "Package/Scripts/Actions/FeedSettings/NavigateToPermissionsHandler";
import { NavigateToViewsHandler } from "Package/Scripts/Actions/FeedSettings/NavigateToViewsHandler";
import { PermissionValidator } from "Package/Scripts/Actions/FeedSettings/PermissionValidator";
import { SaveFeedDetailsHandler } from "Package/Scripts/Actions/FeedSettings/SaveFeedDetailsHandler";
import { SavePermissionsHandler } from "Package/Scripts/Actions/FeedSettings/SavePermissionsHandler";
import { SaveUpstreamSourcesHandler } from "Package/Scripts/Actions/FeedSettings/SaveUpstreamSourcesHandler";
import { SaveViewHandler } from "Package/Scripts/Actions/FeedSettings/SaveViewHandler";
import { ShowDeleteFeedDialogHandler } from "Package/Scripts/Actions/FeedSettings/ShowDeleteFeedDialogHandler";
import { ShowDeletePermissionsDialogHandler } from "Package/Scripts/Actions/FeedSettings/ShowDeletePermissionsDialogHandler";
import {
    ShowDeleteUpstreamSourcesDialogHandler
} from "Package/Scripts/Actions/FeedSettings/ShowDeleteUpstreamSourcesDialogHandler";
import { ShowDeleteViewsDialogHandler } from "Package/Scripts/Actions/FeedSettings/ShowDeleteViewsDialogHandler";
import {
    ToggleAddUsersOrGroupsPanelDisplayHandler
} from "Package/Scripts/Actions/FeedSettings/ToggleAddUsersOrGroupsPanelDisplayHandler";
import { ToggleDiscardDialogDisplayHandler } from "Package/Scripts/Actions/FeedSettings/ToggleDiscardDialogDisplayHandler";
import { ToggleViewPanelDisplayHandler } from "Package/Scripts/Actions/FeedSettings/ToggleViewPanelDisplayHandler";
import { UndoFeedDetailsHandler } from "Package/Scripts/Actions/FeedSettings/UndoFeedDetailsHandler";
import { UpgradeFeedHandler } from "Package/Scripts/Actions/FeedSettings/UpgradeFeedHandler";
import {
    ChangeUpstreamSourceLocationHandler,
    ChangeUpstreamSourceNameHandler,
    CloseAddUpstreamPanelHandler,
    DisplayErrorHandlerAddUpstreamSources,
    OpenAddUpstreamPanelHandler
} from "Package/Scripts/Actions/FeedSettings/UpstreamHandlers";
import { ValidationHandler } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { ViewNameValidator } from "Package/Scripts/Actions/FeedSettings/ViewNameValidator";
import { ViewPermissionValidator } from "Package/Scripts/Actions/FeedSettings/ViewPermissionValidator";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { NavigationHandler } from "Package/Scripts/Common/NavigationHandler";
import { DependencyAction, IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsCi, PerfScenarios } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { RoleHelper } from "Package/Scripts/Helpers/RoleHelper";
import * as PackageResources from "Feed/Common/Resources";
import { FeedStore } from "Package/Scripts/Stores/FeedStore";
import { ExtendedUpstreamSource, Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import {
    Feed as Feed_,
    FeedPermission,
    FeedView,
    UpstreamSource,
    UpstreamSourceType
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class FeedSettingsActionCreator {
    /**
     * Message bar is dismissed by user, remove the message bar
     */
    public static onDismissMessageBar: Action<{}>;

    /**
     * Settings hub was loaded with this pivot, store it
     */
    public static onInitialPivotLoad: Action<string>;

    /**
     * User tried to switch pivots while having unsaved changes
     * So show discard changes dialog
     */
    public static showDiscardChangesDialog: Action<{}>;

    /**
     * User switched to a pivot, store it
     */
    public static onPivotChanged: Action<string>;

    /**
     * User wants to discard changes in current pivot
     */
    public static onDiscardChangesClicked: Action<{}>;

    /**
     * User wants to stay on current pivot
     */
    public static onStayOnCurrentPivotClicked: Action<{}>;

    /**
     * Show Delete Feed dialog when user clicked on Delete Feed button in PivotBar
     * Or Hide when Cancel button in dialog is clicked
     */
    public static showDeleteFeedDialog: Action<boolean>;

    /**
     * User changed the description of the feed
     */
    public static onFeedDescriptionChanged: Action<string>;

    /**
     * User changed the name of the feed
     */
    public static onFeedNameChanged: Action<string>;

    /**
     * User changed the retention policy value for the maximum number of versions per package
     */
    public static onFeedRetentionPolicyCountChanged: Action<string>;

    /**
     * User toggled the hideDeletedPackageVersions checkbox
     */
    public static toggleHideDeletedPackageVersions: Action<boolean>;

    /**
     * User toggled the badgesEnabled checkbox
     */
    public static toggleBadgesEnabled: Action<boolean>;

    /**
     * When user navigates to feed settings permission
     *  1. set loading spinner
     *  2. get feed's permission from server
     *  3. filter out roles that aren't shown in UI
     */
    public static navigatingToPermissions: Action<{}>;

    /**
     * Adds following identities (based on scope passed via action arg) with Contributors role to grid,
     * if they're not already present:
     *  1. Project Collection Build Service (arg is true)
     *  2. Project Build Service (project) (arg is false)
     */
    public static addScopedBuildPermissionClicked: Action<boolean>;

    /**
     * If content of add user or group panel changes, reset validation error message
     */
    public static addUsersOrGroupsPanelContentChange: Action<FeedPermission[]>;

    /**
     * User clicked 'Save' button in 'Add users or groups' panel
     * save new users/groups to server and add to grid
     */
    public static savePermissionsClicked: Action<FeedPermission[]>;

    /**
     * Show Delete permissions dialog when user clicked on Delete button in Permissions pivot
     */
    public static showDeletePermissionsDialog: Action<{}>;

    /**
     * User selected permission indices in Permissions pivot
     */
    public static onPermissionSelectionChanged: Action<FeedPermission[]>;

    /**
     * User clicked Add User/Group button in PivotBarActions
     * Display Add User/Group dialog now
     */
    public static toggleAddUserOrGroupPanelDisplay: Action<boolean>;

    /**
     * When user navigates to feed settings permission
     *  1. set loading spinner
     *  2. get feed's views from server
     */
    public static navigatingToViews: Action<{}>;

    /**
     * User clicked Mark default view button in View's pivot command bar
     */
    public static markDefaultViewClicked: Action<FeedView>;

    /**
     * User selected view indices in Views pivot
     */
    public static onViewSelectionChanged: Action<FeedView[]>;

    /**
     * Show Delete views dialog when user clicked on Delete button in Views pivot
     */
    public static showDeleteViewsDialog: Action<{}>;

    /**
     * When user enters view name in Add view panel
     *  1. Validate the name
     *  2. Store current view name (even if validation fails)
     */
    public static onViewNameChanged: Action<{ viewName: string; originalViewName: string }>;

    /**
     * User clicked 'Add' button in 'Add view' panel, save view to server and add it to grid
     * User clicked 'Edit' button in 'Add/edit view' panel, save updates to server and grid
     */
    public static saveViewClicked: Action<{
        view: FeedView;
        makeThisDefaultView: boolean;
        viewPermissions: FeedPermission[];
    }>;

    /**
     * User selected a view permission to add on viewPanel, validate it and enable add view permission button
     */
    public static addViewPermissionChanged: Action<{ viewId: string; permission: FeedPermission }>;

    /**
     * User clicked Add view or Edit view button in PivotBarActions
     * Display view panel now
     */
    public static toggleViewPanelDisplay: Action<{ isOpen: boolean; isEditing: boolean }>;

    /**
     * User clicked Save on AddUpstreamPanel, add that upstream source
     */
    public static addUpstreamSources: Action<ExtendedUpstreamSource[]>;

    /**
     * User reordered the upstreams in the upstream settings list
     */
    public static reorderUpstreamSources: Action<{
        fromIndexOfUpstreamSource: UpstreamSource;
        toIndexOfUpstreamSource: UpstreamSource;
    }>;

    /**
     * Upstream sources selected in grid
     */
    public static onUpstreamSourcesSelectionChanged: Action<UpstreamSource[]>;

    /**
     * Show Delete upstream sources dialog when user clicked on Delete button in Upstream sources pivot
     */
    public static showDeleteUpstreamSourcesDialog: Action<{}>;

    /**
     * User modified the upstream source's name in AddUpstreamPanel
     */
    public static changeUpstreamSourceName: Action<string>;

    /**
     * User modified the upstream source's location in AddUpstreamPanel
     */
    public static changeUpstreamSourceLocation: Action<string>;

    /**
     * User clicked on add public upstream source
     */
    public static openAddUpstreamPanelRequested: Action<{}>;

    /**
     * User requested to close the AddUpstreamPanel
     */
    public static closeAddUpstreamPanelRequested: Action<{}>;

    /**
     * Undo changes made to feed details pivot
     */
    public static undoFeedDetailsChanges: Action<{}>;

    /**
     * Feed details save changes made to server
     */
    public static saveFeedDetailsChanges: Action<{}>;

    /**
     * Feed details save changes made to server
     */
    public static upgradeFeed: Action<{}>;

    /**
     * @param store - when actions makes state change, this store will be updated
     */
    constructor(store: FeedStore) {
        this._store = store;
        this._initialize();
    }

    /**
     * Initialize all actions relevant to a state property
     */
    private _initialize(): void {
        const emitCallback = (): void => {
            this.emit();
        };
        const emptyCallback = (): void => {
            return;
        };

        FeedSettingsActionCreator.onInitialPivotLoad = new Action<string>();
        FeedSettingsActionCreator.onInitialPivotLoad.addListener((initialPivotKey: string) => {
            const state = this.getState();
            CurrentPivotHandler.handle(state, emptyCallback, initialPivotKey);
            DisplayRetentionPolicyHandler.handleAsync(state, emitCallback);
            if (!state.isUserAdmin()) {
                DisplayWarningHandler.handle(state, emitCallback, PackageResources.FeedSettings_UserNotAdmin_Warning);
            }
        });

        FeedSettingsActionCreator.showDiscardChangesDialog = new Action();
        FeedSettingsActionCreator.showDiscardChangesDialog.addListener(() => {
            const state = this.getState();
            ToggleDiscardDialogDisplayHandler.handle(state, emitCallback, true /* show */);
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DiscardDialog, {
                feedId: state.feed().id,
                action: "show"
            });
        });

        FeedSettingsActionCreator.onPivotChanged = new Action<string>();
        FeedSettingsActionCreator.onPivotChanged.addListener(
            (newPivotKey: string): void => {
                const state = this.getState();
                CurrentPivotHandler.handle(state, emitCallback, newPivotKey);
                CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.PivotChanged, {
                    feedId: state.feed().id,
                    pivot: newPivotKey
                });
            }
        );

        FeedSettingsActionCreator.onDiscardChangesClicked = new Action();
        FeedSettingsActionCreator.onDiscardChangesClicked.addListener(() => {
            const state = this.getState();
            UndoFeedDetailsHandler.handle(state, emitCallback);
            ToggleDiscardDialogDisplayHandler.handle(state, emitCallback, false /* hide */);
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DiscardDialog, {
                feedId: state.feed().id,
                action: "discardchanges"
            });
        });

        FeedSettingsActionCreator.onStayOnCurrentPivotClicked = new Action();
        FeedSettingsActionCreator.onStayOnCurrentPivotClicked.addListener(() => {
            const state = this.getState();
            ToggleDiscardDialogDisplayHandler.handle(state, emitCallback, false /* hide */);
            emitCallback();
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DiscardDialog, {
                feedId: state.feed().id,
                action: "stayOnCurrentPivot"
            });
        });

        FeedSettingsActionCreator.onDismissMessageBar = new Action();
        FeedSettingsActionCreator.onDismissMessageBar.addListener(() => {
            const state = this.getState();
            DisplayErrorHandler.handle(state, emitCallback);
        });

        FeedSettingsActionCreator.showDeleteFeedDialog = new Action<boolean>();
        FeedSettingsActionCreator.showDeleteFeedDialog.addListener((show: boolean) => {
            const state = this.getState();
            const onSaveCallback = async () => {
                try {
                    await DeleteFeedHandler.handleAsync(state);
                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DeleteFeed, { feedId: state.feed().id });

                    NavigationHandler.navigateToFeed(
                        null, // feed
                        false, // replaceHistoryPoint
                        null, // viewname
                        false
                    ); // suppressNavigate
                    state.updateActionDependencies(DependencyAction.DeleteFeed, state.feed());
                } catch (error) {
                    DisplayErrorHandler.handle(
                        state,
                        () => {
                            return;
                        },
                        error
                    );
                }
            };
            ShowDeleteFeedDialogHandler.handle(state, emitCallback, onSaveCallback);
        });

        FeedSettingsActionCreator.onFeedDescriptionChanged = new Action<string>();
        FeedSettingsActionCreator.onFeedDescriptionChanged.addListener((description: string) => {
            const state = this.getState();
            ChangeFeedDescriptionHandler.handle(state, emitCallback, description);
        });

        FeedSettingsActionCreator.onFeedNameChanged = new Action<string>();
        FeedSettingsActionCreator.onFeedNameChanged.addListener((name: string) => {
            // always get latest state
            const state = this.getState();
            const validation = ChangeFeedNameHandler.handle(state, emitCallback, name);
            ValidationHandler.handle(state, emitCallback, validation);
        });

        FeedSettingsActionCreator.onFeedRetentionPolicyCountChanged = new Action<string>();
        FeedSettingsActionCreator.onFeedRetentionPolicyCountChanged.addListener((maximumVersions: string) => {
            // always get latest state
            const state = this.getState();
            const validation = ChangeFeedRetentionMaxVersionsHandler.handle(state, emitCallback, maximumVersions);
            ValidationHandler.handle(state, emitCallback, validation);
        });

        FeedSettingsActionCreator.toggleHideDeletedPackageVersions = new Action<boolean>();
        FeedSettingsActionCreator.toggleHideDeletedPackageVersions.addListener(
            (hideDeletedPackageVersions: boolean) => {
                // always get latest state
                const state = this.getState();
                ChangeHideDeletedPackageVersionsHandler.handle(state, emitCallback, hideDeletedPackageVersions);
            }
        );

        FeedSettingsActionCreator.saveFeedDetailsChanges = new Action();
        FeedSettingsActionCreator.saveFeedDetailsChanges.addListener(async () => {
            const state = this.getState();
            state.isSavingChanges = true;
            this.emit();
            try {
                const updatedFeed: Feed_ = await SaveFeedDetailsHandler.handleAsync(state);
                if (updatedFeed != null) {
                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.SaveFeedDetails, {
                        feedId: updatedFeed.id,
                        hideDeletedPackageVersions: updatedFeed.hideDeletedPackageVersions,
                        badgesEnabled: updatedFeed.badgesEnabled,
                        retentionPolicy: state.retentionPolicySettings.retentionPolicy
                    });

                    // Handled by FeedStore, to update the feed
                    SettingsActions.FeedUpdated.invoke(updatedFeed as Feed);
                    // Handled by PackageStore to update the retention policy
                    SettingsActions.FeedRetentionPolicyUpdated.invoke({
                        feedId: updatedFeed.id,
                        retentionPolicy: state.retentionPolicySettings.retentionPolicy
                    });
                    NavigationHandler.updateFeedNameInUrlIfChanged(updatedFeed as Feed);
                }
                // if Save was invoked from 'Unsaved changes' dialog
                ToggleDiscardDialogDisplayHandler.handle(state, emptyCallback, false /* hide */);
                ClearErrorHandler.handle(state, emptyCallback);
            } catch (error) {
                DisplayErrorHandler.handle(state, emptyCallback, error);
            } finally {
                state.isSavingChanges = false;
                this.emit();
            }
        });

        FeedSettingsActionCreator.undoFeedDetailsChanges = new Action();
        FeedSettingsActionCreator.undoFeedDetailsChanges.addListener(() => {
            // always get latest state
            const state = this.getState();
            UndoFeedDetailsHandler.handle(state, emptyCallback);
            ClearErrorHandler.handle(state, emitCallback);
        });

        FeedSettingsActionCreator.toggleBadgesEnabled = new Action<boolean>();
        FeedSettingsActionCreator.toggleBadgesEnabled.addListener((badgesEnabled: boolean) => {
            // always get latest state
            const state = this.getState();
            ChangeBadgesEnabledHandler.handle(state, emitCallback, badgesEnabled);
        });

        FeedSettingsActionCreator.navigatingToPermissions = new Action();
        FeedSettingsActionCreator.navigatingToPermissions.addListener(() => {
            // always get latest state
            const state = this.getState();
            NavigateToPermissionsHandler.handleAsync(state, emitCallback).catch((error: Error) => {
                DisplayErrorHandler.handle(state, emitCallback, error);
            });
        });

        FeedSettingsActionCreator.addScopedBuildPermissionClicked = new Action();
        FeedSettingsActionCreator.addScopedBuildPermissionClicked.addListener(async (isCollectionScope: boolean) => {
            // always get latest state
            const state = this.getState();

            const permission: FeedPermission = GetScopedBuildPermission(isCollectionScope);
            await this.savePermissionsAsync([permission]);
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddScopedBuildPermission, {
                feedId: state.feed().id,
                scope: isCollectionScope ? "collection" : "project"
            });
        });

        FeedSettingsActionCreator.addUsersOrGroupsPanelContentChange = new Action<FeedPermission[]>();
        FeedSettingsActionCreator.addUsersOrGroupsPanelContentChange.addListener((permissions: FeedPermission[]) => {
            const state = this.getState();
            const validationResult = PermissionValidator.GetValidationResult(state, permissions);
            ValidationHandler.handle(state, emitCallback, validationResult);
        });

        FeedSettingsActionCreator.savePermissionsClicked = new Action<FeedPermission[]>();
        FeedSettingsActionCreator.savePermissionsClicked.addListener(async (permissions: FeedPermission[]) => {
            await this.savePermissionsAsync(permissions);
        });

        FeedSettingsActionCreator.showDeletePermissionsDialog = new Action<{}>();
        FeedSettingsActionCreator.showDeletePermissionsDialog.addListener(() => {
            const state = this.getState();
            const onSaveCallback = async () => {
                try {
                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DeletePermissions, {
                        feedId: state.feed().id,
                        count: state.selectedPermissions.length
                    });

                    await DeletePermissionsHandler.handleAsync(state);
                } catch (error) {
                    DisplayErrorHandler.handle(state, emptyCallback, error);
                }
            };
            ShowDeletePermissionsDialogHandler.handle(state, emitCallback, onSaveCallback);
        });

        FeedSettingsActionCreator.toggleAddUserOrGroupPanelDisplay = new Action<boolean>();
        FeedSettingsActionCreator.toggleAddUserOrGroupPanelDisplay.addListener((open: boolean) => {
            // always get latest state
            const state = this.getState();
            // reset validation error
            ValidationHandler.handle(state, emptyCallback, null);
            ToggleAddUsersOrGroupsPanelDisplayHandler.handle(state, emitCallback, open);

            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddUsersOrGroupsPanel, {
                feedId: state.feed().id,
                isOpen: open
            });
        });

        FeedSettingsActionCreator.navigatingToViews = new Action<{}>();
        FeedSettingsActionCreator.navigatingToViews.addListener(() => {
            // always get latest state
            const state = this.getState();
            NavigateToViewsHandler.handleAsync(state, emitCallback).catch((error: Error) => {
                DisplayErrorHandler.handle(state, emitCallback, error);
            });
        });

        FeedSettingsActionCreator.onViewNameChanged = new Action<{ viewName: string; originalViewName: string }>();
        FeedSettingsActionCreator.onViewNameChanged.addListener(({ viewName, originalViewName }) => {
            const state = this.getState();
            const validationResult = ViewNameValidator.GetValidationResult(state, viewName, originalViewName);
            ValidationHandler.handle(state, emitCallback, validationResult);
        });

        FeedSettingsActionCreator.markDefaultViewClicked = new Action<FeedView>();
        FeedSettingsActionCreator.markDefaultViewClicked.addListener(async (selectedView: FeedView) => {
            const state = this.getState();
            state.isSavingChanges = true;
            this.emit();
            try {
                await ChangeDefaultViewHandler.handleAsync(state, selectedView);

                CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.SetAsDefaultView, {
                    feedId: state.feed().id,
                    viewId: selectedView.id,
                    viewType: selectedView.type,
                    viewVisibility: selectedView.visibility
                });
            } catch (error) {
                DisplayErrorHandler.handle(state, emptyCallback, error);
            } finally {
                state.isSavingChanges = false;
                this.emit();
            }
        });

        FeedSettingsActionCreator.saveViewClicked = new Action<{
            view: FeedView;
            makeThisDefaultView: boolean;
            viewPermissions: FeedPermission[];
        }>();
        FeedSettingsActionCreator.saveViewClicked.addListener(
            async ({ view, makeThisDefaultView, viewPermissions }) => {
                const state = this.getState();
                state.isSavingChanges = true;
                this.emit();
                try {
                    const feedView = await SaveViewHandler.handleAsync(state, view, viewPermissions);
                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddViews, {
                        feedId: state.feed().id,
                        type: view.type,
                        visibility: view.visibility,
                        defaultView: makeThisDefaultView
                    });
                    if (makeThisDefaultView) {
                        await ChangeDefaultViewHandler.handleAsync(state, feedView);
                    }
                    ToggleViewPanelDisplayHandler.handle(state, emptyCallback, false /* isOpen */, null);
                    state.updateActionDependencies(DependencyAction.UpdateViews, state.views);
                } catch (error) {
                    state.error = error;
                } finally {
                    state.isSavingChanges = false;
                    state.selectedViews = [];
                    this.emit();
                }
            }
        );

        FeedSettingsActionCreator.showDeleteViewsDialog = new Action<{}>();
        FeedSettingsActionCreator.showDeleteViewsDialog.addListener(() => {
            const state = this.getState();
            const onSaveCallback = async () => {
                try {
                    await DeleteViewsHandler.handleAsync(state);
                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DeleteViews, {
                        feedId: state.feed().id,
                        count: state.selectedViews.length
                    });
                } catch (error) {
                    DisplayErrorHandler.handle(state, emptyCallback, error);
                }
            };
            ShowDeleteViewsDialogHandler.handle(state, emitCallback, onSaveCallback);
        });

        FeedSettingsActionCreator.addViewPermissionChanged = new Action<{
            viewId: string;
            permission: FeedPermission;
        }>();
        FeedSettingsActionCreator.addViewPermissionChanged.addListener(({ viewId, permission }) => {
            const state = this.getState();
            const validationResult = ViewPermissionValidator.GetValidationResult(state, viewId, permission);
            ValidationHandler.handle(state, emitCallback, validationResult);
        });

        FeedSettingsActionCreator.toggleViewPanelDisplay = new Action<{ isOpen: boolean; isEditing: boolean }>();
        FeedSettingsActionCreator.toggleViewPanelDisplay.addListener(({ isOpen, isEditing }) => {
            const state = this.getState();
            // reset validation state
            ValidationHandler.handle(state, emptyCallback, null);
            ToggleViewPanelDisplayHandler.handle(state, emitCallback, isOpen, isEditing);
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddOrEditViewPanel, {
                feedId: state.feed().id,
                isOpen,
                isEditing
            });
        });

        FeedSettingsActionCreator.addUpstreamSources = new Action<ExtendedUpstreamSource[]>();
        FeedSettingsActionCreator.addUpstreamSources.addListener(async (upstreamSources: ExtendedUpstreamSource[]) => {
            // always get latest state
            const state = this.getState();

            const customPublicCount = upstreamSources.filter(s => s.isCustom === true).length;
            let addCustomPublicUpstreamScenario: Performance.IScenarioDescriptor;
            state.isSavingChanges = true;
            state.error = null;
            this.emit();
            try {
                // Set up performance telemetry event for custom upstreams if needed
                if (customPublicCount > 0) {
                    addCustomPublicUpstreamScenario = Performance.getScenarioManager().startScenario(
                        PerfScenarios.Area,
                        PerfScenarios.CustomPublicUpstreamSourceAdded
                    );
                }

                await SaveUpstreamSourcesHandler.addAsync(state, upstreamSources);

                if (addCustomPublicUpstreamScenario) {
                    addCustomPublicUpstreamScenario.end();
                }

                CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddUpstreamSources, {
                    feedId: state.feed().id,
                    count: upstreamSources.length,
                    internalCount: upstreamSources.filter(s => s.upstreamSourceType === UpstreamSourceType.Internal)
                        .length,
                    publicCount: upstreamSources.filter(s => s.upstreamSourceType === UpstreamSourceType.Public).length,
                    customPublicCount
                });

                CloseAddUpstreamPanelHandler.handle(state, emptyCallback);
            } catch (error) {
                if (customPublicCount > 0) {
                    addCustomPublicUpstreamScenario.abort();
                    // display error differently if it occured when adding a custom upstream source in addUpstreamsPanelSection
                    DisplayErrorHandlerAddUpstreamSources.handle(state, emptyCallback, error);
                } else {
                    state.error = error;
                }
            } finally {
                state.isSavingChanges = false;
                this.emit();
            }
        });

        FeedSettingsActionCreator.showDeleteUpstreamSourcesDialog = new Action<{}>();
        FeedSettingsActionCreator.showDeleteUpstreamSourcesDialog.addListener(() => {
            const state = this.getState();
            const onSaveCallback = async () => {
                try {
                    await SaveUpstreamSourcesHandler.deleteAsync(state);

                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.DeleteUpstreamSources, {
                        feedId: state.feed().id,
                        count: state.selectedUpstreamSources.length
                    });
                } catch (error) {
                    DisplayErrorHandler.handle(state, emptyCallback, error);
                }
            };
            ShowDeleteUpstreamSourcesDialogHandler.handle(state, emitCallback, onSaveCallback);
        });

        FeedSettingsActionCreator.reorderUpstreamSources = new Action<{
            fromIndexOfUpstreamSource: UpstreamSource;
            toIndexOfUpstreamSource: UpstreamSource;
        }>();
        FeedSettingsActionCreator.reorderUpstreamSources.addListener(
            async (data: { fromIndexOfUpstreamSource: UpstreamSource; toIndexOfUpstreamSource: UpstreamSource }) => {
                // always get latest state
                const state = this.getState();
                state.isSavingChanges = true;
                this.emit();
                try {
                    await SaveUpstreamSourcesHandler.reorderSourcesAsync(
                        state,
                        data.fromIndexOfUpstreamSource,
                        data.toIndexOfUpstreamSource
                    );

                    CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.ReorderUpstreamSources, {
                        feedId: state.feed().id,
                        fromUpstreamSourceType: data.fromIndexOfUpstreamSource.upstreamSourceType,
                        fromProtocol: data.fromIndexOfUpstreamSource.protocol,
                        toUpstreamSourceType: data.toIndexOfUpstreamSource.upstreamSourceType,
                        toProtocol: data.toIndexOfUpstreamSource.protocol
                    });
                } catch (error) {
                    DisplayErrorHandler.handle(state, emptyCallback, error);
                } finally {
                    state.isSavingChanges = false;
                    this.emit();
                }
            }
        );

        FeedSettingsActionCreator.changeUpstreamSourceName = new Action<string>();
        FeedSettingsActionCreator.changeUpstreamSourceName.addListener((upstreamSourceName: string) => {
            // always get latest state
            const state = this.getState();
            const validation = ChangeUpstreamSourceNameHandler.handle(state, upstreamSourceName);
            ValidationHandler.handle(state, emitCallback, validation);
        });

        FeedSettingsActionCreator.changeUpstreamSourceLocation = new Action<string>();
        FeedSettingsActionCreator.changeUpstreamSourceLocation.addListener((upstreamSourceLocation: string) => {
            // always get latest state
            const state = this.getState();
            const validation = ChangeUpstreamSourceLocationHandler.handle(state, upstreamSourceLocation);
            ValidationHandler.handle(state, emitCallback, validation);
        });

        FeedSettingsActionCreator.openAddUpstreamPanelRequested = new Action<{}>();
        FeedSettingsActionCreator.openAddUpstreamPanelRequested.addListener(() => {
            // always get latest state
            const state = this.getState();
            OpenAddUpstreamPanelHandler.handle(state, emitCallback);

            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddUpstreamSourcesPanel, { isOpen: true });
        });

        FeedSettingsActionCreator.closeAddUpstreamPanelRequested = new Action<{}>();
        FeedSettingsActionCreator.closeAddUpstreamPanelRequested.addListener(() => {
            // always get latest state
            const state = this.getState();
            // clear validation error
            ValidationHandler.handle(state, emptyCallback, null);
            CloseAddUpstreamPanelHandler.handle(state, emitCallback);

            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddUpstreamSourcesPanel, { isOpen: false });
        });

        FeedSettingsActionCreator.onPermissionSelectionChanged = new Action<FeedPermission[]>();
        FeedSettingsActionCreator.onPermissionSelectionChanged.addListener((selectedPermissions: FeedPermission[]) => {
            // always get latest state
            const state = this.getState();
            ChangeSelectedPermissionsHandler.handle(state, selectedPermissions);
            this.emit();
        });

        FeedSettingsActionCreator.onViewSelectionChanged = new Action<FeedView[]>();
        FeedSettingsActionCreator.onViewSelectionChanged.addListener((selectedViews: FeedView[]) => {
            // always get latest state
            const state = this.getState();
            ChangeSelectedViewsHandler.handle(state, selectedViews);
            this.emit();
        });

        FeedSettingsActionCreator.onUpstreamSourcesSelectionChanged = new Action<UpstreamSource[]>();
        FeedSettingsActionCreator.onUpstreamSourcesSelectionChanged.addListener(
            (selectedUpstreamSources: UpstreamSource[]) => {
                // always get latest state
                const state = this.getState();
                ChangeSelectedUpstreamSourcesHandler.handle(state, selectedUpstreamSources);
                this.emit();
            }
        );

        FeedSettingsActionCreator.upgradeFeed = new Action();
        FeedSettingsActionCreator.upgradeFeed.addListener(async () => {
            const state = this.getState();
            state.isSavingChanges = true;
            state.error = null;
            this.emit();
            try {
                const updatedFeed: Feed_ = await UpgradeFeedHandler.handleAsync(state);
                SettingsActions.FeedUpdated.invoke(updatedFeed as Feed);
                ClearErrorHandler.handle(state, emptyCallback);
                announce(PackageResources.FeedDetailsPane_UpgradeInProgress);
            } catch (error) {
                DisplayErrorHandler.handle(state, emptyCallback, error);
            } finally {
                state.isSavingChanges = false;
                this.emit();
            }
        });
    }

    // Note: Previously all handlers were passed a callback (emit or empty) as second parameter
    // to keep handler parameters consistent, now that we have enough handlers
    // using interface (IEmitChange, IDontEmitChange) will be a good idea?
    private async savePermissionsAsync(permissions: FeedPermission[]): Promise<void> {
        // always get latest state
        const state = this.getState();
        state.isSavingChanges = true;
        state.error = null;
        this.emit();
        try {
            await SavePermissionsHandler.handleAsync(state, permissions);
            CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.AddPermissions, {
                feedId: state.feed().id,
                count: permissions.length,
                role: RoleHelper.roleToLocaleString(permissions[0].role)
            });

            ToggleAddUsersOrGroupsPanelDisplayHandler.handle(
                state,
                () => {
                    return;
                },
                false /* close dialog */
            );
        } catch (error) {
            state.error = error;
        } finally {
            state.isSavingChanges = false;
            this.emit();
        }
    }

    /**
     * Calling this will propagate state changes to ControllerView tied to this store
     */
    private emit(): void {
        this._store.emit();
    }

    /**
     * Get state specific to this Action handler
     */
    private getState(): IFeedSettingsState {
        return this._store.getFeedState().feedSettings;
    }

    private _store: FeedStore;
}
