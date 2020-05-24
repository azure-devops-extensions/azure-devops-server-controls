/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubGroupAlert";

export interface Props {
}

/**
 * Displays a hub-group-wide alert.
 *
 * Example: 
 *
 *     <HubGroupAlert>
 *         'Done' has failed to load.
 *     </HubGroupAlert>
 */
export var HubGroupAlert: React.StatelessComponent<React.Props<Props>> = (props: React.Props<Props>) => {
    
    return (
        <div className="hub-group-alert" role="alert">
            <span className="type-icon bowtie-icon bowtie-status-failure"/>
            <span className="message">{ props.children }</span>
        </div>
    );  
};
