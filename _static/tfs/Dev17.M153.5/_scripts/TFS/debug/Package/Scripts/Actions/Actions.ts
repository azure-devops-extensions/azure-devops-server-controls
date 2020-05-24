import { Action } from "VSS/Flux/Action";

import { IFilterState } from "VSSUI/Utilities/Filter";

import {
    INewFeedCreatedPayload,
    IPackageDeletedPayload,
    IPackageDependencySelectedPayload,
    IPackageDeprecatedPayload,
    IPackageListedPayload,
    IPackageListedStatusChangedPayload,
    IPackagePayload,
    IPackagePromotedPayload,
    IPackageSelectionChangedPayload,
    IPackageVersionSelectedPayload,
    IPromotePanelPayload
} from "Package/Scripts/Common/ActionPayloads";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { IError } from "Feed/Common/Types/IError";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * Singleton action that gets triggered when the user selects the feed breadcrumb.
 * Provide Package when you're in the package details page and actually click the breadcrumb.
 */
export let FeedBreadcrumbSelected = new Action<Package>();

/**
 * Singleton action that gets triggered when the user selects a feed.
 */
export let FeedSelected = new Action<Feed>();

/**
 * Singleton action that gets triggered when the user updates the feed.
 */
export let FeedUpdated = new Action<Feed>();

/**
 * Singleton action that gets triggered when the user deletes the feed.
 */
export let FeedDeleted = new Action<Feed>();

/**
 * Singleton action that gets triggered when the user selects a package.
 */
export let PackageSelected = new Action<Package>();

/**
 * Singleton action that gets triggered when the user selects a package dependency.
 */
export let PackageDependencySelected = new Action<IPackageDependencySelectedPayload>();

/**
 * Singleton action that gets triggered when the user selects a package version in the version list.
 */
export let PackageVersionSelected = new Action<IPackageVersionSelectedPayload>();

/**
 * Singleton action that gets triggered when the user modifies a package from the package list.
 */
export let PackageListUpdated = new Action<string[]>();

/**
 * Singleton action that gets triggered when the user modifies a package.
 */
export let PackageModified = new Action<IPackagePayload>();

/**
 * Singleton action that gets triggered when the user requests a modification to a package
 */
export let PackageModifyRequested = new Action();

/**
 * Singleton action that gets triggered when package modification fails
 */
export let PackageModifyFailed = new Action();

/**
 * Singleton action that gets triggered when the user unlists/relists/deletes a package via package list.
 */
export let PackageListedStatusChanged = new Action<IPackageListedStatusChangedPayload>();

/**
 * Singleton action that gets triggered when the user hits the bottom of the package list and is requesting more packages.
 */
export let NextPackagePageRequested = new Action();

/**
 * Singleton action that gets triggered when the user creates a new feed.
 */
export let NewFeedCreated = new Action<INewFeedCreatedPayload>();

/**
 * Singleton action that gets triggered when the user updates the feed list.
 */
export let FeedListUpdated = new Action<Feed[]>();

/**
 * Singleton action that gets triggered when the user updates feed's views.
 */
export let FeedViewsUpdated = new Action<FeedView[]>();

/**
 * Singleton action that gets triggered when the user promotes a package through the package details page using the old promote dialog.
 */
export let PackageVersionPromoted = new Action<IPackagePromotedPayload>();

/**
 * Singleton action that gets triggered when the user deprecates a package.
 */
export let PackageVersionDeprecated = new Action<IPackageDeprecatedPayload>();

/**
 * Singleton action that gets triggered when deprecation of a package has completed.
 */
export let PackageVersionDeprecatedCompleted = new Action();

/**
 * Singleton action that gets triggered when an error is encountered.
 */
export let ErrorEncountered = new Action<IError>();

/**
 * Singleton action that gets triggered when the error is dismissed.
 */
export let ErrorDismissed = new Action();

/**
 * Singleton action that gets triggered when multi promote panel is opened.
 */
export let MultiPromotePanelOpened = new Action<IPromotePanelPayload>();

/**
 * Singleton action that gets triggered when multi promote panel is closed.
 */
export let MultiPromotePanelClosed = new Action();

/**
 * Singleton action that gets triggered when user clicks the multi command panel version dropdown.
 */
export let MultiCommandVersionDropdownClicked = new Action<string>();

/**
 * Singleton action that gets triggered when user promotes multiple package versions to a view.
 */
export let MultiplePackagesPromoted = new Action<IPackagePromotedPayload>();

/**
 * Triggered when Copy to clipboard is invoked
 */
export let CopyToClipboard = new Action();

/**
 * Triggered when selection in the package grid changed
 */
export let PackageSelectionChangedInPackageGrid = new Action<IPackageSelectionChangedPayload>();

/**
 * Triggered when properties in the filter bar in the packages pivot bar changed
 */
export let PackagesFilterBarChanged = new Action<IFilterState>();

/**
 * Triggered when the follow button is clicked
 */
export let PackageFollowClicked = new Action<boolean>();

/**
 * Triggered when Create Feed button is clicked
 */
export let CreateFeedNavigateClicked = new Action();

/**
 * Triggered when Create Feed is canceled
 */
export let CreateFeedCanceled = new Action<Feed>();

/**
 * Singleton action that gets triggered when the user clickes the Versions tab.
 */
export let VersionsPivotSelected = new Action();

/**
 * Singleton action that gets triggered when the user selects or deselects package versions in the versions list.
 */
export let VersionSelectionChanged = new Action<PackageVersion[]>();

/**
 * User filtered or clear filtered results, filter items to display in grid
 */
export let PackageVersionsFiltersChanged = new Action<IFilterState>();

/**
 * Singleton action that gets triggered when user opens or closes a dialog.
 */
export let DialogOpenChanged = new Action<IGeneralDialogProps>();

/**
 * Singleton action that gets triggered when user deletes a package.
 */
export let PackagesDeleted = new Action<IPackageDeletedPayload>();

/**
 * Singleton action that gets triggered when delete of a package has completed.
 */
export let PackageDeletedCompleted = new Action();

/**
 * Singleton action that gets triggered when user unlists or relists packages.
 */
export let PackageListedChanged = new Action<IPackageListedPayload>();

/**
 * Singleton action that gets triggered unlist or relist of packages has completed
 */
export let PackageListedChangedCompleted = new Action();

/**
 * Open/close the CreateBadgePanel
 */
export let ToggleCreateBadgePanel = new Action<boolean>();

/**
 * Open/close the single promote dialog
 */
export let TogglePromoteDialog = new Action<boolean>();

/**
 * Open/close the single promote dialog
 */
export let DismissPackageRetentionMessage = new Action<string>();
