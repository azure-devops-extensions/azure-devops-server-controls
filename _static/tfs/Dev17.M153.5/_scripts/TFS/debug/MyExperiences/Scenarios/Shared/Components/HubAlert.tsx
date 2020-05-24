/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubAlert";
import {HubActions} from "MyExperiences/Scenarios/Shared/Actions";

export interface Props {
}

/**
 * Displays a hub-wide alert.
 *
 * Example: 
 *
 *     <HubAlert>
 *         Favorites isn't working. <a href="#">Refresh</a> 
 *     </HubAlert>
 */
export var HubAlert: React.StatelessComponent<React.Props<Props>> = (props: React.Props<Props>) => {
    
    return (
        <div className="hub-alert error" role="alert">
            <div className="content">
                <span className="type-icon bowtie-icon bowtie-status-failure"/>
                <span className="message">{ props.children }</span>
            </div>
        </div>
    );
};
