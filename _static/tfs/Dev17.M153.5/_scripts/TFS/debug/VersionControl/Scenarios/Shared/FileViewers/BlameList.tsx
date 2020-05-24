import { IconButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { List } from "OfficeFabric/List";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Controls from "VSS/Identities/Picker/Controls";
import { PersonaCard } from "VSS/Identities/Picker/PersonaCard";
import * as Service from "VSS/Service";
import { friendly, localeFormat } from "VSS/Utils/Date";
import { KeyCode } from "VSS/Utils/UI";

import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { AnnotationBlock, VersionMap } from "VersionControl/Scripts/Controls/AnnotateAnnotationEngine";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ChangeList, TfsChangeList, GitCommit, GitObjectId, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getUserNameWithoutEmail, getCommitterEmailIdFromChangeList } from "VersionControl/Scripts/ChangeListIdentityHelper";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { areSimilar } from "VersionControl/Scripts/Utils/Number";
import { getCommitUrlForFile, getChangesetUrlForFile } from "VersionControl/Scripts/VersionControlUrls";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/FileViewers/BlameList";

export interface BlameListProps {
    repositoryContext: RepositoryContext;
    path: string;
    blocks: AnnotationBlock[];
    firstVersion: string;
    versionsMap: VersionMap;
    scrollTop: number;
    lineHeight: number;
    firstLineTop: number;
    currentLineNumber: number;
    getVersion(lineNumber: number): string;
    onCommitClick: React.EventHandler<React.MouseEvent<HTMLLinkElement>>;
    onScroll(scrollTop: number): void;
    onViewBlamePrior(changeList: ChangeList, line: number): void;
}

export interface BlameListState {
    highlightLineNumber: number;
    selectedVersion: string;
}

namespace Constants {
    export const blocksPerPage = 10;
}

/**
 * Component that renders a list of blame blocks. To be used side to side with file content.
 */
export class BlameList extends React.PureComponent<BlameListProps, BlameListState> {
    private list: List;

    constructor(props: BlameListProps) {
        super(props);
        this.state = {
            highlightLineNumber: props.currentLineNumber,
            selectedVersion: props.getVersion(props.currentLineNumber),
        };
    }

    public componentWillReceiveProps(newProps: BlameListProps) {
        if (this.props.currentLineNumber !== newProps.currentLineNumber) {
            this.setHighlightLineNumber(newProps.currentLineNumber);
        }
    }

    public render(): JSX.Element {
        if (!this.props.blocks) {
            return <Spinner type={SpinnerType.large} label={VCResources.LoadingText} />;
        }

        return (
            <ScrollableWithoutBars
                className="vc-blame-list"
                scrollTop={this.props.scrollTop}
                onScroll={this.props.onScroll}>
                <div style={{ height: this.props.firstLineTop }} />
                <FocusZone
                    direction={FocusZoneDirection.bidirectional}>
                    <List
                        ref={ref => this.list = ref}
                        items={this.props.blocks}
                        onRenderCell={this.onRenderCell}
                        getPageHeight={this.getPageHeight}
                        getItemCountForPage={this.getItemCountForPage}
                    />
                </FocusZone>
            </ScrollableWithoutBars>);
    }

    private onRenderCell = (block: AnnotationBlock) => {
        return renderBlock(block, this.props, this.state, this.setHighlightLineNumber);
    }

    private setHighlightLineNumber = (highlightLineNumber: number) => {
        this.setState(
            {
                highlightLineNumber,
                selectedVersion: this.props.getVersion(highlightLineNumber),
            },
            // Force List refresh when highlightLineNumber changes, it wouldn't because items are the same.
            () => this.list && this.list.forceUpdate());
    }

    private getItemCountForPage = () => Constants.blocksPerPage;

    private getPageHeight = (itemIndex: number): number => {
        const pageFirstLine = this.props.blocks[itemIndex].startLine;
        const pageLastBlockIndex = Math.min(itemIndex + Constants.blocksPerPage, this.props.blocks.length) - 1;
        const pageNextLine = this.props.blocks[pageLastBlockIndex].startLine + this.props.blocks[pageLastBlockIndex].lineCount;
        const pageLineCount = pageNextLine - pageFirstLine;
        return pageLineCount * this.props.lineHeight;
    }
}

/**
 * Generates the block element from the BlameList props and state.
 * @param block The block to render.
 * @param props The BlameList props.
 * @param state The BlameList state.
 * @param setHighlightLineNumber Function to set the highlight number when interacting with this block.
 */
export function renderBlock(
    block: AnnotationBlock,
    props: BlameListProps,
    state: BlameListState,
    setHighlightLineNumber: (highlightLineNumber: number) => void,
): JSX.Element {
    const history = props.versionsMap[block.version];
    const itemChangeType = (history && history.itemChangeType) || VersionControlChangeType.None;
    return <SelectionBlameBlock
        repositoryContext={props.repositoryContext}
        path={history ? history.serverItem : props.path}
        changeList={history && history.changeList}
        isEdit={
            ChangeType.hasChangeFlag(itemChangeType, VersionControlChangeType.Edit) && 
            !ChangeType.hasChangeFlag(itemChangeType, VersionControlChangeType.Add)
        }
        hasOlderChange={block.version !== props.firstVersion}
        blockHeight={block.lineCount * props.lineHeight}
        isCurrentVersion={block.version === state.selectedVersion}
        isCurrentBlock={doesLineBelongToBlock(state.highlightLineNumber, block)}
        startLine={block.startLine}
        oLine={block.oLine}
        onClick={setHighlightLineNumber}
        onCommitClick={props.onCommitClick}
        onFocus={setHighlightLineNumber}
        onViewBlamePrior={props.onViewBlamePrior}
    />;
}

function doesLineBelongToBlock(lineNumber: number, block: AnnotationBlock): boolean {
    return block.startLine <= lineNumber && lineNumber < block.startLine + block.lineCount;
}

interface SelectionBlameBlockProps extends BlameBlockProps {
    blockHeight: number;
    isCurrentVersion: boolean;
    isCurrentBlock: boolean;
}

/**
 * Renders a block properly based on current selection.
 * Provides better performance, because changes on current block or version
 * won't require to re-render the inner BlameBlock.
 */
const SelectionBlameBlock = ({ blockHeight, isCurrentBlock, isCurrentVersion, ...props }: SelectionBlameBlockProps) =>
    <div
        className="annotation-block"
        role="row"
        aria-selected={isCurrentBlock}
        style={{ height: blockHeight }}>
        {
            isCurrentVersion &&
            <div className={css("selected-annotation-block-marker", { "selected-line": isCurrentBlock })} />
        }
        <BlameBlock {...props} />
    </div>;

export interface BlameBlockProps {
    repositoryContext: RepositoryContext;
    path: string;
    isEdit: boolean;
    hasOlderChange: boolean;
    changeList: ChangeList | undefined;
    startLine: number;
    oLine: number;
    onClick(line: number): void;
    onCommitClick: React.EventHandler<React.MouseEvent<HTMLLinkElement>>;
    onFocus(line: number): void;
    onViewBlamePrior(changeList: ChangeList, line: number): void;
}

class BlameBlock extends React.PureComponent<BlameBlockProps> {
    private commitHash: CommitHash;

    public render(): JSX.Element {

        if (!this.props.changeList) {
            return null;
        }

        return (
            <div className="annotation-details" role="presentation" onClick={this.onClick}>
                <CenteredTooltipHost className="change-list" content={this.props.changeList.comment}>
                    <CommitHash
                        {...getCommitHashProps(this.props)}
                        ref={ref => this.commitHash = ref}
                        showCopyButton={false}
                        showTooltip={false}
                        onLinkClick={this.props.onCommitClick}
                        onFocus={this.onFocus}
                    />
                </CenteredTooltipHost>
                {
                    this.props.onViewBlamePrior &&
                    <CenteredTooltipHost content={VCResources.BlamePriorThisChange} className="blame-prior-tooltip-host" tabIndex={-1}>
                        {
                            this.props.hasOlderChange &&
                            <IconButton
                                className="blame-prior-button"
                                iconProps={{ iconName: "Rewind" }}
                                ariaLabel={VCResources.BlamePriorThisChange}
                                onClick={this.onViewBlamePrior}
                            />
                        }
                    </CenteredTooltipHost>
                }
                <BlamePersona
                    changeList={this.props.changeList} />
                <CenteredTooltipHost className="date" content={localeFormat(this.props.changeList.creationDate, "F")}>
                    {friendly(this.props.changeList.creationDate)}
                </CenteredTooltipHost>
            </div >);
    }

    private onClick = (): void => {
        this.commitHash.focus();
        this.props.onClick(this.props.startLine);
    }

    private onFocus = (): void => {
        this.props.onFocus(this.props.startLine);
    }

    private onViewBlamePrior = (): void => {
        this.props.onViewBlamePrior(this.props.changeList, this.props.oLine);
    }
}

/**
 * Gets props for the CommitHash link given the current block.
 */
export function getCommitHashProps(props: BlameBlockProps): { commitId: GitObjectId, href: string } {
    const action = props.isEdit
        ? VersionControlActionIds.Compare
        : VersionControlActionIds.Contents;

    if (props.repositoryContext.getRepositoryType() === RepositoryType.Git) {
        const { commitId } = props.changeList as GitCommit;
        return {
            commitId,
            href: getCommitUrlForFile(
                props.repositoryContext as GitRepositoryContext,
                commitId.full,
                props.path,
                action),
        };
    } else {
        const { changesetId } = props.changeList as TfsChangeList;
        const id = changesetId.toString();
        return {
            commitId: { full: id, short: id },
            href: getChangesetUrlForFile(
                changesetId,
                props.path,
                action,
                props.repositoryContext.getTfsContext()),
        };
    }
}

interface ScrollableWithoutBarsProps extends React.Props<ScrollableWithoutBars> {
    className?: string;
    scrollTop: number;
    onScroll(scrollTop: number): void;
}

interface CenteredTooltipHostProps {
    className: string;
    tabIndex?: number;
    content: string;
    children?: React.ReactNode;
    calloutProps?: any;
}

const CenteredTooltipHost = (props: CenteredTooltipHostProps) =>
    <div className={props.className} tabIndex={props.tabIndex}>
        <TooltipHost
            calloutProps={{ ...props.calloutProps, gapSpace: 0 }}
            content={props.content}
            directionalHint={DirectionalHint.topCenter}>
            {props.children}
        </TooltipHost>
    </div>;

class ScrollableWithoutBars extends React.PureComponent<ScrollableWithoutBarsProps, {}> {
    private element: Element;
    private static hideScrollbarStyle: React.CSSProperties;

    public componentDidUpdate() {
        this.applyScrollTop();
    }

    public render(): JSX.Element {
        return (
            <div
                className={"scrollable-without-bars-outer " + (this.props.className || "")}>
                <div
                    className="scrollable-without-bars-inner"
                    ref={this.captureElement}
                    style={ScrollableWithoutBars.hideScrollbarStyle}
                    onScroll={this.onScroll}>
                    {this.props.children}
                </div>
            </div>);
    }

    private captureElement = (ref: HTMLDivElement): void => {
        const codeEditorHorizontalScrollbarSize = 14;

        this.element = ref;

        if (ref && !ScrollableWithoutBars.hideScrollbarStyle) {
            const scrollbarSize = ref.offsetWidth - ref.clientWidth;
            ScrollableWithoutBars.hideScrollbarStyle = {
                marginRight: -scrollbarSize,
                // Adds space at the bottom to match the scrollbar in monaco.
                paddingBottom: codeEditorHorizontalScrollbarSize,
            };

            this.forceUpdate();
        }

        this.applyScrollTop();
    }

    private applyScrollTop = () => {
        if (this.element &&
            this.props.scrollTop !== undefined &&
            !areSimilar(this.element.scrollTop, this.props.scrollTop)
        ) {
            const oldScrollTop = this.element.scrollTop;
            this.element.scrollTop = this.props.scrollTop;

            // Sometimes element is not ready yet to react to scrollTop changes, so we use setTimeout to ensure it works
            setTimeout(
                () => {
                    if (this.element.scrollTop === oldScrollTop) {
                        this.element.scrollTop = this.props.scrollTop;
                    }
                },
                0);
        }
    }

    private onScroll = () => {
        if (this.element) {
            this.props.onScroll(this.element.scrollTop);
        }
    }
}

interface BlamePersonaProps {
    changeList: ChangeList | undefined;
}

interface BlamePersonaState {
    personaCardVisible: boolean;
}

class BlamePersona extends React.PureComponent<BlamePersonaProps, BlamePersonaState>{
    private targetElement: HTMLElement;
    public state: BlamePersonaState = {
        personaCardVisible: false,
    };

    public render(): JSX.Element {
        const consumerGuidBlameSection = "{BE95D432-CF3C-4EF6-A47E-F9EAD8AB2662}";
        
        return (
            <CenteredTooltipHost className="owner"
                content={this.props.changeList.ownerDisplayName}
                calloutProps={{
                    className: css({ hidden: this.state.personaCardVisible })
                }}>
                <div
                    className="persona-card-blame"
                    role="button"
                    aria-label={this.props.changeList.ownerDisplayName}
                    ref={this._setTargetElement}
                    data-is-focusable={true}
                    onClick={this._showPersonaCard}
                    onKeyDown={this._handleKeyDown}
                    aria-expanded={this.state.personaCardVisible}>
                    {getUserNameWithoutEmail(this.props.changeList.ownerDisplayName)}
                    {this.state.personaCardVisible &&
                        <PersonaCard
                            uniqueAttribute={getCommitterEmailIdFromChangeList(this.props.changeList)}
                            target={this.targetElement as HTMLElement}
                            entityOperationsFacade={Service.getService(Controls.EntityOperationsFacade)}
                            onDismissCallback={this._hidePersonaCard}
                            displayName={this.props.changeList.ownerDisplayName}
                            consumerId={consumerGuidBlameSection} />
                    }
                </div>
            </CenteredTooltipHost>)
    }

    @autobind
    private _setTargetElement(element: HTMLDivElement): void {
        this.targetElement = element;
    }

    @autobind
    private _handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._showPersonaCard();
        }
    }

    @autobind
    private _showPersonaCard(e?: React.MouseEvent<HTMLDivElement>): void {
            e && e.stopPropagation();
            this.setState({
                personaCardVisible: true,
            });
    }

    @autobind
    private _hidePersonaCard(): void {
        this.setState({
            personaCardVisible: false,
        });
    }
}
