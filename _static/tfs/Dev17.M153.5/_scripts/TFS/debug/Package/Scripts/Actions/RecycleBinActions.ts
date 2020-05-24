import { Action } from "VSS/Flux/Action";

import { IMultiCommandPayload } from "Package/Scripts/Common/ActionPayloads";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class RecycleBinActions {
    /**
     * Event triggered when user clicks recycle bin button and results in navigating to recycle bin page.
     */
    public static RecycleBinClicked = new Action();

    /**
     * Event triggered when user clicks recycle bin bread crumb and results in navigating to recycle bin page.
     */
    public static RecycleBinBreadCrumbClicked = new Action();

    /**
     * Event triggered when user permanently deletes packages and results in permanent deletion of selected packages.
     */
    public static PackagesPermanentDeleted = new Action<IMultiCommandPayload>();

    /**
     * Event triggered when permanent deletion of packages has completed
     */
    public static PackagesPermanentDeletedCompleted = new Action();

    /**
     * Event triggered when user restores packages to feed and results in restoragin of selected packages to feed.
     */
    public static PackagesRestoredToFeed = new Action<IMultiCommandPayload>();

    /**
     * Event triggered when user clicks on a package and results in navigating to package page.
     */
    public static PackageSelected = new Action<Package>();

    /**
     * Event triggered when user confirms to empty the recycle bin.
     */
    public static EmptyRecycleBin = new Action();

    /**
     * Event triggered when user clicks on versions pivot tab and results in navigating to versions tab.
     */
    public static VersionsPivotSelected = new Action();

    /**
     * Event that gets triggered when the user hits the bottom of the recycle bin package list and is requesting more packages.
     */
    public static NextPackagePageRequested = new Action();

    /**
     * Event that gets triggered when the user filters the recycle bin packages by name
     */
    public static FilterPackages = new Action<string>();

    /**
     * Event to toggle the state of the modal dialog in recycle bin page.
     */
    public static EmptyDialogClosed = new Action();

    /**
     * Event to toggle the state of the modal dialog in recycle bin page.
     */
    public static EmptyDialogOpened = new Action();
}
