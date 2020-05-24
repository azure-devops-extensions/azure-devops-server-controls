import * as React from "react";

import "VSS/LoaderPlugins/Css!VersionControl/NoPermissionComponent";

export interface NoPermissionProps {
    primaryText: string;
    secondaryText: string;
    imageName: string 
}

export const NoPermissionComponent = (props: NoPermissionProps): JSX.Element => {
    return (
        <div className="no-permission">
            <img className="no-permission-img" src={props.imageName}/>
            <div className="primary-text">
                {props.primaryText}
            </div>
            <div className="secondary-text">
                {props.secondaryText}
            </div>
        </div>
    );
}