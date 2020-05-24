import * as React from "react";
import { PrimaryButton } from "OfficeFabric/Button";
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { autobind, css } from "OfficeFabric/Utilities";
import { announce } from "VSS/Utils/Accessibility";
import * as Telemetry from "VSS/Telemetry/Services";
import { ago, localeFormat } from "VSS/Utils/Date";
import { format, ignoreCaseComparer } from "VSS/Utils/String";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IIterationDetail } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/IterationSelector";

export interface IIterationSelectorProps extends React.Props<void> {
    iterations: IIterationDetail[];
    selectedIterationId: number;
    selectedBaseIterationId: number;
    latestIterationId: number;
    iterationWatermark: number;
    pendingPushNotifications: number;
    targetChangedNotification: boolean;
    iterationsSupported: boolean;
    isVisible: boolean;
    onIterationSelected(iteration: number, base: number): void;
    onPushNotificationsCleared(): void;
}

export interface IIterationSelectorState {
    tooltipDismissed: boolean;
}

const iterationIdSeparator: string = "_";

interface IterationId {
    iter: number;
    base: number;
}

export class IterationSelector extends React.Component<IIterationSelectorProps, IIterationSelectorState> {
    private _refreshButton: HTMLElement;

    constructor(props: IIterationSelectorProps) {
        super(props);
        this.state = { tooltipDismissed: true };
    }

    public render(): JSX.Element {
        return (
            // .vc-iteration-selector is referenced by the quickstart (see PullRequestQuickStart)
            // If this className changes, the quick start will need to be updated
            <div className="vc-iteration-selector">
                <Dropdown
                    label={""} // no text label next to the dropdown
                    className={"vc-iteration-selector-dropdown"}
                    ariaLabel={VCResources.PullRequest_IterationSelector_Label}
                    options={getDropdownOptions(this.props)}
                    selectedKey={getIterationKey({ iter: this.props.selectedIterationId, base: this.props.selectedBaseIterationId})}
                    onChanged={this._onChanged}
                    onRenderOption={this._onRenderOption} />
                {!getRefreshButtonIsDisabled(this.props) &&
                    <div ref={this._setRefreshButtonRef}>
                        <PrimaryButton
                            iconProps={{iconName: "History"}}
                            disabled={getRefreshButtonIsDisabled(this.props)}
                            title={VCResources.PullRequest_IterationSelector_SelectLatestIterationLabel}
                            ariaLabel={VCResources.PullRequest_IterationSelector_SelectLatestIterationLabel}
                            className="vc-pullrequest-latest-iteration-button"
                            onClick={this._onClick} />
                    </div>}
                {this.props.isVisible && !this.state.tooltipDismissed &&
                    <Callout
                        target={this._refreshButton}
                        onDismiss={this._onDismiss}
                        directionalHint={DirectionalHint.rightCenter}
                        gapSpace={0}
                        beakWidth={20}
                        isBeakVisible={true}>
                        <div className="vc-pullrequest-new-changes-callout">
                            <p className="callout-header">{VCResources.PullRequest_NewChangesTitle}</p>
                            <p className="callout-content">
                                {this._calloutContent()}
                            </p>
                        </div>
                    </Callout>
                    }
            </div>);
    }

    public componentWillReceiveProps(nextProps?: IIterationSelectorProps): void {
        const updateIsValid: boolean = isValidIterationUpdate(nextProps);
        const updateHasMorePushes: boolean = nextProps.pendingPushNotifications > this.props.pendingPushNotifications;
        const updateHasRetarget: boolean = nextProps.targetChangedNotification && !this.props.targetChangedNotification;

        if (updateHasRetarget) {
            announce(VCResources.PullRequest_FilesTab_RetargetLiveLabel);
            this.setState({ tooltipDismissed: !updateIsValid });
        }
        else if (updateHasMorePushes) {
            announce(format(VCResources.PullRequest_FilesTab_NewPushLiveLabel, nextProps.pendingPushNotifications));
            this.setState({ tooltipDismissed: !updateIsValid });
        }
    }

    @autobind
    private _onRenderOption(option: IDropdownOption): JSX.Element {
        const id = getIterationIdFromKey(option.key);
        const iteration = this.props.iterations.filter(iter => iter.id === id.iter)[0];
        const shouldShowUpdateBadge: boolean = this.props.iterationsSupported && !!iteration && (id.iter === id.base + 1);
        const shouldShowNewMarker: boolean = shouldShowUpdateBadge && (id.iter > this.props.iterationWatermark);
        const content: string = (!this.props.iterationsSupported && VCResources.PullRequest_IterationSelector_NotSupported) 
            || (shouldShowUpdateBadge && iteration.description)
            || option.text;

        return (
            <span className="vc-iteration-selector-row">
                {shouldShowUpdateBadge &&
                    <span className={css("badge", {"is-new": shouldShowNewMarker})}>
                        {format(VCResources.PullRequest_IterationSelector_UpdateN, id.iter)}
                    </span>}
                {shouldShowUpdateBadge &&
                    <span className="date" title={localeFormat(iteration.createdDate)}>
                        {ago(iteration.createdDate)}
                    </span>}
                <span className="content" title={content}>{content}</span>
            </span>
        );
    }

    @autobind
    private _onChanged(option: IDropdownOption): void {
        const id: IterationId = getIterationIdFromKey(option.key);
        this._onIterationSelect(id, false);
    }

    @autobind
    private _onClick(event: React.MouseEvent<HTMLButtonElement>): void {
        const id: IterationId = { iter: this.props.latestIterationId, base: 0 };
        this._onIterationSelect(id, true);
    }

    @autobind
    private _onDismiss(): void {
        this.setState({ tooltipDismissed: true });
    }

    @autobind
    private _onIterationSelect(id: IterationId, fromButton: boolean = false): void {
        this._onDismiss();
        this._clearPushNotifications();

        publishTelemetry(this.props, fromButton);

        if (!this.props.iterationsSupported) {
            window.location.reload();
            return;
        }

        this.props.onIterationSelected && this.props.onIterationSelected(id.iter, id.base);
    }

    private _clearPushNotifications(): void {
        if (this.props.onPushNotificationsCleared && 
           (this.props.pendingPushNotifications || this.props.targetChangedNotification)) {
            this.props.onPushNotificationsCleared();
        }
    }

    @autobind
    private _setRefreshButtonRef(refreshButton: HTMLElement) {
        this._refreshButton = refreshButton;
    }

    private _calloutContent(): string {
        if (!this.props.iterationsSupported) {
            return VCResources.PullRequest_NewChangesNoIterations;
        }
        else {
            if (this.props.targetChangedNotification) {
                return VCResources.PullRequest_RetargetChanges;
            }
            else {
                return format(VCResources.PullRequest_NewChanges, this.props.latestIterationId - this.props.iterationWatermark)
            }
        }
    }
}

const getDropdownOptions = (props: IIterationSelectorProps): IDropdownOption[] => {
    const dropdownOptionsMap: IDictionaryStringTo<IDropdownOption> = {};

    // if iterations are not supported we only include one item
    if (!props.iterationsSupported) {
        return [{
            key: getIterationKey({ iter: 1, base: 0 }),
            text: VCResources.PullRequest_IterationSelector_AllUpdates,
        }];
    }

    // add an item for the currently selected iteration
    let key: string = getIterationKey({ iter: props.selectedIterationId, base: props.selectedBaseIterationId });
    dropdownOptionsMap[key] = {
        key: key,
        text: props.selectedBaseIterationId === 0
            ? format(VCResources.PullRequest_IterationSelector_UpdateXAndEarlier, props.selectedIterationId)
            : format(VCResources.PullRequest_IterationSelector_UpdateNtoM, props.selectedBaseIterationId, props.selectedIterationId),
    }

    // add an item for every iteration
    for (const iteration of props.iterations) {
        key = getIterationKey({ iter: iteration.id, base: iteration.id - 1 });
        dropdownOptionsMap[key] = {
            key: key,
            text: format(VCResources.PullRequest_IterationSelector_UpdateN, iteration.id),
        }
    }

    // add an item for all updates
    key = getIterationKey({ iter: props.latestIterationId, base: 0 });
    dropdownOptionsMap[key] = {
        key: key,
        text: VCResources.PullRequest_IterationSelector_AllUpdates,
    }

    const dropdownOptions: IDropdownOption[] = Object.keys(dropdownOptionsMap).map(k => dropdownOptionsMap[k]);
    return dropdownOptions.sort((a, b) => compareKeys(a.key as string, b.key as string));
}

const getRefreshButtonIsDisabled = (props: IIterationSelectorProps): boolean => {
    // refresh button is disabled if we are already on the
    // latest iteration and we don't have a different base
    return props.selectedIterationId === props.latestIterationId && !props.selectedBaseIterationId;
}

const isValidIterationUpdate = (props: IIterationSelectorProps): boolean => {
    // first check to see if there are any push notifications at all
    if (props.pendingPushNotifications || props.targetChangedNotification) {
        // this is a valid notification if the iteration changed or we don't support iterations
        // (iteration may not change on a delete, in which case it should be a noop)
        return (props.latestIterationId !== props.iterationWatermark) || !props.iterationsSupported;
    }

    return false;
}

const publishTelemetry = (props: IIterationSelectorProps, fromButton: boolean = false): void => {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        CustomerIntelligenceConstants.ITERATION_SELECTION, {
            LatestIteration: props.latestIterationId,
            IterationSelected: props.selectedIterationId,
            BaseIterationSelected: props.selectedBaseIterationId,
            iterationsSupported: props.iterationsSupported,
            ButtonClicked: fromButton,
        }));
}

const compareKeys = (a: string, b: string): number => {
    const aId: IterationId = getIterationIdFromKey(a);
    const bId: IterationId = getIterationIdFromKey(b);

    // we want (5,0) to be sorted above (5,N)
    if (aId.iter === bId.iter) {
        return (aId.base - bId.base);
    }

    // otherwise sort iterations in a descending order
    return (bId.iter - aId.iter);
}

const getIterationKey = (id: IterationId): string => {
    return (id.iter + iterationIdSeparator + id.base);
}

const getIterationIdFromKey = (key: string | number): IterationId => {
    key = "" + key;
    const keySplit = key.split(iterationIdSeparator);
    const base = parseInt(keySplit.pop(), 10);
    const iter = parseInt(keySplit.pop(), 10);

    return {iter, base};
}