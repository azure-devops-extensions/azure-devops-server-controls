// Copyright (c) Microsoft Corporation.  All rights reserved.

import React = require("react");
import Context = require("VSS/Context");
import Events_Action = require("VSS/Events/Action");
import Dialogs = require("VSS/Controls/Dialogs");
import { KeyCode } from "VSS/Utils/UI";
import AgentAcquisitionDialog = require("DistributedTaskControls/Components/AgentAcquisitionDialog");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import Component_SecurityRoles = require("ReleasePipeline/Scripts/MachineGroup/Components/SecurityRoles");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import DTContracts = require("TFS/DistributedTask/Contracts");
import { VssIconType } from "VSSUI/VssIcon";

export class MachineGroupsConstants {
    public static MachineGroupsView: string = "MachineGroupsView";
    public static MachineGroupView: string = "MachineGroupView";
    public static AvailableSharedPoolView: string = "AvailableSharedPoolView";
    public static SecurityTab: string = "Security";
    public static AllTab: string = "All";
    public static AvailablePoolsTab: string = "AvailablePools";
    public static DetailsTab: string = "Details";
    public static MachinesTab: string = "Machines";
    public static OverviewTab: string = "Overview";
    public static ReleasesTab: string = "Releases";
    public static ConfigurationTab: string = "Configuration";
    public static Windows_7: string = "win7-x64";
    public static Ubuntu14_04: string = "ubuntu.14.04-x64"; 
    public static Ubuntu16_04: string = "ubuntu.16.04-x64";
    public static RedHat7_2: string = "rhel.7.2-x64";

    public static Windows: string = "win-x64";
    public static Linux: string = "linux-x64";

    public static healthyStatus = "Healthy";
    public static failingStatus = "Failing";
    public static offlineStatus = "Offline";
    public static neverDeployedStatus = "NeverDeployed";
    public static targetPageSize: number = 25;
    public static hubTitleIconColor: string = "#333333"; // $secondary-dark-2
}

export class MachineGroupsForwardLinks {
    public static LearnMoreAboutMachineGroupsLink: string = "https://aka.ms/832442";
    public static InstructionToConfigureWindowsAgent: string = "https://aka.ms/832440";
    public static InstructionToConfigureLinuxAgent: string = "https://aka.ms/832441";
    public static InstructionToConfigureDarwinAgent: string = "https://aka.ms/832438";
    public static LearnMoreAboutPAT: string = "https://go.microsoft.com/fwlink/?linkid=846962";
}

export function getAgentPlatforms(): IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> {
    let platforms: IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> = {};
    platforms[AgentAcquisitionDialog.PackagePlatforms.Windows] = { createAgentScript: Resources.AgentAcquisitionWindowsCreateAgentMarkdownFormat, configureAgentScript: Resources.AgentAcquisitionWindowsConfigureAgentMarkdownFormat, runAgentScript: Resources.AgentAcquisitionWindowsRunAgentMarkdown, detailedInstructionsLink: MachineGroupsForwardLinks.InstructionToConfigureWindowsAgent };
    platforms[AgentAcquisitionDialog.PackagePlatforms.Linux] = { createAgentScript: Resources.AgentAcquisitionLinuxCreateAgentMarkdownFormat, configureAgentScript: Resources.AgentAcquisitionLinuxConfigureAgentMarkdownFormat, runAgentScript: Resources.AgentAcquisitionLinuxRunAgentMarkdown, detailedInstructionsLink: MachineGroupsForwardLinks.InstructionToConfigureLinuxAgent };
    platforms[AgentAcquisitionDialog.PackagePlatforms.Darwin] = { createAgentScript: Resources.AgentAcquisitionDarwinCreateAgentMarkdownFormat, configureAgentScript: Resources.AgentAcquisitionDarwinConfigureAgentMarkdownFormat, runAgentScript: Resources.AgentAcquisitionDarwinRunAgentMarkdown, detailedInstructionsLink: MachineGroupsForwardLinks.InstructionToConfigureDarwinAgent };

    return platforms;
}

export function onExternalLinkClicked(event: any, url: string) {
        event.preventDefault();
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url
        });
    }

export function showSecurityDialog(mgId?: number, name?: string) {
        let options: Component_SecurityRoles.ISecurityDialogOptions = {
            machineGroupId: mgId,
            name: name
        }
        Dialogs.show(Component_SecurityRoles.SecurityDialog, options);
    }

export class UrlHelper{
    public static getAccountUri(): string{
        var pageContext = Context.getPageContext();
        return pageContext.webContext.account.uri;
    }

    public static getProjectName(): string{
        var pageContext = Context.getPageContext();
        return pageContext.webContext.project.name;
    }
}

export function triggerEnterKeyHandler(e: React.KeyboardEvent<HTMLElement>, handler: (e?: React.KeyboardEvent<HTMLElement>) => void) {
    if (handler && e.keyCode === KeyCode.ENTER) {
        handler(e);
        e.preventDefault();
        e.stopPropagation();
    }
};

export function canUseHttpsProtocol(): boolean{
    var pageContext = Context.getPageContext();
    return pageContext.webAccessConfiguration.isHosted || pageContext.webContext.host.scheme.toLowerCase() == 'https';
}

export function getAllTags(machines: Model.Machine[]): string[]{
    let tags = [];
    if (machines) {
        machines.forEach((machine: Model.Machine) => {
            if (machine.tags) {
                machine.tags.forEach((tag: string) => {
                    if (!tags.some(a => Utils_String.equals(a, tag, true))) {
                        tags.push(tag);
                    }
                });
            }
        });
    }
    return tags;
}

export function hasIntersection(set1: string[], set2:string[]): boolean {
    let returnValue: boolean = false;
    if(set1 && set2) {
        for (let i = 0; i < set1.length; i++) {
            returnValue = (returnValue || (set2.indexOf(set1[i]) >= 0));
            if (returnValue) {
                break;
            }
        }
    }
    return returnValue;
}

export function getCollectionName(): string {
    var pageContext = Context.getPageContext();
    return pageContext.webContext.collection.name;
}

export function isHostedType() {
    var pageContext = Context.getPageContext();
    return pageContext.webAccessConfiguration.isHosted;
}

export function getAgentFilters(statusList?: string[], isNeverDeployed?: boolean): Model.IAgentFilters {
    let agentStatus = 0;
    let agentJobResult = 0;
    if (statusList) {
        statusList.forEach((targetStatusFilter: string) => {
            if (targetStatusFilter === MachineGroupsConstants.offlineStatus) {
                agentStatus = agentStatus | DTContracts.TaskAgentStatusFilter.Offline;
            } else if (targetStatusFilter === MachineGroupsConstants.failingStatus) {
                agentStatus = agentStatus | DTContracts.TaskAgentStatusFilter.Online;
                agentJobResult = agentJobResult | DTContracts.TaskAgentJobResultFilter.Failed;
            } else if (targetStatusFilter === MachineGroupsConstants.healthyStatus && isNeverDeployed) {
                agentStatus = agentStatus | DTContracts.TaskAgentStatusFilter.Online;
                agentJobResult = agentJobResult | DTContracts.TaskAgentJobResultFilter.NeverDeployed;
            } else if (targetStatusFilter === MachineGroupsConstants.healthyStatus) {
                agentStatus = agentStatus | DTContracts.TaskAgentStatusFilter.Online;
                agentJobResult = agentJobResult | DTContracts.TaskAgentJobResultFilter.Passed;
            } else {
                agentStatus = DTContracts.TaskAgentStatusFilter.All;
                agentJobResult = DTContracts.TaskAgentJobResultFilter.All;
            }
        });
    }

    return {
        agentStatus: (agentStatus === 0 ? DTContracts.TaskAgentStatusFilter.All : agentStatus),
        agentJobResult: (agentJobResult === 0 ||
            agentJobResult === (DTContracts.TaskAgentJobResultFilter.NeverDeployed | DTContracts.TaskAgentJobResultFilter.Failed).valueOf() ||
            agentJobResult === (DTContracts.TaskAgentJobResultFilter.Passed | DTContracts.TaskAgentJobResultFilter.Failed).valueOf() ?
            DTContracts.TaskAgentJobResultFilter.All :
            agentJobResult)
    };
}

export function _getAllTargets(pagedTargetGroups?: Model.PagedTargetGroups): Model.Machine[] {
    return pagedTargetGroups ? getConcatTargets(
        pagedTargetGroups.offlinePagedTargetGroup ? pagedTargetGroups.offlinePagedTargetGroup.targets : [],
        pagedTargetGroups.failedPagedTargetGroup ? pagedTargetGroups.failedPagedTargetGroup.targets : [],
        pagedTargetGroups.healthyPagedTargetGroup ? pagedTargetGroups.healthyPagedTargetGroup.targets : [],
        pagedTargetGroups.filteredPagedTargetGroup ? pagedTargetGroups.filteredPagedTargetGroup.targets : []) :
        [];
}

export function getConcatTargets(targets1?: Model.Machine[], targets2?: Model.Machine[], targets3?: Model.Machine[], targets4?: Model.Machine[]): Model.Machine[] {
    if (!targets1) {
        targets1 = [];
    }
    if (targets2) {
        targets1 = Utils_Array.union(targets1, targets2, targetSort);
    }
    if (targets3) {
        targets1 = Utils_Array.union(targets1, targets3, targetSort);
    }
    if (targets4) {
        targets1 = Utils_Array.union(targets1, targets4, targetSort);
    }

    return Utils_Array.unique(targets1, targetSort);
}

export const targetSort = (m1: Model.Machine, m2: Model.Machine): number => {
    if (m1.lastDeployment && !m2.lastDeployment) {
        return -1;
    } else if (!m1.lastDeployment && m2.lastDeployment) {
        return 1;
    } else {
        return m1.name.localeCompare(m2.name);
    }
}

export const machineValueComparer: IComparer<Model.Machine> = (a: Model.Machine, b: Model.Machine): number => {
    return Utils_String.localeComparer(a.name, b.name);
};

export class PackageTypes {
    // netcore 1.x
    public static Windows_7 = "win7-x64";
    public static Osx_10_11 = "osx.10.11-x64";
    public static Ubuntu_14 = "ubuntu.14.04-x64";
    public static Ubuntu_16 = "ubuntu.16.04-x64";
    public static RedHat_72 = "rhel.7.2-x64";

    // netcore 2.x
    public static Windows = "win-x64";
    public static Osx = "osx-x64";
    public static Linux = "linux-x64";
}

export class DeploymentGroupActions {
    public static UpdateErrorMessage = "UpdateErrorMessage";
    public static ClearErrorMessage = "ClearErrorMessage";
    public static UpdateSharePoolFailureMessage = "UpdateSharePoolFailureMessage";
    public static ClearSharePoolFailureMessage = "ClearSharePoolFailureMessage";
}

export class ReleaseIconClass {
    public static releaseSucceeded = { iconName: "CheckMark", className: "release-icon release-vss-Icon--CheckMark", iconType: VssIconType.fabric };
    public static releaseCancelled = { iconName: "CircleStopSolid", className: "release-icon release-vss-Icon--CircleStopSolid", iconType: VssIconType.fabric };
    public static releaseFailed = { iconName: "Clear", className: "release-icon release-vss-Icon--Clear", iconType: VssIconType.fabric };
    public static releaseInProgress = { iconName: "TriangleSolidRight12", className: "release-icon release-vss-Icon--TriangleSolidRight12", iconType: VssIconType.fabric };
    public static releaseWaiting = { iconName: "Clock", className: "release-icon release-vss-Icon--Clock", iconType: VssIconType.fabric };
}