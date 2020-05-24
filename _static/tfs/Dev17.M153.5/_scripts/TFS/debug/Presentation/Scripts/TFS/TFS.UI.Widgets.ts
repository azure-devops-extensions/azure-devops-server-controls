/// <amd-dependency path="jQueryUI/core"/>
/// <amd-dependency path="jQueryUI/widget"/>
/// <amd-dependency path='VSS/LoaderPlugins/Css!widget' />

import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

function doesKeyMatch(keyDefinition, event) {
    // If keyDefinition.altKey or keyDefinition.ctrlKey is undefined, ! will cast it to true
    if (keyDefinition.keyCode === event.keyCode &&
        (keyDefinition.altKey === event.altKey) &&
        (keyDefinition.ctrlKey === event.ctrlKey)) {
        return true;
    }
    else {
        return false;
    }
}

$.widget('TFS.Dropdown', {

    options: {

        dynamicSearch: false,
        filterList: false,
        id: null,
        initialValue: '',
        listSize: 8,
        showDelete: false,
        showListOnKeystroke: true,

        _elements: {
            _autoComplete: null,
            _container: null,
            _control: null,
            _input: null,
            _search: null,
            _list: null,
            _searching: null
        },

        _autoCompleteValue: null,
        _previousValue: null,
        _valueList: [],
        _searchActive: false,
        _searchResult: false,
        _stateIcon: null,
        _addStackDepth: 0 // used to keep track of recursion depth when calling add function
    },

    _create: function () {

        // Assign the control a unique identitifer
        this.options._control_id = Math.random();

        // Build up the control within the target element
        this.element.append('<div class="dropdown-input-control">' +
            '<div class="dropdown-input-main">' +
            '<div class="dropdown-input-inputarea">' +
            '<input autocomplete="off" class="dropdown-input-text dropdown-input-autocomplete" readonly tabIndex="-1" type="text" />' +
            '<div class="dropdown-input-blank"></div>' +
            '<input autocomplete="off" class="dropdown-input-text dropdown-input-name" spellcheck="false" type="text" />' +
            '</div>' +
            '<div class="dropdown-input-search" tabindex="0" role="button"></div>' +
            '</div>' +
            '<div class="dropdown-popup">' +
            '<div class="dropdown-input-list-container boxshadow">' +
            '<ul class="dropdown-input-list"></ul>' +
            '<div class="dropdown-input-list-searching status-text"></div>' +
            '<div class="dropdown-input-list-no-results status-text"></div>' +
            '</div>' +
            '</div>' +
            '</div>');

        // Pull out the relevant elements for the control
        this.options._elements._control = this.element.find('.dropdown-input-main');
        this.options._elements._autoComplete = this.element.find('.dropdown-input-autocomplete');
        this.options._elements._input = this.element.find('.dropdown-input-name');
        this.options._elements._search = this.element.find('.dropdown-input-search');
        this.options._elements._container = this.element.find('.dropdown-input-list-container');
        this.options._elements._list = this.element.find('.dropdown-input-list');
        this.options._elements._searching = this.element.find('.dropdown-input-list-searching').text(Resources_Platform.Searching);
        this.options._elements._noResults = this.element.find('.dropdown-input-list-no-results').text(Resources_Platform.NoSearchResults);

        // Add the Id to the input control if one was requested
        if (this.options.id) {
            this.options._elements._input.attr('id', this.options.id);
            this.options._elements._input.attr('name', this.options.id);
        }

        // Update the initial value of the control
        if (this.options.initialValue) {
            this.setValue(this.options.initialValue);
        }

        // If a watermark was supplied apply the widget to our input element
        if (this.options.watermarkText) {
            Utils_UI.Watermark(this.options._elements._input, {
                watermarkText: this.options.watermarkText
            });
        }

        // Initialize the state of the control
        this._updateControlState();

        // Handle the user clicking on the searching icon
        this.options._elements._search.bind('click', this, function (event) {
            event.data._handleClick();
        });

        this.options._elements._search.bind('keydown', this, function (event) {
            if (event.keyCode === $.ui.keyCode.SPACE || event.keyCode === $.ui.keyCode.ENTER) {
                event.data._handleClick();
            }
        });

        // If a searchHotkey was defined we need to check if this key is pressed
        this.options._elements._input.bind('keydown', this, function (event) {
            event.data._handleKeyDown(event);
        });

        // Attach to the set of events on the input control to handle the
        // filtering of the list as well as the auto-complete value and
        // position
        this.options._elements._input.bind('keydown', this, function (event) {
            event.data._alignValue();
        });
        this.options._elements._input.bind('keyup', this, function (event) {
            event.data._handleTextChange();
        });
        this.options._elements._input.bind('focusin', this, function (event) {
            event.data.options._elements._autoComplete.show();
        });
        this.options._elements._input.bind('focusout', this, function (event) {
            event.data.options._elements._autoComplete.hide();
        });
        this.options._elements._input.bind('mousedown', this, function (event) {

            // Make sure the auto complete area is lined up with the input
            $(document).bind('mousemove.Dropdown', event.data, function (event) {
                event.data._alignValue();
            });

            $(document).bind('mouseup', event.data, function (event) {
                event.data._alignValue();

                // Remove this event handler
                $(document).unbind('mousemove.Dropdown');
                $(document).unbind(event);
            });
        });

        // Attach to the start/end/cancel Search event to perform the default behavior
        this.element.bind('startSearch', this, function (event, params) {
            event.data._startSearch(event, params);
        });
        this.element.bind('completeSearch', this, function (event, params) {
            event.data._completeSearch(event, params);
        });
        this.element.bind('cancelSearch', this, function (event, params) {
            event.data._cancelSearch(event, params);
        });
        this.options._elements._list.bind('mousemove', this, function (event, params) {
            event.data._trackMousePosition(event);
        });

        // handle events that change the state of the control element values
        this.element.bind('removeItem', this, function (event, params) {
            event.data._removeItem(event, params);
        });
    },

    add: function (items, index?: number) {

        this.options._addStackDepth++;
        if (jQuery.isArray(items)) {

            // Go through each item in the array and add them to the list
            for (index = 0; index < items.length; index++) {
                this.add(items[index]);
            }
        }
        else if (jQuery.isFunction(items)) {
            this.add(items());
        }
        else {
            this._addItem(items, index);
        }
        this.options._addStackDepth--;

        if (this.options._addStackDepth === 0) {
            this._updateControlState();
        }
    },

    clear: function () {

        // Remove all items from the ui and the backing list
        this.options._elements._list.find('.dropdown-input-listitem').remove();
        this.options._valueList = [];

        // Update any state of the control now the list has been cleared
        this._updateControlState();
    },

    remove: function (value) {
        this.element.trigger('removeItem', { value: value });
    },

    hideList: function (focusControl) {

        this.options._elements._control.removeClass('dropdown-active');
        this.options._elements._container.hide();

        // Set focus to the input control if requested
        if (focusControl) {
            this.options._elements._input.focus();
            this.options._elements._autoComplete.show();
        }

        // Release our global event listener
        $(document).unbind('mousedown.Dropdown' + this.options._control_id);

        // Update the state icon now that the list is closed
        this._updateStateIcon();

        // Notify any who which to know that the list has been hidden
        this.element.trigger('listHidden');
    },

    showList: function (focusControl) {

        // Size the dropdown select list to the size of the input control
        this.options._elements._container.width(this.element.outerWidth() -
            (this.options._elements._container.outerWidth(true) - this.options._elements._container.width()) -
            parseInt(this.element.css('padding-left'), 10) -
            parseInt(this.element.css('border-left-width'), 10));

        this.options._elements._control.addClass('dropdown-active');
        this.options._elements._container.show();

        Utils_UI.Positioning.position(this.options._elements._container, this.element, {
            elementAlign: 'right-top',
            baseAlign: 'right-bottom'
        });

        // Set focus to the input control if requested
        if (focusControl) {
            this.options._elements._input.focus();
            this.options._elements._autoComplete.show();
        }

        // We need to bind to the document's mousedown so we can close the list
        // if we click outside the list area.
        $(document).bind('mousedown.Dropdown' + this.options._control_id, this, function (event) {

            // If we have clicked outside our control, hide dropdown
            if ($(event.target).parents('.dropdown-input-control').parent().get(0) !== event.data.element.get(0)) {
                event.data.hideList(false);
            }
        });

        // Update the state of the control now that list is visible
        this._updateControlState();

        // Notify any who which to know that the list has been shown
        this.element.trigger('listShown');
    },

    ensureVisible: function (value) {

        var specifiedItem = this.getListItem(value);
        if (specifiedItem) {
            this._ensureVisible(specifiedItem);
        }
    },

    getControlState: function () {

        // If the list is visible we are in the process of running a query
        // or viewing a result.
        if (this.options._searchActive) {
            return 'searching';
        } else if (this.options._elements._list.is(':visible')) {
            return 'active';
        }
        return 'inactive';
    },

    getListItem: function (value) {
        var foundItem, lowerValue,
            comparison, start, mid, end;

        if (!isNaN(value)) {
            foundItem = this.options._valueList[value];
        }
        else {
            lowerValue = value.toLowerCase();

            // Perform binary search
            start = 0;
            end = this.options._valueList.length - 1;

            // Determine the location of element with value in list
            while (start <= end) {
                mid = Math.round((start + end) / 2);

                if (lowerValue < this.options._valueList[mid].lowerValue) {
                    comparison = -1;
                    end = mid - 1;
                } else if (lowerValue > this.options._valueList[mid].lowerValue) {
                    comparison = 1;
                    start = mid + 1;
                }
                else {
                    comparison = 0;
                    break;
                }
            }

            if (comparison === 0) {
                foundItem = this.options._valueList[mid];
            }
        }

        return foundItem;
    },

    highlight: function (value) {

        // Retrieve the item to highlight, null will be an invalid item
        var currentHighlightedItem, specifiedItem = this.getListItem(value);

        if (specifiedItem) {

            // Do nothing if this item is already highlighted
            if (specifiedItem.value !== this.highlightedValue()) {

                // Remove the highlight class from the currently highlighted item
                currentHighlightedItem = this.options._elements._list.find('.highlighted');
                currentHighlightedItem.removeClass('highlighted');

                // Now update the highlighted item
                specifiedItem.element.addClass('highlighted');
            }

            // Make sure the highlighted item is visible in the list
            this._ensureVisible(specifiedItem);
        }
    },

    highlightedValue: function () {

        // Determine the element from the list that is currently highlighted
        var highlightedItem = this.options._elements._list.find('.dropdown-input-listitem.highlighted');

        if (highlightedItem.length > 0) {
            return highlightedItem.text();
        }
        else {
            return null;
        }
    },

    select: function (value, focusControl) {
        var specifiedItem = this.getListItem(value),
            args;

        if (specifiedItem) {
            args = { item: specifiedItem.item, canceled: false };

            // Notify the application that an item is being selected.
            this.element.trigger('itemSelecting', args);
            if (!args.canceled) {
                this.setValue(specifiedItem.value);
                this.hideList(focusControl);

                // Notify the application that an item has been selected
                this.element.trigger('itemSelected', { item: specifiedItem.item });
                return true;
            }
            else {
                this.hideList(focusControl);
                return false;
            }
        }
        else {
            return false;
        }
    },

    getValue: function () {
        return this.options._elements._input.val();
    },

    setValue: function (value) {

        // Update the value of the input control
        this.options._elements._input.val(value);

        // Handle the text changing to update the auto-complete and other status
        this._handleTextChange();
    },

    cancelSearch: function (focusControl) {
        this.element.trigger('cancelSearch', { focusControl: focusControl });
    },

    completeSearch: function () {
        this.element.trigger('completeSearch');
    },

    startSearch: function (focusControl) {
        this.element.trigger('startSearch', { focusControl: focusControl });
    },

    _addItem: function (item, index?: number) {

        var elementMarkup = '',
            addedElement = null,
            nextElement = null,
            value = item.text === undefined ? item : item.text,
            lowerValue = value.toLowerCase(),
            comparison = 0,
            start = 0,
            mid = 0,
            end = this.options._valueList.length - 1,
            searchKey = value,

            pendingItem = {
                deny: null,
                item: item
            };

        // Generate an event to allow the caller to deny items
        this.element.trigger('filterItem', pendingItem);

        // If the element wasn't filtered out add the element to the list.
        if (!pendingItem.deny) {

            // Determine the location of insertion into the list.

            if (index === undefined || index === null) {
                while (start <= end) {
                    mid = Math.round((start + end) / 2);

                    if (lowerValue < this.options._valueList[mid].lowerValue) {
                        comparison = -1;
                        end = mid - 1;
                    } else if (lowerValue > this.options._valueList[mid].lowerValue) {
                        comparison = 1;
                        start = mid + 1;
                    }
                    else {
                        comparison = 0;
                        break;
                    }
                }

                // Make sure we offset to the next slot if we were after the mid item
                if (comparison > 0) {
                    mid++;
                }
            }
            else {
                mid = index;
                searchKey = index;
            }

            // If we are inserting before an item get the nextElement
            if (mid < this.options._valueList.length) {
                nextElement = this.options._valueList[mid].element;
            }

            // Setup the delete element if the list wants delete
            if (this.options.showDelete) {
                elementMarkup =
                '<li class="dropdown-input-listitem deletable">' +
                '<div class="dropdown-input-listitem-value" />' +
                '<div class="dropdown-input-listitem-delete" />' +
                '</li>';
            }
            else {
                elementMarkup = '<li class="dropdown-input-listitem"><div class="dropdown-input-listitem-value" /></li>';
            }

            // Add the item to the list of available values
            if (!nextElement) {
                this.options._elements._list.append(elementMarkup);
                addedElement = this.options._elements._list.children().last();
            }
            else {
                nextElement.before(elementMarkup);
                addedElement = nextElement.prev();
            }

            // Update the displayed value for this element
            addedElement.children('.dropdown-input-listitem-value').text(value);

            // Add the item to the internal list withs its element
            this.options._valueList.splice(mid, 0, {
                element: addedElement,
                lowerValue: lowerValue,
                markup: elementMarkup,
                value: value,
                item: item,
                visible: true
            });

            // Add handlers to each list element to take care of actions
            addedElement.bind('click', this, function (event) {
                event.data.select(searchKey, true);
            });
            addedElement.bind('mousemove', this, function (event) {
                if (!$(this).hasClass('highlighted') && event.data._trackMousePosition(event)) {
                    event.data.highlight(searchKey);
                }
            });

            // Signup for the click event on the delete element (if it exists)
            if (this.options.showDelete) {
                addedElement.find('.dropdown-input-listitem-delete').bind('click', this, function (event) {
                    event.data.element.trigger('removeItem', { value: $(this).parents('.dropdown-input-listitem').text() });
                    event.preventDefault();
                    event.stopPropagation();
                });
            }
        }
    },

    _removeItem: function (event, params) {

        // Get the item
        var specifiedItem = this.getListItem(params.value);
        if (specifiedItem) {

            // Remove the specified item and the value from the internal list
            this.options._valueList.splice(specifiedItem.element.index(), 1);
            specifiedItem.element.remove();

            if (this.options._elements._list.find('.dropdown-input-listitem').length === 0) {
                this.cancelSearch();
            }

            // Update the controls state with this item removed
            this._updateControlState(true);

            // Notify the application of the removed item
            this.element.trigger('itemRemoved', { value: params.value });
        }
    },

    _alignValue: function () {

        // Make sure the values line up between the typed text and the autocomplete
        this.options._elements._autoComplete.scrollLeft(this.options._elements._input.scrollLeft());
    },

    _ensureVisible: function (item) {
        var visibleIndex, top, bottom, outerHeight,
            i, currentItem, visibleItemCount = 0;

        // Determine the visible index of this item
        for (i = 0; i < this.options._valueList.length; i++) {
            currentItem = this.options._valueList[i];
            if (currentItem.visible) {
                if (currentItem.element === item.element) {
                    visibleIndex = visibleItemCount;
                    break;
                }
                visibleItemCount++;
            }
        }
        if (visibleIndex === undefined) {
            visibleIndex = -1;
        }

        // Compute the top of the item.
        outerHeight = item.element.outerHeight(true);
        top = visibleIndex * outerHeight;
        bottom = top + outerHeight;

        // Determine if the entire item is visible in the dropdown list
        if (top < this.options._elements._list.scrollTop()) {
            this.options._elements._list.scrollTop(top);
        }
        else if (bottom - this.options._elements._list.height() > this.options._elements._list.scrollTop()) {
            this.options._elements._list.scrollTop(bottom - this.options._elements._list.height());
        }
    },

    _trackMousePosition: function (event) {

        if (this.options._lastMouseX !== event.pageX || this.options._lastMouseY !== event.pageY) {

            this.options._lastMouseX = event.pageX;
            this.options._lastMouseY = event.pageY;
            return true;
        }
        else {
            return false;
        }
    },

    _updateControlState: function (ignoreAutoComplete) {

        var lowercaseValue,
            matchedValue,
            currentValue = this.options._elements._input.val(),
            matchedIndex,
            itemsInList = 0,
            bestIndex = 2048,
            itemIndex,
            item;

        // Clear the current autocomplete value for and lookup the new one
        this.options._autoCompleteValue = null;

        // Show and hide the elements based on whether or not this item
        // matches the current filter value.
        lowercaseValue = currentValue.toLowerCase();

        for (itemIndex = 0; itemIndex < this.options._valueList.length; itemIndex++) {

            // Retrieve the object from the array
            item = this.options._valueList[itemIndex];

            if ((matchedIndex = item.lowerValue.indexOf(lowercaseValue)) === -1) {

                // If the current value doesn't match the value, unhighlight
                if (item.element.hasClass('highlighted')) {
                    item.element.removeClass('highlighted');
                }

                // If the list is filtering unmatched items hide them when they dont match
                if (this.options.filterList) {
                    item.element.hide();
                    item.visible = false;
                }
                else {
                    itemsInList++;
                }
            }
            else {

                // If the priorityValue hasnt been set the first match is the priority
                if (matchedIndex < bestIndex && currentValue.length > 0) {
                    if (!ignoreAutoComplete) {
                        this.options._autoCompleteValue = item.value;
                    }
                    bestIndex = matchedIndex;
                }

                // Make sure this element is visible in the list.
                if (this.options.filterList) {
                    item.element.show();
                    item.visible = true;
                }

                itemsInList++;
            }
        }

        // Update the inline auto complete
        if (this.options._autoCompleteValue && this.options._autoCompleteValue.toLowerCase().indexOf(lowercaseValue) === 0) {

            // Make sure the case of what is typed matches so the text lines up
            matchedValue = currentValue + this.options._autoCompleteValue.substring(currentValue.length);

            // Update the inline autocomplete background text
            this.options._elements._autoComplete.val(matchedValue);
        }
        else {
            this.options._elements._autoComplete.val('');
        }

        // Size the list based on the number of items in the list and
        // the maximum number in the configured to show.
        if (itemsInList > 0) {
            this.options._elements._noResults.hide();
            this.options._elements._list.show();

            // If there are not enough elements to scroll remove explicit
            // size and high the overflow.
            if (itemsInList <= this.options.listSize) {
                this.options._elements._list.removeClass('overflow');
                this.options._elements._list.height('');
            }
            else {
                this.options._elements._list.addClass('overflow');
                this.options._elements._list.height(Math.min(itemsInList, this.options.listSize) *
                    this.options._elements._list.find('.dropdown-input-listitem').last().outerHeight(true));
            }
        }
        else {
            this.options._elements._list.height(Math.max(20, this.options._elements._list.find('.dropdown-input-listitem').first().outerHeight(true)));
            if (!this.options._elements._searching.is(':visible')) {
                this.options._elements._noResults.show();
                this.options._elements._list.hide();
            }
            else {
                this.options._elements._noResults.hide();
                this.options._elements._list.show();
            }
        }

        // If there is no value in the input box we need to reset
        // to the initial state
        if (this.options._autoCompleteValue) {
            this.highlight(this.options._autoCompleteValue);
        }
        else if (currentValue.length === 0) {
            this.highlight(0);
        }

        // Make sure the state icon is properly set.
        this._updateStateIcon();
    },

    _updateStateIcon: function () {

        // Remove all image styles then apply the one for the current state
        if (this.options._stateIcon) {
            this.options._elements._search.removeClass(this.options._stateIcon);
        }

        // Handle the active and completed search state.
        if (this.options._searchActive) {
            this.options._stateIcon = 'img_redx';
        }
        else if (this.options._searchResult) {
            this.options._stateIcon = 'img_grayx';
        }
        else if (this.options.dynamicSearch) {
            this.options._stateIcon = 'img_magnify';
            this.options._elements._search.attr("aria-label", Resources_Platform.IdentityPicker_PlaceholderTextUser);
        }
        else if (this.options._elements._container.is(':visible')) {
            this.options._stateIcon = 'img_collapse';
        } else {
            this.options._stateIcon = 'img_expand';
        }
        this.options._elements._search.addClass(this.options._stateIcon);
    },

    _handleClick: function () {

        // If the search is currently active or a result is visible we
        // need to cancel the search result
        if (this.options._searchActive || this.options._searchResult) {
            this.cancelSearch(true);
        } else if (this.options._elements._list.is(':visible')) {
            this.hideList(true);
        } else {
            this.startSearch(true);
        }
    },

    _handleFocusOut: function () {

        if (this.getControlState() !== 'inactive') {
            this.hideList(false);
        }
    },

    /**
     * @param event 
     * @return 
     */
    _handleKeyDown: function (event) {

        var preventDefault = false,
            specifiedItem;

        // If the searchHotkey was pressed, we need to trigger a state change
        if (this.options.searchHotkey) {
            if (doesKeyMatch(this.options.searchHotkey, event)) {
                this.startSearch(true);
                preventDefault = true;
            }
        }

        // If the tabkey is used and the result is active accept the currently
        // selected item as input.
        if (event.keyCode === 9) {
            if (this.getControlState() === 'active' ||
                (this.options._elements._autoComplete.is(':visible') &&
                    this.options._autoCompleteValue)) {
                this.select(this.options._autoCompleteValue, false);
            }

            if (this.getControlState() !== 'inactive') {
                this.hideList(false);
            }
        }

        // Handle the search transition from the enter key
        else if (event.keyCode === 13) {
            if (this.getControlState() === 'active') {
                if (this.select(this.highlightedValue(), true)) {
                    preventDefault = true;
                }
            }
        }

        // If a search is active and Esc is hit cancel the active search
        else if (event.keyCode === 27) {
            if (this.getControlState() !== 'inactive') {
                this.hideList(true);
                preventDefault = true;
            }
        }

        // Handle the up and down arrow keys
        else if (event.keyCode === 38) {
            specifiedItem = this.getListItem(this.highlightedValue());
            if (specifiedItem) {
                specifiedItem = specifiedItem.element.prevAll().filter(':visible').first();
                if (specifiedItem.length > 0) {
                    this.highlight(specifiedItem.text());
                }
            }
            preventDefault = true;
        }
        else if (event.keyCode === 40) {
            if (this.getControlState() === 'inactive') {
                if (this.options._searchResult) {
                    this.showList(true);
                }
                else {
                    this.startSearch(true);
                }
            }
            else {
                specifiedItem = this.getListItem(this.highlightedValue());
                if (specifiedItem) {
                    specifiedItem = specifiedItem.element.nextAll().filter(':visible').first();
                    if (specifiedItem.length > 0) {
                        this.highlight(specifiedItem.text());
                    }
                }
                else {
                    this.highlight(0);
                }
            }
            preventDefault = true;
        }

        else if (this.options.comboOnly) {
            // Eat all other keypresses if comboOnly
            preventDefault = true;
        }

        // Prevent the default action from occurring if we handled it
        if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
    },

    _handleTextChange: function () {

        var currentValue;

        // Determine if the value from the input have changed
        currentValue = this.options._elements._input.val();
        if (currentValue !== this.options._previousValue) { 

            // If the list is not visible and the filter string matches any
            // elements we need to show the list.
            if (currentValue.length > 0 && this.options.showListOnKeystroke && this.options._valueList.length > 0 && this.getControlState() === 'inactive') {
                this.showList(true);
            }

            // Make sure we update the state of the control based on the text change
            this._updateControlState();

            // Notify the application the value may have changed
            this.element.trigger('valueUpdated', { value: currentValue });

            // Save the string last used in a filter query
            this.options._previousValue = currentValue;
        }

        // Make sure the values are aligned after this change the relative
        // position can change even without the text changing
        this._alignValue();
    },

    /**
     * @param event 
     * @return 
     */
    _cancelSearch: function (event, params) {

        // Mark the control as having an active search
        this.options._searchActive = false;
        this.options._searchResult = false;

        // When a search is cancelled clear the search results
        if (this.options.dynamicSearch) {
            this.clear();
        }

        // Make sure the searching listitem is hidden
        this.hideList(params && params.focusControl);
    },

    /**
     * @param event 
     * @return 
     */
    _completeSearch: function (event, params) {

        // Mark the control as having an active search
        this.options._searchActive = false;

        // Make sure the searching listitem is hidden
        this.options._elements._searching.hide();

        if (this.options.dynamicSearch) {
            this.options._searchResult = true;
        }

        // Set focus to the input control if requested
        if (params && params.focusControl) {
            this.options._elements._input.focus();
            this.options._elements._autoComplete.show();
        }

        // Update the auto-complete based on the completed search
        this._updateControlState();
    },

    /**
     * @param event 
     * @return 
     */
    _startSearch: function (event, params) {

        // Don't allow two active search requests
        if (this.getControlState() === 'searching') {
            return;
        }

        // Mark the control as having an active search
        this.options._searchActive = true;

        // If support dynamic searching clear the list and trigger the
        if (this.options.dynamicSearch) {

            // Clear the list of any existing elements
            this.clear();
            this.options._elements._searching.show();
        }
        else {
            this.completeSearch();
        }

        // Show the list now that we have started the search
        this.showList(params && params.focusControl);

        // If support dynamic searching clear the list and trigger the
        if (this.options.dynamicSearch) {

            // First trigger the querySearch then complete the search.
            event.data.element.trigger('querySearch', { value: event.data.getValue() });
        }
    }
});

$.widget('TFS.DropdownList', {

    options: {
        items: []
    },

    _create: function () {

        var dropdownOptions = $.extend({
            dynamicSearch: false,
            filterList: false
        }, this.options);

        // If a dropdown control wasn't supplied attach to it
        this.options._dropdownControl = this.element.Dropdown(dropdownOptions).data('TFS-Dropdown');
        this.options._dropdownControl.add(this.options.items);
    }
});

interface JQueryExt extends JQuery {
    Dropdown(...args: any[]): JQuery;
    DropdownList(...args: any[]): JQuery;
}

export function Dropdown(element: JQuery, ...args: any[]): JQuery {
    return (<JQueryExt>element).Dropdown.apply(element, args);
}

export function DropdownList(element: JQuery, ...args: any[]): JQuery {
    return (<JQueryExt>element).DropdownList.apply(element, args);
}