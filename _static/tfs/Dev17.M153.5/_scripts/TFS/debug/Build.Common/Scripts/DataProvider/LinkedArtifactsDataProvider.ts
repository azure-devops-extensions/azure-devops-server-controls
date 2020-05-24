import Q = require("q");

import { BuildResult } from "Build.Common/Scripts/BuildResult";
import { BuildStatus } from "Build.Common/Scripts/BuildStatus";
import * as CustomerIntelligenceConstants from "Build.Common/Scripts/Common/CustomerIntelligence";
import * as BuildCommonResources from "Build.Common/Scripts/Resources/TFS.Resources.Build.Common";

import LinkedArtifacts = require("Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts");
import {ILinkedArtifact, ArtifactIconType, ILinkedArtifactAdditionalData} from "TFS/WorkItemTracking/ExtensionContracts";
import { BaseDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

import Build_Contracts = require("TFS/Build/Contracts");
import Build_Client = require("TFS/Build/RestClient");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export default class LinkedArtifactsDataProvider extends BaseDataProvider<number, Build_Contracts.Build> {
    public supportedTool: string = Artifacts_Constants.ToolNames.TeamBuild.toLowerCase();

    constructor() {
        super(Artifacts_Constants.ToolNames.TeamBuild);
    }

    protected _convertKey(key: string): number {
        return parseInt(key, 10);
    }

    protected _getResolvedArtifactId(resolvedArtifact: Build_Contracts.Build): string {
        return resolvedArtifact.id.toString(10);
    }

    protected _getData(ids: number[], columns: LinkedArtifacts.IColumn[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: LinkedArtifacts.IHostArtifact, linkedArtifacts?: ILinkedArtifact[]): IPromise<Build_Contracts.Build[]> {
        if (!ids || ids.length === 0) {
            return Q([]);
        }

        const tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        const buildClient = tfsConnection.getHttpClient(Build_Client.BuildHttpClient);
        // This can happen at collection scope (eg: WIT's search preview through search at collection level), so project can be null
        const projectId = tfsContext.contextData.project && tfsContext.contextData.project.id;

        // we are going to return this promise, not the CI continuation
        const promise = buildClient.getBuilds(projectId, null, null, null, null, null, null, null, null, null, null, null, null, null, null, Build_Contracts.QueryDeletedOption.IncludeDeleted, null, null, ids);

        // report CI
        promise.then((resolvedArtifacts : Build_Contracts.Build[]) => {
            const linkStats = {};
            const resolvedArtifactsMap: IDictionaryStringTo<Build_Contracts.Build> = Utils_Array.toDictionary<Build_Contracts.Build, Build_Contracts.Build>(resolvedArtifacts, ra => this._getResolvedArtifactId(ra));

            for (let i = 0; i < linkedArtifacts.length; i++)
            {
                const artifact = linkedArtifacts[i];

                // For each of the original linked artifacts, map using the resolved artifact
                if (!linkStats[artifact.linkType]) {
                    linkStats[artifact.linkType] = { Resolved: 0, NotResolved : 0 }
                }

                if (!resolvedArtifactsMap[this._getArtifactId(artifact)]) {
                    linkStats[artifact.linkType].NotResolved++;
                }
                else {
                    linkStats[artifact.linkType].Resolved++;
                }
            }

            let eventData = new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.BuildCommonCustomerIntelligenceArea.BUILDCOMMON,
                CustomerIntelligenceConstants.CustomerIntelligenceBuildLinking.LINKED_WORK_ITEM_BUILDS, linkStats);
            Telemetry.publishEvent(eventData);
        });

        return promise;
    }

    protected _valueToDisplayData(linkedArtifact: ILinkedArtifact, build: Build_Contracts.Build, columns: LinkedArtifacts.IColumn[], tfsContext: TFS_Host_TfsContext.TfsContext): LinkedArtifacts.IInternalLinkedArtifactDisplayData  {
        if (!build) {
            return BaseDataProvider.getErrorDisplayData(linkedArtifact, new Error(Utils_String.format(PresentationResource.LinkedArtifacts_BuildResolutionFailed, linkedArtifact.linkTypeDisplayName)));
        }

        const showLastUpdated = columns.some((column) => column.refName === LinkedArtifacts.InternalKnownColumns.LastUpdate.refName);
        const showState = columns.some((column) => column.refName === LinkedArtifacts.InternalKnownColumns.State.refName);

        const additionalData: IDictionaryStringTo<ILinkedArtifactAdditionalData> = {};

        if (showLastUpdated) {
            let time: Date = null;
            switch (build.status) {
                case Build_Contracts.BuildStatus.Completed:
                    time = build.finishTime;
                    break;
                case Build_Contracts.BuildStatus.InProgress:
                    time = build.startTime;
                    break;
                case Build_Contracts.BuildStatus.NotStarted:
                case Build_Contracts.BuildStatus.Postponed:
                case Build_Contracts.BuildStatus.Cancelling:
                    time = build.queueTime;
                    break;
            }

            additionalData[LinkedArtifacts.InternalKnownColumns.LastUpdate.refName] = {
                styledText: { text: Utils_Date.friendly(time) },
                title: Utils_Date.localeFormat(time, "F"),
                rawData: time
            };
        }

        let buildIconClassName: string = "";
        let displayName: string = "";
        if (Utils_String.localeIgnoreCaseComparer(linkedArtifact.linkType, "Found in build") === 0) {
            buildIconClassName = "bowtie-build-issue";
            displayName = BuildCommonResources.LinkedFoundInArtifactDisplayName;
        } 
        else if (Utils_String.localeIgnoreCaseComparer(linkedArtifact.linkType, "Integrated in build") === 0) {
            buildIconClassName = "bowtie-build";
            displayName = BuildCommonResources.LinkedIntegratedInArtifactDisplayName;
        }
        else {
            buildIconClassName = "bowtie-build";
            displayName = BuildCommonResources.LinkedArtifactDisplayName;
        }

        if (showState) {
            let statusDisplayValues = BuildStatus.getDisplayValues(build.status, build.result);
            additionalData[LinkedArtifacts.InternalKnownColumns.State.refName] = {
                styledText: { 
                    text: BuildResult.getDisplayText(build.result),
                    className: BuildResult.getLinkedBuildTextClassName(build.result)
                },
                icon: {
                    title: statusDisplayValues.text,
                    descriptor: `bowtie-icon ${statusDisplayValues.iconClassName} ${BuildResult.getTextClassName(build.result)}`,
                    type: ArtifactIconType.icon
                }
            };
        }
        
        return {
            comment: linkedArtifact.comment,
            id: linkedArtifact.id,
            tool: linkedArtifact.tool,
            type: linkedArtifact.type,
            linkType: linkedArtifact.linkType,
            linkTypeDisplayName: displayName,
            primaryData: {
                displayId: displayName,
                title: Utils_String.format(BuildCommonResources.LinkedBuildTitle, build.definition.name, build.buildNumber),
                typeName: Artifacts_Constants.ArtifactTypeNames.Build,
                user: null,
                href: build._links["web"].href,
                typeIcon: {
                    descriptor: `bowtie-icon ${buildIconClassName}`,
                    title: displayName,
                    type: ArtifactIconType.icon
                },
                callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
                    let executedEvent = new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.BuildCommonCustomerIntelligenceArea.BUILDCOMMON,
                        CustomerIntelligenceConstants.CustomerIntelligenceBuildLinking.OPEN_LINKED_BUILD, {
                            "pullRequestId": miscData.prId,
                        });
                    Telemetry.publishEvent(executedEvent);
                    return false;
                },
            },
            additionalData: additionalData
        };
    }
}