/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import { Status, IStatusProps, StatusSize } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/InformationRow";

export interface IInfoColumn {
    label: string;
    value: string | JSX.Element;
    iconProps?: IStatusProps;
}

export interface IInformationRowProps extends ComponentBase.IProps {
    columns: IInfoColumn[];
}

export class InformationRow extends ComponentBase.Component<IInformationRowProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        let infoColumns: JSX.Element[] = [];

        this.props.columns.forEach((infoData: IInfoColumn, index: number) => {
            infoColumns.push(this._renderStringColumn(infoData, index));
        });

        return (
            <div className="row-content-container">
                {infoColumns}
            </div>
        );
    }

    private _renderStringColumn(infoData: IInfoColumn, key: number): JSX.Element {
        const label: string = infoData.label;
        const value: string | JSX.Element = infoData.value;
        const iconProps: IStatusProps = infoData.iconProps;
        if (label && value) {
            return (
                <div className="column-content-container" key={key}>
                    <Label className="column-label">{label}</Label>
                    <div className="column-value-container">
                    {
                        iconProps &&
                        <Status
                            {...iconProps}
                            className= "column-icon"
                            size={StatusSize.s}
                        />
                    }
                        <div className="column-value">{value}</div>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }
}
