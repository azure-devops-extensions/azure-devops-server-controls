import "VSS/LoaderPlugins/Css!Discussion/Components/RenderedContent/RenderedContent";

import * as React from "react";
import { autobind, getNativeProps, htmlElementProperties } from "OfficeFabric/Utilities";
import { htmlEncode } from "VSS/Utils/UI";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

import { DiscussionRenderer, defaultMarkdownOptions } from "Discussion/Scripts/DiscussionRenderer";

export type TaskItemHandler = (newContent: string) => void;

export interface IRenderedContentProps extends React.HTMLProps<HTMLDivElement> {
    /**
     * The content to be rendered. Commonly this is markdown text that is to be run
     * through a markdown renderer to produce markup
     */
    content: string;

    /**
     * The renderer that should be run on the content.
     * If no renderer is supplied, then a default Discussion Renderer will be used
     * This makes it easy to just do <RenderedContent content=markdown/>
     * The reason you might not want to do this is performance. If you have multiple <RenderedContent> on your page,
     * you will get better performance if you can pass around a shared renderer.
     */
    render?: (discussion: string) => IPromise<JQuery>;

    /**
     * Optional data that you want handed back to you when a render pass is finished
     */
    renderPassData?: any;

    /**
     * Callback once a render pass is finished for any post processing you need to do
     */
    renderPassFinished?: (renderPassData: any, sizeChanged: boolean) => void;

    /**
     * If the markup contains clickable task lists, this callback will be triggered
     * and provide the content that will need to be used to swap the markdown from unchecked to checked
     */
    taskItemClicked?: TaskItemHandler;
}

/**
 * This component is for easy display of content created from an asynchronous renderer such as DiscussionRenderer
 * The reason the renderer is passed in instead of being hidden inside this component is that a renderer
 * carries enough overhead that you probably want to have a single renderer for many instances of RenderedContent
 */
export class RenderedContent extends React.Component<IRenderedContentProps, null> {
    private _renderElement: HTMLElement;
    private _everRendered: boolean;
    private _defaultRenderer: DiscussionRenderer;

    public render(): JSX.Element {
        return <div {...getNativeProps(this.props, htmlElementProperties) } >
            <div className={"discussion-renderedcontent"} ref={this._setRenderElement} />
        </div>;
    }

    public componentDidMount(): void {
        this._renderContent();
    }

    public shouldComponentUpdate(nextProps: IRenderedContentProps): boolean {
        let changed = this.props.content !== nextProps.content ||
            this.props.render !== nextProps.render ||
            this.props.taskItemClicked !== nextProps.taskItemClicked;
        return changed;
    }

    public componentDidUpdate(prevProps?: IRenderedContentProps): void {
        this._renderContent();
    }

    private _renderContent(): void {
        const { content, renderPassData, renderPassFinished } = this.props;

        if (content === null || content === undefined) {
            return;
        }

        let originalText = content;
        let $renderElement = $(this._renderElement);

        if (!this._everRendered) {
            //rendering is async, and so before the first pass has finished just show the text
            this._everRendered = true;
            let sanitizedText = htmlEncode(originalText);
            $renderElement.append($("<span>" + sanitizedText + "</span>"));
        }

        const previousHeight: number = (this._renderElement && this._renderElement.clientHeight) || 0;
        const previousWidth: number = (this._renderElement && this._renderElement.clientWidth) || 0;

        let renderMethod = this.props.render || (this._defaultRenderer && this._defaultRenderer.render);
        if (!renderMethod) {
            const markdownOptions = defaultMarkdownOptions();
            markdownOptions.sanitize = true;
            this._defaultRenderer = new DiscussionRenderer({ markdownOptions });
            renderMethod = this._defaultRenderer.render;
        }

        renderMethod(content).then((output: JQuery) => {
            $renderElement.empty();
            $renderElement.append(output);

            //when an image finishes loading, also need to update the size
            output.find('img').load(e => {
                if (renderPassFinished) {
                    renderPassFinished(this.props.renderPassData, true);
                }
            });

            connectTaskLists(this.props.taskItemClicked, content, output);

            const currentHeight: number = (this._renderElement && this._renderElement.clientHeight) || 0;
            const currentWidth: number = (this._renderElement && this._renderElement.clientWidth) || 0;
            if (renderPassFinished) {
                renderPassFinished(this.props.renderPassData, (currentHeight !== previousHeight || currentWidth !== previousWidth));
            }
        });
    }

    @autobind
    private _setRenderElement(element: HTMLElement): void {
        this._renderElement = element;
    }
};

/**
 * This is a bit tricky because we need to reverse markup -> markdown to figure out how to alter the original text based
 * on a checkbox in the markup being clicked. If a checkbox was checked, we make a list of all task items in the comment
 * and find that, for example, we checked the '3rd unchecked checkbox'
 * From that, we use a regexp to find the 3rd instance of (start of line) - [ ] stuff
 * And we alter the - [ ] portion to be - [x]
 * 
 * The altered string is passed back to the owner of what is being rendered to deal with it as needed
 */
export function connectTaskLists(handler: TaskItemHandler, content: string, output: JQuery): void {
    if(handler) {
        let checkboxes = output.find('input.task-list-item-checkbox');

        checkboxes.removeAttr('disabled');

        checkboxes.click(e => {
            handleTaskListClick(handler, e.currentTarget, content);
        });
    }
}

const taskListSearch = /^\s*(-|\*|(\d+\.))\s+\[( |x|X)\]/gm; // (start of line)(optional whitespace)(- or * or 1.)(required whitespace)([ ] or [x])

export function handleTaskListClick(handler: TaskItemHandler, targetElement: Element, content: string): void {
    let $targetElement = $(targetElement);
    let $listItemElement = $targetElement.closest(".task-list-item");
    let $listElement = $listItemElement.closest(".task-list");
    let $renderParent = $listElement.closest(".discussion-renderedcontent");

    if($renderParent.length === 1 && $listElement.length === 1 && $listItemElement.length === 1 && $targetElement.length === 1) {
        // gather all task list items where ever they may be and however far nested they may be
        let allListItems = $renderParent.find(".task-list-item");
        
        // figure out our position, as in the clicked task element is the 5th task list element in the comment
        let targetIndex = allListItems.toArray().indexOf($listItemElement[0]);

        // find a our place in the markdown text. So if we clicked the 5th task list item, find the 5th task list markdown text
        let matchResult = stringPositionOfNthMatch(content, taskListSearch, targetIndex);
        if(matchResult && matchResult.index >= 0) {
            let toReplace = matchResult[0];
            // whatever we found, flip it from either [ ] to [x] or visa versa
            let replacement = targetElement.checked ? 
                toReplace.substring(0, toReplace.lastIndexOf("[")) + "[x]" : 
                toReplace.substring(0, toReplace.lastIndexOf("[")) + "[ ]"

            let alteredContent = content.substring(0, matchResult.index) + content.substring(matchResult.index).replace(toReplace, replacement);
            handler(alteredContent);
        }
        else if(Diag.getDebugMode()) {
            console.error(Utils_String.format("task list item search failed.\nContent: {0},\npattern: {1},\ntargetIndex: {2}", content, taskListSearch, targetIndex));
        }
    }
}

function stringPositionOfNthMatch(str: string, pattern: RegExp, n: number): RegExpExecArray {
    let match = null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(str)) !== null) {
        if(--n < 0) {
            break;
        }
    }

    return match;
}