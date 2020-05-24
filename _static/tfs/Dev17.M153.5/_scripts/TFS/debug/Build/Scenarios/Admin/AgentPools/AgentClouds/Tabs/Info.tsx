import * as React from "react";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";

export interface IProps extends React.Props<any> {
	agentCloud: TaskAgentCloud;
}

export class Info extends React.Component<IProps, any> {

  constructor(props) {
    super(props);
  }
  
  public render() {
    
    return (
      <div className="info">

          <div className="header">
            {Resources.InformationLabel}
          </div>
          
          <p> <span className="title"> {Resources.NameLabel} :</span> {this.props.agentCloud.name}</p>
          
          <div className="endpoints">
              <p> <span className="title"> {Resources.AcquireEndpointLabel} :</span> {this.props.agentCloud.acquireAgentEndpoint} </p>
              <p> <span className="title"> {Resources.AgentDefinitionEndpointLabel} :</span> {this.props.agentCloud.getAgentDefinitionEndpoint} </p>
              <p> <span className="title"> {Resources.AgentRequestStatusEndpointLabel} :</span> {this.props.agentCloud.getAgentRequestStatusEndpoint} </p>
              <p> <span className="title"> {Resources.ReleaseEndpointLabel} :</span> {this.props.agentCloud.releaseAgentEndpoint} </p>
          </div>
      </div>
    );
  }
}
