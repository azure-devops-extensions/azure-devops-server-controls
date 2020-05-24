import * as React from 'react';
import * as ReactDOM from "react-dom";

import { Component, Props, State } from "VSS/Flux/Component";
import { Store } from "VSS/Flux/Store";
import { Action } from "VSS/Flux/Action";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";

import { DetailsList, SelectionMode, IColumn } from "OfficeFabric/DetailsList";
import Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

export interface DataQualitySourceEntry {
    entity: string;
    latency: number;
}

export interface DataQualityReportComponentProps extends Props {
    dataQualityEntries: DataQualitySourceEntry[];
}

/**
 * (Not for use in production yet.)
 * Provides a detail view of Analytics Data Quality information, to support in visual quality warnings.
 */
export class DataQualityReportComponent extends React.Component<DataQualityReportComponentProps, State> {
    public render() {
        return <DetailsList
            items={this.props.dataQualityEntries}
            columns={this.getColumnHeaders()}
            selectionMode={SelectionMode.none}
        />
    }

    private getColumnHeaders(): IColumn[] {
        return [{
            key: "entity",
            name: Resources.DataQuality_Entity,
            fieldName: "entity",
            minWidth: 100,
        },
        {
            key: "latency",
            name: Resources.DataQuality_Latency,
            fieldName: "latency",
            minWidth: 100,
        }];
    }
}
