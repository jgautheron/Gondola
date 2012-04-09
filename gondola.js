/**
 * An image widget.
 * @author Jonathan Gautheron
 * @class Gondola
 * @inherits Widget
 **/
YUI.add('gondola', function(Y) {

    var Lang = Y.Lang,
        Node = Y.Node;

    function Gondola(config) {
        Gondola.superclass.constructor.apply(this, arguments);
    }

    Gondola.NAME = 'gondola';

    Gondola.ATTRS = {
        srcNode : {
            value : null,
            writeOnce : true
        },

        datasource : {
            value : null
        },

        cellHeight : {
            value : 60,
            writeOnce : true
        },

        fadeDuration : {
            value : 0.5,
            writeOnce : true
        },

        intervalDuration : {
            value : 4000,
            writeOnce : true
        }
    };

    Gondola.CLASS_PREFIX = Y.ClassNameManager.getClassName(Gondola.NAME) + '-';
    Gondola.ACTIVE_CLASS = Gondola.CLASS_PREFIX + 'active';

    Gondola.VIEWPORT         = Gondola.CLASS_PREFIX + 'images-viewport';
    Gondola.IMAGE_CONTAINER  = Gondola.CLASS_PREFIX + 'image';
    Gondola.IMAGES_CONTAINER = Gondola.CLASS_PREFIX + 'images';
    Gondola.IMAGES_ITEM      = Gondola.CLASS_PREFIX + 'images-item';
    Gondola.TITLE            = Gondola.CLASS_PREFIX + 'title';
    Gondola.PRICE            = Gondola.CLASS_PREFIX + 'price';

    Gondola.NAV_TOP          = Gondola.CLASS_PREFIX + 'top';
    Gondola.NAV_BOTTOM       = Gondola.CLASS_PREFIX + 'bottom';

    Gondola.IMAGE_TEMPLATE    = '<img src="{imgurl}" alt="" data-index="{index}" />';

    Gondola.IMAGES_CONTAINERS = '<ul class="' + Gondola.IMAGES_CONTAINER + '"></ul>';
    Gondola.IMAGES_TEMPLATE   = '<li class="' + Gondola.IMAGES_ITEM + '" data-index="{index}" data-title="{title}" data-price="{price}"><a href="{link}" style="background-image:url(\'{imgurl}\');"></a></li>';

    /* Gondola extends the base Widget class */
    Y.extend(Gondola, Y.Widget, {

        initializer: function(config) {
            this.intervalTimer = null;
            this.ongoingScroll = false;
            this.currentIndex = 1;
            this.currentScroll = 0;
            this.currentNode = null;
            this.currentTop = 0;
            this.images = this.get('datasource');
            this.link = null;

            this.viewport = this.get('srcNode').one('.' + Gondola.VIEWPORT);
            this.imageContainer = this.get('srcNode').one('.' + Gondola.IMAGE_CONTAINER);
            this.imagesContainers = null;
            this.containerHeight = parseInt('-' + (this.get('cellHeight') * (this.images.length)));

            this.title = this.get('srcNode').one('.' + Gondola.TITLE);
            this.price = this.get('srcNode').one('.' + Gondola.PRICE);

            this.publish('gondola:switch', { preventable: false, broadcast: 1 });
        },

        destructor : function() {
            //Y.detach('gondola|*');
            this._clearInterval();
        },

        renderUI : function() {
            this._renderImages();
        },

        bindUI : function() {
            this._bindNavigation();
        },

        syncUI : function() {
            this._syncNavigation();
            this._setInterval();
        },

        _clearInterval : function() {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        },

        _setInterval : function() {
            var intervalDuration = this.get('intervalDuration');
            if (intervalDuration > 0 && this.intervalTimer === null) {
                this.intervalTimer = window.setInterval(Y.bind(this._goNext, this), intervalDuration);
            }
        },

        _renderImages : function() {
            var i, node, image, nodeImage = [], nodeImages = {0 : [], 1 : []};
            for (i = 0; image = this.images[i++];) {
                nodeImages[0].push(Y.Node.create(Y.substitute(Gondola.IMAGES_TEMPLATE, {imgurl: image['Thumb'], title: image['Title'], link: image['Link'], price: image['Price'], index: i})));
                nodeImages[1].push(Y.Node.create(Y.substitute(Gondola.IMAGES_TEMPLATE, {imgurl: image['Thumb'], title: image['Title'], link: image['Link'], price: image['Price'], index: i})));

                nodeImage.push(Y.Node.create(Y.substitute(Gondola.IMAGE_TEMPLATE, {imgurl: image['Image'], index: i})).setStyle('opacity', 0));
            }

            this.imagesContainers = Y.all([
                Y.Node.create(Gondola.IMAGES_CONTAINERS).append(Y.all(nodeImages[0])),
                Y.Node.create(Gondola.IMAGES_CONTAINERS).append(Y.all(nodeImages[1]))
            ]);
            this.viewport.append(this.imagesContainers);
            this.imageContainer.prepend(Y.all(nodeImage));
        },

        _bindNavigation : function(type) {
            Y.delegate('click', Y.bind(this._onNavigationImage, this), this.viewport, 'li');

            var srcNode = this.get('srcNode');
            srcNode.one('.' + Gondola.NAV_TOP).on('click', Y.bind(function(e) { e.halt(); this._scrollTop(); }, this));
            srcNode.one('.' + Gondola.NAV_BOTTOM).on('click', Y.bind(function(e) { e.halt(); this._scrollDown(); }, this));
            srcNode.one('.' + Gondola.IMAGE_CONTAINER).on('click', Y.bind(this._imageClicked, this));
        },

        _syncNavigation : function(type) {
            var currentImage = this.imagesContainers.get('children');
            currentImage = Y.all([currentImage[0].item(0), currentImage[1].item(0)]);
            currentImage.addClass(Gondola.ACTIVE_CLASS);
            this.title.set('text', currentImage.item(0).getAttribute('data-title'));
            this.price.set('text', currentImage.item(0).getAttribute('data-price'));
            this.link = currentImage.item(0).get('firstChild').getAttribute('href');

            var lastItem = this.imageContainer.get('children').item(0);
            lastItem.addClass(Gondola.ACTIVE_CLASS);
            lastItem.setStyle('opacity', 1);

            var anim = new Y.Anim({
                node: this.imageContainer,
                duration: this.get('fadeDuration'),
                from: {
                    'opacity' : 0
                },
                to: {
                    'opacity' : 1
                }
            });
            anim.run();
        },

        _imageClicked : function() {
            document.location.href = this.link;
        },

        _onNavigationImage : function(e) {
            var node = e.currentTarget,
                index = parseInt(node.getAttribute('data-index'));

            e.preventDefault();
            this._goTo(index);
        },

        _scrollTop : function() {
            if (this.ongoingScroll) {
                return false;
            }
            var cellHeight = this.get('cellHeight');

            if (this.currentTop === 0) {
                this.currentTop = this.containerHeight;
                this.imagesContainers.setStyle('top', this.currentTop + 'px');
            }

            this.currentTop += cellHeight;
            this.imagesContainers.transition({
                duration: this.get('fadeDuration'),
                top: this.currentTop + 'px'
            }, Y.bind(function() {
                this.ongoingScroll = false;
                if (Math.abs(this.currentScroll) === this.images.length) {
                    this.imagesContainers.setStyle('top', 0);
                    this.currentScroll = this.currentTop = 0;
                }
            }, this));
            this.ongoingScroll = true;
            this.currentScroll--;
        },

        _scrollDown : function() {
            if (this.ongoingScroll) {
                return false;
            }
            var cellHeight = this.get('cellHeight');

            if (this.currentTop === 0) {
                this.currentTop = 0;
                this.imagesContainers.setStyle('top', 0);
            }

            this.currentTop -= cellHeight;
            this.imagesContainers.transition({
                duration: this.get('fadeDuration'),
                top: this.currentTop + 'px'
            }, Y.bind(function() {
                this.ongoingScroll = false;
                if (Math.abs(this.currentScroll) === this.images.length ||
                    this.containerHeight === this.currentTop
                    ) {
                    this.imagesContainers.setStyle('top', 0);
                    this.currentScroll = this.currentTop = 0;
                }
            }, this));
            this.ongoingScroll = true;
            this.currentScroll++;
        },

        _goPrevious : function() {
            var index = this.currentIndex;
            if (index <= 1) {
                index = this.images.length;
            } else {
                index = index - 1;
            }
            this._goTo(index);
        },

        _goNext : function() {
            var index = this.currentIndex;
            if (index >= this.images.length) {
                index = 1;
            } else {
                index = index + 1;
            }
            this._goTo(index);
        },

        _goTo : function(index) {
            if (this.ongoingScroll) {
                return false;
            }

            var imageContainer = this.imageContainer,
                node = this.imagesContainers.item(0).one('li[data-index=' + index + ']'),
                title = node.getAttribute('data-title'), price = node.getAttribute('data-price'),
                previousImage = imageContainer.one('img.' + Gondola.ACTIVE_CLASS),
                nextImage = imageContainer.one('img[data-index=' + index + ']'),
                link = node.one('a'), fadeDuration = this.get('fadeDuration');

            // redirect to the attached link if the user clicks on the menu item a second time
            if (this.currentIndex === index) {
                document.location.href = this.link;
                return false;
            }

            this.currentIndex = index;
            this.currentNode = node;

            // defines when we should scroll - to refactor (relative offsets or another kind of index)
            var indexScroll = this.currentIndex - this.currentScroll;
            console.log(indexScroll);
            switch (indexScroll) {
                case 1:
                case this.images.length + 1:
                    this._scrollTop();
                    break;
                case 4:
                case -6:
                case -2:
                case this.images.length + 4:
                    this._scrollDown();
                    break;
            }

            this.viewport.all('li').removeClass(Gondola.ACTIVE_CLASS);
            this.viewport.all('li[data-index=' + index + ']').addClass(Gondola.ACTIVE_CLASS);

            this.title.set('text', title);
            this.price.set('text', price);
            this.link = link.getAttribute('href');

            new Y.Anim({
                node: previousImage,
                duration: fadeDuration,
                from: {
                    'opacity' : 1
                },
                to: {
                    'opacity' : 0
                }
            }).run();

            new Y.Anim({
                node: nextImage,
                duration: fadeDuration,
                from: {
                    'opacity' : 0
                },
                to: {
                    'opacity' : 1
                }
            }).run();

            previousImage.removeClass(Gondola.ACTIVE_CLASS);
            nextImage.addClass(Gondola.ACTIVE_CLASS);

            this.fire('gondola:switch');
        }

    });

    Y.Gondola = Gondola;

}, '3.2.0', {requires:['widget', 'anim', 'node', 'substitute', 'transition']});
