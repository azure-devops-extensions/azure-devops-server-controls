/// <reference types="react" />

import * as React from "react";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ConnectedServiceComponentUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";

import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import * as VssContext from "VSS/Context";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ManageLink";

const urlParamter_EnpointresourceId: string = "?resourceId=";

export enum ManageLinkType {
    EndPoint,
    AgentQueue
}

export interface IManageLinkProps extends Base.IProps {
    manageLinkType: ManageLinkType;
    displaySeperator?: boolean;
    resourceId?: any;
}

export class ManageLink extends Base.Component<IManageLinkProps, Base.IStateless> {

    public render() {

        return (
            <span className="manage-link" >
                {
                    this.props.displaySeperator &&
                    <span className="seperator">{"|"} </span>
                }
                <Link
                    href={this._getManageLink()}
                    className={css("fabric-style-overrides")}
                    aria-label={Resources.Manage}
                    target="_blank" >
                    {Resources.Manage}
                    <span className="bowtie-icon bowtie-navigate-external" />
                </Link>
            </span >
        );
    }

    private _getManageLink(): string {

        let actionUrl: string;
        if (this.props.manageLinkType === ManageLinkType.EndPoint) {
            actionUrl = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "services", { "area": "admin" });
            if (!!this.props.resourceId && actionUrl) {
                actionUrl = actionUrl.concat(urlParamter_EnpointresourceId, this.props.resourceId);
            }
        }
        else {
            actionUrl = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "AgentQueue",
                { project: VssContext.getDefaultWebContext().project.name, area: "admin", queueId: this.props.resourceId, _a: "agents" });
        }

        return actionUrl;
    }
}
