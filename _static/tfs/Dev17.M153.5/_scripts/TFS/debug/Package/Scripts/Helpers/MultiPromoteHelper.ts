import { IDropdownOption } from "OfficeFabric/Dropdown";
import { findIndex } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import {
    IMultiPromotePanelProps,
    IMultiPromotePanelState,
    IPromotePackageVersionsMap
} from "Package/Scripts/Components/MultiPromotePanel";
import { isV2Feed } from "Package/Scripts/Helpers/FeedCapabilityHelper";
import * as PackageResources from "Feed/Common/Resources";
import { FeedView, Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IHelperResult {
    newState: IMultiPromotePanelState;
    versionsPromotedToViewMap: { [viewId: string]: string[] };
    cachedPackagesSelected?: boolean;
}

// TODO: Add tests for these methods.
export class MultiPromoteHelper {
    public static initialize(props: IMultiPromotePanelProps): IHelperResult {
        const selectedVersionsMap: IPromotePackageVersionsMap[] = [];

        const allowedViews: FeedView[] = [];
        let newState: IMultiPromotePanelState;
        const versionsPromotedToViewMap: { [viewId: string]: string[] } = {};
        let cachedPackagesSelected: boolean = false;
        let selectedView: FeedView = props.views[0];
        if (props.mruViewId) {
            const selectedViewIndex = findIndex(props.views, view => view.id === props.mruViewId);
            if (selectedViewIndex !== -1) {
                selectedView = props.views[selectedViewIndex];
            }
        }

        // For each package do the following:
        //      - Check if the package has already been promoted to the view
        //      - Add the views to which the package has already been promoted to the views map
        props.selectedPackages.forEach((pkg: Package) => {
            // V2 feed can promote cached packages, V1 cannot.
            if (pkg && (isV2Feed(props.feed) || (pkg.versions[0].isCachedVersion !== true && pkg.isCached !== true))) {
                // Make a copy of the package so that fetching versions won't update the latest package in the grid.
                const packageSummary = JSON.parse(JSON.stringify(pkg));
                const firstVersion = packageSummary.versions[0];
                let packageAlreadyPromoted: boolean = false;

                firstVersion.views.forEach((viewInVersion: FeedView) => {
                    if (selectedView.id === viewInVersion.id) {
                        packageAlreadyPromoted = true;
                    }

                    // Add to the map the views/versions that have been promoted
                    if (versionsPromotedToViewMap[viewInVersion.id]) {
                        versionsPromotedToViewMap[viewInVersion.id].push(firstVersion.version);
                    } else {
                        versionsPromotedToViewMap[viewInVersion.id] = [firstVersion.version];
                    }
                });

                selectedVersionsMap.push({
                    packageSummary,
                    selectedVersionName: firstVersion.version,
                    versionAlreadyPromoted: packageAlreadyPromoted,
                    selectedVersionViews: firstVersion.views,
                    calloutOpen: false,
                    allVersionsFetched: false
                });
            } else if (pkg) {
                cachedPackagesSelected = true;
            }
        });

        // Only allow promotion to views where _not all_ the packages have already been promoted to
        props.views.forEach((view: FeedView) => {
            // This logic (the length comparison between the arrays) is only valid here since it's on initialize
            if (
                !versionsPromotedToViewMap[view.id] ||
                versionsPromotedToViewMap[view.id].length < props.selectedPackages.length
            ) {
                allowedViews.push(view);
            }
        });

        if (allowedViews.length > 0) {
            const views = this.convertViewsToDropdownOptions(allowedViews, props.feed.name) as IDropdownOption[];
            const selectedViewExistsInAllowedViews = allowedViews.some(view => view.id === selectedView.id);

            if (!selectedViewExistsInAllowedViews) {
                selectedView = allowedViews[0];
                if (selectedView != null) {
                    this.updateVersionAlreadyPromoted(selectedVersionsMap, selectedView);
                }
            }

            newState = {
                selectedPackageVersionsMap: selectedVersionsMap,
                selectedView,
                viewOptions: views,
                isSaving: false
            };
        } else {
            newState = {
                selectedPackageVersionsMap: selectedVersionsMap,
                selectedView: null,
                viewOptions: [],
                isSaving: false
            };
        }

        return {
            newState,
            versionsPromotedToViewMap,
            cachedPackagesSelected
        };
    }

    public static convertViewsToDropdownOptions(views: FeedView[], feedName: string): IDropdownOption[] {
        const viewOptions: IDropdownOption[] = [];

        views.map(view => {
            viewOptions.push({
                key: view.id,
                text: feedName + "@" + view.name
            } as IDropdownOption);
        });

        return viewOptions;
    }

    public static updateVersionAlreadyPromoted(
        selectedPackageVersionsMap: IPromotePackageVersionsMap[],
        selectedView: FeedView
    ): IPromotePackageVersionsMap[] {
        // check which packages are already in the view
        selectedPackageVersionsMap.map((map: IPromotePackageVersionsMap) => {
            // TODO: Review
            for (const version of map.packageSummary.versions) {
                if (version.version === map.selectedVersionName) {
                    const alreadyPromoted = version.views.some((view: FeedView) => {
                        // if the package version has selected view in the views array
                        // the version is already promoted to the view
                        if (view.id === selectedView.id) {
                            map.versionAlreadyPromoted = true;
                            return true;
                        }
                    });

                    if (!alreadyPromoted) {
                        map.versionAlreadyPromoted = false;
                    }

                    break;
                }
            }
        });

        return selectedPackageVersionsMap;
    }

    public static onVersionChanged(
        option: IDropdownOption,
        versionsPromotedToViewMap: { [viewId: string]: string[] },
        currentState: IMultiPromotePanelState,
        currentProps: IMultiPromotePanelProps
    ): IHelperResult {
        const packageVersionMap: IPromotePackageVersionsMap[] = currentState.selectedPackageVersionsMap;
        let showAllViews: boolean = false;
        const allowedViews: FeedView[] = currentProps.views.slice();
        let selectedView: FeedView = currentState.selectedView ? currentState.selectedView : currentProps.views[0];
        let previouslySelectedVersionName: string;

        // TODO: Review
        for (const map of packageVersionMap) {
            // Finding the selected package from selectedPackageVersionsMap.
            if (map.packageSummary.id == option.data) {
                previouslySelectedVersionName = map.selectedVersionName;
                map.selectedVersionName = option.text.split("(")[0].trim(); // trim out "(latest)" if it exists.
                map.versionAlreadyPromoted = false;

                // TODO: Review
                for (const currentVersion of map.packageSummary.versions) {
                    const latestVersionString = Utils_String.format(
                        PackageResources.MultiPromote_LatestVersion,
                        currentVersion.version
                    );

                    // Finding the new selected version from all versions.
                    if (
                        latestVersionString === map.selectedVersionName ||
                        currentVersion.version === map.selectedVersionName
                    ) {
                        // Updating selectedVersionViews.
                        map.selectedVersionViews = currentVersion.views;

                        // Removing all instances of old version from viewCounter.
                        Object.keys(versionsPromotedToViewMap).forEach((viewId: string) => {
                            versionsPromotedToViewMap[viewId].some((versionName: string, index) => {
                                if (versionName === previouslySelectedVersionName) {
                                    versionsPromotedToViewMap[viewId].splice(index, 1);
                                    return true;
                                }
                            });
                        });

                        if (map.selectedVersionViews.length === 0) {
                            showAllViews = true;
                        } else {
                            map.selectedVersionViews.forEach((versionView: FeedView) => {
                                // Adding new selected version to viewCounter.
                                if (versionsPromotedToViewMap[versionView.id]) {
                                    versionsPromotedToViewMap[versionView.id].push(option.text);
                                } else {
                                    versionsPromotedToViewMap[versionView.id] = [option.text];
                                }

                                // Updating versionAlreadyPromoted.
                                if (versionView.id === selectedView.id) {
                                    map.versionAlreadyPromoted = true;
                                }
                            });
                        }

                        break;
                    }
                }

                if (!showAllViews) {
                    Object.keys(versionsPromotedToViewMap).forEach((viewId: string) => {
                        if (versionsPromotedToViewMap[viewId].length === currentProps.selectedPackages.length) {
                            // Removing a view from the view list if all packages are already in the view.
                            const removableViewIndex = findIndex(allowedViews, viewOption => viewId === viewOption.id);
                            if (removableViewIndex !== -1) {
                                allowedViews.splice(removableViewIndex, 1);
                            }

                            // Updating versionAlreadyPromoted and selectedView.
                            if (viewId === selectedView.id && allowedViews.length > 0) {
                                selectedView = allowedViews[0];
                                map.versionAlreadyPromoted = map.selectedVersionViews.some((view: FeedView) => {
                                    return view.id === selectedView.id;
                                });
                            } else if (viewId === selectedView.id && allowedViews.length === 0) {
                                // All selected versions are in all of the views.
                                selectedView = null;
                                map.versionAlreadyPromoted = true;
                            }
                        }
                    });
                }

                break;
            }
        }

        const newViews = MultiPromoteHelper.convertViewsToDropdownOptions(allowedViews, currentProps.feed.name);
        const newState = {
            selectedPackageVersionsMap: packageVersionMap,
            viewOptions: newViews,
            selectedView: allowedViews.length > 0 ? selectedView : null,
            isSaving: false
        };

        return {
            newState,
            versionsPromotedToViewMap
        };
    }
}
