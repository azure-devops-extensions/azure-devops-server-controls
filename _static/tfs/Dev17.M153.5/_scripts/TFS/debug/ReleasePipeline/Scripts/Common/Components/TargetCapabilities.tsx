// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { DetailsList, IColumn, CheckboxVisibility , DetailsListLayoutMode, ConstrainMode} from 'OfficeFabric/DetailsList';

import { Component, IProps, IStateless  } from "DistributedTaskControls/Common/Components/Base";
import Model = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/Common/Components/TargetCapabilities";

export interface Props extends IProps {
    targetCapabilities: Model.TargetCapability[];
}

export class TargetCapabilities extends Component<Props, IStateless > {
    constructor(props?: Props) {
        super(props);
    }

    public render(): JSX.Element {
        return (<div className="target-capabilities-view" role="region" aria-label= {Resources.Capabilities}>
                    <DetailsList
                        items={ this.props.targetCapabilities }
                        setKey='set'
                        isHeaderVisible = {true}
                        constrainMode={ConstrainMode.horizontalConstrained}
                        layoutMode={DetailsListLayoutMode.justified}
                        columns={ this._getColumns() }
                        onRenderItemColumn={ this._renderItemColumn }
                        checkboxVisibility ={ CheckboxVisibility.hidden }
                        className="target-capabilities-details-list"
                        />
               </div>);
    }

    private _getColumns(): IColumn[] {

        var propertyName = Resources.PropertyName;
        var propertyValue = Resources.PropertyValue;

        return [
            {
                key: "name",
                name: propertyName,
                fieldName: "",
                minWidth: 200,
                maxWidth: 300,
                className: "target-capabilities-column-cell",
                headerClassName: "target-capabilities-header"
            },
            {
                key: "value",
                name: propertyValue,
                fieldName: "",
                minWidth: 300,
                maxWidth: 400,
                className: "target-capabilities-column-cell"
            }
        ];
    }

    private _renderItemColumn(item, index, column) {
        let fieldContent = item[column.fieldName];
        let itemElement: JSX.Element = null;

        switch (column.key) {
            case 'name':
                return (
                    <div className="target-capability-name">{item.name}</div>
                );
            case 'value':
                return (
                    <div className="target-capability-value">{item.value}</div>
                );
            default:
                return <span>{ fieldContent }</span>;
        }
    }
}
