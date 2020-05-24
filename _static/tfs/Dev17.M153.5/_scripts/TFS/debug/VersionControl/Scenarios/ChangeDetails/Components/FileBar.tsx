import * as React from "react";
import * as IconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

import { SourcePath } from "VersionControl/Scenarios/Shared/SourcePath";

import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { HubPivotFiltersPanelContainer } from "VersionControl/Scenarios/ChangeDetails/Components/HubPivotFiltersPanelContainer";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

import "VSS/LoaderPlugins/Css!VersionControl/FileBar";

export interface IFileBarProps extends IChangeDetailsPropsBase {
    path: string;
    isDirectory: boolean;
    linesDeleted?: number;
    linesAdded?: number;
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

export const FileBar = (props: IFileBarProps): JSX.Element => {
    const icon = "file-icon bowtie-icon " + IconPicker.getIconNameForFile(props.path);
    const isDirectoryCss = props.isDirectory ? "is-directory" : "";
    return (
        <div className={"vc-changedetails-file-bar " + isDirectoryCss}>
            <div className='file-info-container'>
                <div className={icon} />
                <SourcePath path={props.path} linesAdded={props.linesAdded} linesDeleted={props.linesDeleted} />
            </div>
            <HubPivotFiltersPanelContainer
                actionCreator={props.actionCreator}
                storesHub={props.storesHub}
                customerIntelligenceData={props.customerIntelligenceData && props.customerIntelligenceData.clone()} />
        </div>
    );
}
