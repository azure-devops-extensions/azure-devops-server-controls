import * as React from "react";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { Spinner } from "OfficeFabric/Spinner";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import * as CloneWikiDialog_Async from "Wiki/Scenarios/Overview/Components/CloneWikiDialog";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/CloneWikiDialogContainer";

const delayAnnounceHelper = new DelayAnnounceHelper();
let clonePopupTargetContainer: HTMLElement;

export class CloneWikiDialogContainer extends React.PureComponent<CloneWikiDialog_Async.CloneWikiDialogProps, {}> {
    public render(): JSX.Element {
        const props: CloneWikiDialog_Async.CloneWikiDialogProps = this.props;
        return (
            <div
                ref={(ref: HTMLElement) => clonePopupTargetContainer = ref}
                className={"clone-popup-target-container"}>
                {
                    this.props.isOpen && <AsyncCloneWikiDialog {...props} targetElement={this.props.targetElement} />
            }
            </div>
        );
    }
}

const WaitSpinnerInCallout = (): JSX.Element => {
    return (
        <Callout
            className={"wait-spinner-callout"}
            target={clonePopupTargetContainer}
            coverTarget={true}
            isBeakVisible={false}
            gapSpace={0}
            directionalHint={DirectionalHint.topRightEdge}>
            <Spinner className={"clone-wiki-popup-wait-spinner"} />
        </Callout>
    );
};

const AsyncCloneWikiDialog = getAsyncLoadedComponent(
    ["Wiki/Scenarios/Overview/Components/CloneWikiDialog"],
    (module: typeof CloneWikiDialog_Async) => module.CloneWikiDialog,
    () => <WaitSpinnerInCallout />,
    () => delayAnnounceHelper.startAnnounce(WikiResources.CloneWikiDialog_StartedLoadingComponent),
    () => delayAnnounceHelper.stopAndCancelAnnounce(WikiResources.CloneWikiDialog_CompletedLoadingComponent));
