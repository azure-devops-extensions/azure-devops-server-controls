// Copyright (c) Microsoft Corporation.  All rights reserved.
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";

import { BreadcrumbItem, ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import { IHeaderItemPicker, IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";
import { IHubHeaderProps } from "VSSUI/HubHeader";

export class ReleaseBreadcrumbUtils {

    public static getHubHeaderProperties(items: IHeaderItemPicker, breadcrumbItems: IHubBreadcrumbItem[]): IHubHeaderProps {
        const headerHubProps: IHubHeaderProps = {
            headerItemPicker: items,
            breadcrumbItems: breadcrumbItems,
            hubBreadcrumbAriaLabel: Resources.ReleaseProgressBreadcrumbs
        };

        return headerHubProps;
    }

    public static getBreadcrumbItems(release: RMContracts.Release, includeReleaseItem: boolean = false): IHubBreadcrumbItem[] {
        let items: IHubBreadcrumbItem[] = [];

        if (release) {
            items.push(this._getReleaseDefinitionItem(release));
            if (includeReleaseItem) {
                items.push(this._getReleaseItem(release));
            }
        }

        return items;
    }

    public static getBreadcrumbItemsForEnvironment(release: RMContracts.Release, environmentId: number): IHubBreadcrumbItem[] {
        let items: IHubBreadcrumbItem[] = this.getBreadcrumbItems(release, true);
        let environment: RMContracts.ReleaseEnvironment = null;
        if (release && release.environments) {
            release.environments.some((currentEnvironment) => {
                if (currentEnvironment.id === environmentId) {
                    environment = currentEnvironment;
                    return true;
                }
            });

            if (environment) {
                items.push(this._getReleaseEnvironmentItem(environment, release.id));
            }
        }

        return items;
    }

    private static _getReleaseDefinitionItem(release: RMContracts.Release) {
        let releaseDefinitionName: string = Utils_String.empty;
        let releaseDefinitionId: number = 0;
        const breadcrumbIconName = "cd-release-progress-icon bowtie-icon bowtie-deploy"; // placeholder icon
        let releaseDefinitionIconProps = {
            iconType: VssIconType.bowtie,
            iconName: breadcrumbIconName
        };

        if (release.releaseDefinition) {
            releaseDefinitionName = release.releaseDefinition.name;
            releaseDefinitionId = release.releaseDefinition.id;
        }


        return {
            text: releaseDefinitionName,
            key: "ReleaseDefinition" + releaseDefinitionId,
            leftIconProps: releaseDefinitionIconProps,
            href: ReleaseUrlUtils.getReleaseLandingPageUrl(releaseDefinitionId),
            onClick: (e) => { this._navigateToReleaseLandingPage(e, releaseDefinitionId); }
        };
    }

    private static _getReleaseItem(release: RMContracts.Release): IHubBreadcrumbItem {
        const breadCrumbItem = {
            text: (release && release.name) ? release.name : Utils_String.empty,
            key: "Release" + release.id,
            onClick: (event) => { this._navigateToReleasePage(release.id); event.preventDefault(); },
            href: ReleaseUrlUtils.getReleaseProgressUrl(release.id)
        } as IHubBreadcrumbItem;
        return breadCrumbItem;
    }

    private static _getReleaseEnvironmentItem(environment: RMContracts.ReleaseEnvironment, releaseId: number): IHubBreadcrumbItem {
        const breadCrumbItem = {
            text: (environment && environment.name) ? environment.name : Utils_String.empty,
            key: "Environment" + environment.id,
            onClick: (event) => { this._navigateToReleaseEnvironmentLogsPage(releaseId, environment.id); event.preventDefault(); },
            href: ReleaseUrlUtils.getReleaseEnvironmentLogsUrl(releaseId, environment.id)
        } as IHubBreadcrumbItem;
        return breadCrumbItem;
    }

    public static publishBreadcrumbTelemetry(breadcrumbItem: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.breadcumbItem] = breadcrumbItem;
        Telemetry.instance().publishEvent(Feature.ReleaseProgressBreadcrumb, eventProperties);
    }

    private static _navigateToReleaseLandingPage = (ev: React.MouseEvent<HTMLElement>, releaseDefinitionId: number) => {
        const releaseUrl = ReleaseUrlUtils.getReleaseLandingPageUrl(releaseDefinitionId);
        if (ev) {
            UrlUtilities.navigateTo(releaseUrl, true, ev);
        }
        else {
            // For test cases where onClick() is invoked directly, event is undefined
            UrlUtilities.navigateTo(releaseUrl, true);
        }

        ReleaseBreadcrumbUtils.publishBreadcrumbTelemetry(BreadcrumbItem.releaseDefinition);
    }

    private static _navigateToReleasePage = (releaseId: number) => {
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleasePipelineProgress, { releaseId: releaseId }, null, false, false);

        ReleaseBreadcrumbUtils.publishBreadcrumbTelemetry(BreadcrumbItem.release);
    }

    private static _navigateToReleaseEnvironmentLogsPage = (releaseId: number, environmentId: number) => {
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, { releaseId: releaseId, environmentId: environmentId }, null, false, false);

        ReleaseBreadcrumbUtils.publishBreadcrumbTelemetry(BreadcrumbItem.environment);
    }
}

