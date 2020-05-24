// libs
import * as React from "react";
import { Store } from "VSS/Flux/Store";
import { autobind } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
// controls
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Link } from "OfficeFabric/Link";
// scenario
import { Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export enum MessageTarget {
    page,
    buildErrors,
    reviewersErrors,
    statusErrors,
}

export interface IMessage {
    id: number;
    target: MessageTarget;
    messageType: MessageBarType;
    content: React.ReactNode;
}

type PolicyLinkDescriptor = {
    configurationId: number;
    configurationLink: string;
    policyTypeDisplayName: string;
}

export class MessageStore extends Store {
    private readonly _tfsContext: TfsContext;

    private readonly _messages: IMessage[] = [];

    private _nextMessageId = 1;

    constructor(tfsContext: TfsContext, pageData: any) {
        super();

        this._tfsContext = tfsContext;

        if (pageData) {
            this._addMessageAboutMultiscopePolicies(tfsContext, pageData);

            this._addMessageWithLinksToParentScopes(tfsContext, pageData);
        }
    }

    public getMessages(target: MessageTarget) {
        return this._messages.filter(msg => msg.target === target);
    }

    @autobind
    public showMessage(payload: Actions.ShowMessagePayload): void {
        if (!this._messageExists(payload)) {
            this._messages.unshift({
                id: this._nextMessageId++,
                target: payload.target,
                messageType: payload.messageType,
                content: payload.content,
            });

            this.emitChanged();
        }
    }

    @autobind
    public dismissMessages(payload: Actions.DismissMessagesPayload): void {
        let changed = false;

        for (let index = this._messages.length - 1; index >= 0; --index) {
            if (this._messages[index].id === payload.id || this._messages[index].target === payload.target) {
                this._messages.splice(index, 1);
                changed = true;
            }
        }

        if (changed) {
            this.emitChanged();
        }
    }

    private _messageExists(payload: Actions.ShowMessagePayload): boolean {
        return this._messages.some(m =>
            m.content === payload.content
            && m.messageType === payload.messageType
            && m.target === payload.target);
    }
    private _addMessageAboutMultiscopePolicies(tfsContext: TfsContext, pageData: any): void {
        const multiscopePolicies = pageData.multiscopePoliciesWhichApply as PolicyLinkDescriptor[];

        if (!multiscopePolicies || multiscopePolicies.length < 1) {
            return;
        }

        const links = multiscopePolicies
            .map<JSX.Element>((policy, index) => {
                return (
                    <Link
                        key={index}
                        className="policy-messageBar-warnings-link"
                        href={policy.configurationLink}
                    >{format(Resources.PolicyWithIdAndType, policy.configurationId, policy.policyTypeDisplayName)}</Link>
                );
            });

        this.showMessage({
            target: MessageTarget.page,
            messageType: MessageBarType.info,
            content: [
                <span key="_a">{Resources.MultiscopePolicyMessageBarText}</span>,
                <br key="_b" />,
                ...links,
            ]
        });
    }

    // Find out if this other scope with a policy is a branch scope. We don't yet have any way edit repo-level policies,
    // or branch-level policies which exist at the project scope.
    private static readonly _branchScopeRegex = /^[0-9a-f]{32}:refs\/heads\/(.+)$/i;

    private _addMessageWithLinksToParentScopes(tfsContext: TfsContext, pageData: any): void {

        const parentScopeList = pageData.parentScopesWithApplicablePolicies as string[];

        if (!parentScopeList || parentScopeList.length < 1) {
            return;
        }

        const policyEditPageUrlBase = tfsContext.getActionUrl("_policies", "admin", {}) + "?scope=";

        const links = parentScopeList
            .map<JSX.Element>((parentScope: string, index: number) => {
                const match = parentScope.match(MessageStore._branchScopeRegex);

                if (!match) {
                    return null;
                }

                return (
                    <Link
                        key={index}
                        className="policy-messageBar-warnings-link"
                        href={policyEditPageUrlBase + parentScope}
                    >{match[1]}</Link>
                );
            })
            .filter(link => link != null);

        if (links.length > 0) {
            this.showMessage({
                target: MessageTarget.page,
                messageType: MessageBarType.info,
                content: [
                    <span key="_a">{Resources.ParentPolicyMessageBarText}</span>,
                    <br key="_b" />,
                    ...links,
                ]
            });
        }
    }
}
