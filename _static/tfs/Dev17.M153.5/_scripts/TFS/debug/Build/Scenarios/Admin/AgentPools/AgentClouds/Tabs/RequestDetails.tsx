import * as React from 'react';
import { VssDetailsList } from 'VSSUI/VssDetailsList';
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as AgentCloudRequestStore from "../Stores/AgentCloudRequest";
import { TaskAgentCloudRequest } from 'TFS/DistributedTask/Contracts';
import { RequestDetailKeys } from "../../Constants";

export interface IProps extends React.Props<any> {
    AgentCloudRequestStore: AgentCloudRequestStore.Store;
}

export class RequestDetails extends React.Component<IProps, any> {

    private _agentCloudRequestStore: AgentCloudRequestStore.Store = null;

    constructor(props) {
        super(props);

        this._agentCloudRequestStore = this.props.AgentCloudRequestStore;

        this.state = {
            items: this._getItems(this._agentCloudRequestStore.getAgentCloudRequests())
        };

    }

    private _getItems(agentCloudRequests: TaskAgentCloudRequest[]) {
        var items: any[] = [];

        for (var i = 0; i < agentCloudRequests.length; i++) {
            items.push({
                pool: (agentCloudRequests[i].pool != null) ? agentCloudRequests[i].pool.name : "",
                agent: (agentCloudRequests[i].agent != null) ? agentCloudRequests[i].agent.name : "",
                agentspec: agentCloudRequests[i].agentSpecification,
                ProvisionRequestTime: (agentCloudRequests[i].provisionRequestTime != null) ? agentCloudRequests[i].provisionRequestTime.toISOString() : "",
                ProvisionedTime: (agentCloudRequests[i].provisionedTime != null) ? agentCloudRequests[i].provisionedTime.toISOString() : "",
                AgentConnectedTime: (agentCloudRequests[i].agentConnectedTime != null) ? agentCloudRequests[i].agentConnectedTime.toISOString() : "",
                ReleaseRequestTime: (agentCloudRequests[i].releaseRequestTime != null) ? agentCloudRequests[i].releaseRequestTime.toISOString() : ""
            });
        }
        return items;
    }


    public componentDidMount() {
        // add changed listeners
        this._agentCloudRequestStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        // remove changed listeners
        this._agentCloudRequestStore.removeChangedListener(this._onStoresUpdated);
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    };

    private _getState() {
        return {
            items: this._getItems(
                this._agentCloudRequestStore.getAgentCloudRequests()
            )
        };
    }

    public render() {
        let { items } = this.state;

        return (
            <VssDetailsList
                className='vss-details-list'
                items={items}
                selectionPreservedOnEmptyClick={true}
                columns={
                    [
                        {
                            key: RequestDetailKeys.Pool,
                            name: Resources.Pool,
                            fieldName: Resources.Pool,
                            isResizable: true,
                            minWidth: 100,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.pool}</span>;
                            }
                        },
                        {
                            key: RequestDetailKeys.Agent,
                            name: Resources.Agent,
                            fieldName: Resources.Agent,
                            isResizable: true,
                            minWidth: 100,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.agent}</span>;
                            }
                        },
                        /*  {
                              key: "agentspec",
                              name: "Agent Spec",
                              fieldName: "Agent Spec",
                              isResizable: true,
                              minWidth: 100,
                              maxWidth: 200,
                              onRender: (item: any) => {
                                  return <span>{item.agentspec}</span>;
                              }
                          },*/
                        {
                            key: RequestDetailKeys.ProvisionRequestTime,
                            name: Resources.ProvisionRequestTime,
                            fieldName: Resources.ProvisionRequestTime,
                            isResizable: true,
                            minWidth: 200,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.ProvisionRequestTime}</span>;
                            }
                        },
                        {
                            key: RequestDetailKeys.ProvisionedTime,
                            name: Resources.ProvisionedTime,
                            fieldName: Resources.ProvisionedTime,
                            isResizable: true,
                            minWidth: 200,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.ProvisionedTime}</span>;
                            }
                        },
                        {
                            key: RequestDetailKeys.AgentConnectedTime,
                            name: Resources.AgentConnectedTime,
                            fieldName: Resources.AgentConnectedTime,
                            isResizable: true,
                            minWidth: 200,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.AgentConnectedTime}</span>;
                            }
                        },
                        {
                            key: RequestDetailKeys.ReleaseRequestTime,
                            name: Resources.ReleaseRequestTime,
                            fieldName: Resources.ReleaseRequestTime,
                            isResizable: true,
                            minWidth: 200,
                            maxWidth: 200,
                            onRender: (item: any) => {
                                return <span>{item.ReleaseRequestTime}</span>;
                            }
                        }
                    ]
                }
            />
        );
    }
}
