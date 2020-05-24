import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import Controls = require("VSS/Controls");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import Menus = require("VSS/Controls/Menus");

/** Manages a set of adornment controls on a single editor */
export interface IAdornmentControlManager {
    /** Set the adornments to be rendered.  Existing adornment controls are removed. */
    setAdornments(adornments: AdornmentCommon.Adornment[]);
    /** Removes all adornment controls. */ 
    removeAdornments();
    /** Adds adornment controls. */
    addAdornments(adornments: AdornmentCommon.Adornment[]);
    /** Called when the status of an adornment control has changed. */
    onSetAdornmentStatus(adornmentId: number, statusId: string);
}

/** An adornment control styled to look identical to discussion comments. */
export class CommentStyleAdornmentControl {
    private _adornmentControlManager: IAdornmentControlManager;
    public  _adornment: AdornmentCommon.CommentStyleAdornment;
    private _$element: JQuery;
    private _statusMenubar: Menus.MenuBar;
    private _$commentTextArea: JQuery;
    private _$commentTextAreaMirror: JQuery;

    constructor(adornment: AdornmentCommon.CommentStyleAdornment, adornmentControlManager: IAdornmentControlManager) {
        this._adornmentControlManager = adornmentControlManager;
        this._adornment = adornment;
        this.drawAdornment();
    }

    /** Draws the adornment, including the outer discussion thread. */
    public drawAdornment() {
        this._$element = $("<div />")
            .addClass("discussion-thread");

        var $commentArrow = $("<div />")
            .addClass("comment-arrow")
            .css("left", 5 + "px") // Default comment arrow positioning for now
            .appendTo(this._$element)

        var $commentsContainer = $("<div />")
            .addClass("comments-container")
            .appendTo(this._$element);

        this.drawAdornmentComment($commentsContainer);
    }

    /** Draws the "comment" portion of the adornment. */
    public drawAdornmentComment($commentsContainer: JQuery) {
        var $comment = $("<div />")
            .addClass("discussion-comment")
            .appendTo($commentsContainer);

        this.drawIdentityPicture(this._adornment.authorImageUrl)
            .appendTo($comment);

        var $commentColumn = $("<div />")
            .addClass("comment-column")
            .appendTo($comment);

        var $commentContainer = $("<div />")
            .addClass("comment-container")
            .appendTo($commentColumn);

        this._$commentTextArea = this.drawCommentArea(this._adornment.text)
            .attr('readonly', 'readonly')
            .appendTo($commentContainer);

        // Create a mirror of the edit text area which is used to measure the necessary height
        // for the comments text box.
        this._$commentTextAreaMirror = $("<textarea />")
            .addClass("edit-area mirror")
            .css("height", "0px")
            .attr("tabIndex", "-1")
            .appendTo($commentContainer);

        var $statusLine = $("<div />")
            .addClass("discussion-comment-status")
            .appendTo($commentColumn);

        var $authorDisplay = this.drawAuthorDisplayName(this._adornment.author)
            .appendTo($statusLine);

        
        // If status options were specified, draw the status dropdown menu
        if (this._adornment.statusOptions && this._adornment.statusOptions.length) {
            var $statusAction = $("<span />").appendTo($statusLine)
                .text(DiscussionResources.DiscussionStatus)
                .addClass('status-action');

            var $dropdownAction = $("<a />").appendTo($statusAction)
                .addClass('dropdown-action');
        
            this._statusMenubar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $dropdownAction, {
                items: []
            });

            // By default, it tries to show an icon to the left of the dropdown item
            this._statusMenubar.setShowIcon(false);

            this.setStatusMenuItems();
        }
    }

    /** Draws the identity picture on the left side of the comment, which can be any image */
    public drawIdentityPicture(imgUrl: string): JQuery {
        var picContainer: JQuery;
        picContainer = $("<div />").addClass("picture-column")
        $("<img />")
            .attr("src", imgUrl)
            .addClass("identity-picture")
            .appendTo(picContainer);

        return picContainer;
    }

    /** Draws the author name (bottom left of the comment) */
    public drawAuthorDisplayName(name: string): JQuery {
        return $("<span />")
            .text(name);
    }

    /** Draws the textarea which holds the adornment content */
    public drawCommentArea(text: string): JQuery {
        return $("<textarea />")
            .addClass('edit-area')
            .val(text);
    }

    /** Called when the user selects a new status from the status dropdown */
    private _onSetStatus(statusId: string) {
        this._adornment.statusId = statusId;     
        this.setStatusMenuItems(); // Re-draw the status dropdown
        this._adornmentControlManager.onSetAdornmentStatus(this._adornment.id, this._adornment.statusId);
    }

    /** Sets the status dropdown options, including the currently selected status */
    public setStatusMenuItems() {
        var statusOptions = this._adornment.statusOptions;

        // Get the statusOption for the current selected status.  
        // Note that currentStatusOption will be undefined if the current status is not a valid option.
        var currentStatus = $.grep(statusOptions, (statusOption, index) => {
            return statusOption.id === this._adornment.statusId;
        })[0];

        // Default to the first option
        if (!currentStatus) {
            currentStatus = statusOptions[0];
        }
        
        // Add all status options to the dropdown
        var childItems = [];
        $.each(statusOptions, (index: number, statusOption: AdornmentCommon.StatusOption) => {
            childItems.push({
                id: statusOption.id,
                text: statusOption.text,
                title: statusOption.title,
                action: () => { this._onSetStatus.call(this, statusOption.id); }
            });
        });

        // Set the current status and child items (status options)
        this._statusMenubar.updateItems([{
            id: "select-comment-status",
            title: currentStatus ? currentStatus.title : null,
            text: currentStatus ? currentStatus.text : null,
            cssClass: "discussion-create-work-item-menu",
            childItems: childItems
        }]);
    }

    /** Updates the height of the comment text area, using an off-screen mirror to do the measurement */
    public updateCommentHeight() {
        var prevHeight = this._$commentTextArea.outerHeight(), newHeight;
        this._$commentTextAreaMirror.val(this._adornment.text);
        newHeight = this._$commentTextAreaMirror[0].scrollHeight + this._$commentTextAreaMirror.outerHeight();
        if (prevHeight === newHeight) {
            return false;
        }
        else {
            this._$commentTextArea.height(newHeight);
            return true;
        }
    }

    /** Appends the adornment to a container (e.g. a ZoneWidget in Monaco) */
    public appendTo($container: JQuery) {
        this._$element.appendTo($container);

        // Note: We call this again if we're using a Monaco ZoneWidget, since it isn't visible in the DOM yet
        this.updateCommentHeight();
    }
}
