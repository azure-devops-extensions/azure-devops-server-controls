import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { FlatViewText } from "DistributedTaskControls/Components/FlatViewText";
import { IFlatViewTableRow, ContentType, IFlatViewCell, IFlatViewColumn, ICellIndex } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import {
    PipelineArtifactVersion,
    PipelineBuildVersion
} from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Store from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import * as EnvironmentUtils from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";

import { css } from "OfficeFabric/Utilities";
import * as DetailsListProps from "OfficeFabric/DetailsList";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseArtifactsComponent";

export interface IReleaseDialogArtifactsProps extends Store.IReleaseDialogArtifactsState, Base.IProps {
    onArtifactSelectedVersionChange(artifactIndex: number, newSelectedVersion: string): void;
}

export class CreateReleaseArtifactsComponent extends Base.Component<IReleaseDialogArtifactsProps, Base.IStateless>{
    private static readonly ARTIFACT_SOURCE_HEADER_KEY: string = "alias";
    private static readonly ARTIFACT_VERSION_BRANCH_HEADER_KEY: string = "versions";
    private static readonly ARTIFACT_ERROR_HEADER_KEY: string = "error-icon";

    public render(): JSX.Element {
        let contentClassName: string = !!this.props ? this.props.cssClass : Utils_String.empty;
        return (
            <div className={css("create-release-artifacts-content", contentClassName)}>
                {this._artifactsDisplayContent()}
            </div>
        );
    }

    private _getSelectedVersion(artifactVersion: PipelineArtifactVersion, artifactSelectedVersion: string): string {
        let selectedVersion: string;
        if (!artifactVersion || !artifactVersion.versions || !artifactSelectedVersion) {
            selectedVersion = artifactSelectedVersion;
        } else {
            let version = Utils_Array.first(artifactVersion.versions, (version: PipelineBuildVersion): boolean => {
                return Utils_String.localeIgnoreCaseComparer(version.name, artifactSelectedVersion) === 0;
            });

            if (version) {
                selectedVersion = ArtifactUtility.getArtifactVersionDisplayValue(version);
            } else {
                selectedVersion = artifactSelectedVersion;
            }
        }

        return selectedVersion;
    }

    private _getVersions(artifactVersion: PipelineArtifactVersion): string[] {
        let versions: string[] = [];
        if (artifactVersion && artifactVersion.versions) {
            versions = artifactVersion.versions.map((version: PipelineBuildVersion): string => {
                return ArtifactUtility.getArtifactVersionDisplayValue(version);
            });
        }

        return versions;
    }

    private _getErrorTooltipComponent(hasError: boolean, errorMessage: string, index: number): JSX.Element {
        let errorClass = hasError ? "artifact-version-error" : undefined;
        let referenceId: string = `${index}-tooltip-message-override`;
        return (
            hasError &&
                <TooltipHost directionalHint={DirectionalHint.bottomLeftEdge} content={errorMessage}>
                    <FlatViewIcon ariaLiveRegionMessage={errorMessage} rowSelected={true} iconName="Error" className={errorClass} />
                </TooltipHost>
            );
    }

    private _getArtifactsRows(): IFlatViewTableRow[] {
        const artifactSourceClassName = "artifact-source";
        let artifactsRows: IFlatViewTableRow[] = [];

        let artifactsVersions: EnvironmentUtils.IArtifactVersionData[] = this.props.artifactsVersionsData || [];

        artifactsVersions.forEach((artifact: EnvironmentUtils.IArtifactVersionData, index: number): void => {
            let row: IFlatViewTableRow = { cells: {} };
            let versions: string[] = this._getVersions(artifact.artifactVersion);
            let artifactVersionAlias: string = !!artifact.artifactVersion ? artifact.artifactVersion.alias : Utils_String.empty;
            // icon column
            row.cells[CreateReleaseArtifactsComponent.ARTIFACT_ERROR_HEADER_KEY] = this._getIconCellContent(artifact, index);

            let content = (
                <FlatViewText 
                    text={artifactVersionAlias} />
            );

            row.cells[CreateReleaseArtifactsComponent.ARTIFACT_SOURCE_HEADER_KEY] = {
                cssClass: "artifact-source-cell",
                content: content,
                contentType: ContentType.JsxElement,
                isTextDisabled: true,
            } as IFlatViewCell;

            let selectedVersion = this._getSelectedVersion(artifact.artifactVersion, artifact.selectedVersion);
            row.cells[CreateReleaseArtifactsComponent.ARTIFACT_VERSION_BRANCH_HEADER_KEY] = {
                content: (
                    <FlatViewDropdown
                        maxAutoExpandDropWidth={300}
                        cssClass="artifact-version-selector"
                        conditions={versions}
                        selectedCondition={selectedVersion}
                        rowSelected={false}
                        onValueChanged={(newSelectedVersion: string): void => {
                            if (this.props.onArtifactSelectedVersionChange) {
                                this.props.onArtifactSelectedVersionChange(index, newSelectedVersion);
                            }
                        }}
                        ariaLabel={Utils_String.localeFormat(Resources.ArtifactVersionsOptionAriaLabelText, artifact.artifactVersion.alias)}
                        type={ComboBoxType.Editable}
                        enableFilter={true}
                        allowEdit={true}
                        hasErrors={artifact.hasError}
                    />
                ),
                contentType: ContentType.JsxElement,
                contentHasErrors: artifact.hasError
            } as IFlatViewCell;

            artifactsRows.push(row);
        });

        return artifactsRows;
    }

    private _getIconCellContent(artifact: EnvironmentUtils.IArtifactVersionData, index: number): IFlatViewCell {
        let content: JSX.Element = this._getErrorTooltipComponent(artifact.hasError, artifact.errorMessage, index);
        return {
            content: content,
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _artifactsDisplayContent(): JSX.Element {
        let headers: IFlatViewColumn[] = [];

        // error icon
        headers.push({
            key: CreateReleaseArtifactsComponent.ARTIFACT_ERROR_HEADER_KEY,
            name: Resources.CreateReleasePanelArtifactErrorIconAriaLabel,
            isIconOnly: true,
            isFixedColumn: true,
            minWidth: 20,
            maxWidth: 20,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: CreateReleaseArtifactsComponent.ARTIFACT_SOURCE_HEADER_KEY,
            name: Resources.ArtifactSourceAlias,
            isFixedColumn: true,
            maxWidth: 217,
            minWidth: 217,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: CreateReleaseArtifactsComponent.ARTIFACT_VERSION_BRANCH_HEADER_KEY,
            name: Resources.VersionBranchCombinationText,
            isFixedColumn: true,
            maxWidth: 283,
            minWidth: 283,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        return (
            <FlatViewTable
                headers={headers}
                rows={this._getArtifactsRows()}
                onCellValueChanged={(value: string, newCellIndex: ICellIndex) => { }} />
        );
    }

}
