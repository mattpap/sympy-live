
SymPy.SphinxShell = Ext.extend(SymPy.Shell, {

    render: function(el) {
        var el = el || Ext.getBody();

        this.baseEl = Ext.DomHelper.append(el, {
            tag: 'div',
            cls: 'sympy-live-base'
        }, true);

        this.logoEl = Ext.DomHelper.append(el, {
            tag: 'div',
            cls: 'sympy-live-logo',
            html: 'SymPy Live'
        }, true);

        this.logoEl.on('click', function() {
            this.showShell();
        }, this);

        var keyEvent = this.getKeyEvent();

        Ext.get(document).on(keyEvent, function(event) {
            var key = event.getKey();

            var alt = event.altKey;
            var ctrl = event.ctrlKey;
            var shift = event.shiftKey;

            if (key == SymPy.Keys.L && alt && ctrl && shift) {
                event.stopEvent();
                this.toggleShell();
            } else if (key == SymPy.Keys.J && alt) {
                event.stopEvent();
                this.focusNextBlock();
            } else if (key == SymPy.Keys.K && alt) {
                event.stopEvent();
                this.focusPrevBlock();
            } else if (key == SymPy.Keys.F && alt) {
                event.stopEvent();
                this.focusLastBlock();
            } else if (key == SymPy.Keys.D && alt) {
                event.stopEvent();
                this.focusLastBlock();
                this.editLastBlock();
            } else if (key == SymPy.Keys.E && alt) {
                event.stopEvent();
                this.focusLastBlock();
                this.evaluateLastBlock();
            } else if (key == SymPy.Keys.ESC) {
                event.stopEvent();
                this.hideShell();
                var edits = $(".sympy-live-edit");
                edits.prev().removeClass("sympy-live-editing").show();
                edits.remove();
            }
        }, this);

        this.headerEl = Ext.DomHelper.append(this.baseEl, {
            tag: 'div',
            cls: 'sympy-live-header',
            children: [{
                tag: 'a',
                href: 'http://sympy.org/',
                target: '_blank',
                html: 'SymPy'
            }, {
                tag: 'a',
                href: this.basePath || this.defaultBasePath,
                target: '_blank',
                html: 'Live'
            }, {
                tag: 'span',
                html: 'running on the'
            }, {
                tag: 'a',
                href: 'http://code.google.com/appengine/',
                target: '_blank',
                html: 'Google App Engine'
            }]
        }, true);

        this.hideEl = Ext.DomHelper.append(this.headerEl, {
            tag: 'a',
            cls: 'sympy-live-hide',
            html: 'hide'
        }, true);

        this.hideEl.on('click', function(event) {
            this.hideShell();
        }, this);

        SymPy.SphinxShell.superclass.render.call(this, this.baseEl);
        this.hideShell();
    },

    hideShell: function() {
        this.disablePrompt();
        this.baseEl.hide();
        this.logoEl.show();
    },

    showShell: function() {
        this.logoEl.hide();
        this.baseEl.show();
        this.enablePrompt();
    },

    toggleShell: function() {
        if (this.baseEl.isVisible()) {
            this.hideShell();
        } else {
            this.showShell();
        }
    },

    handleKey: function(event) {
        var result = SymPy.SphinxShell.superclass.handleKey.call(this, event);

        if (result) {
            return result;
        } else {
            switch (event.getKey()) {
            case SymPy.Keys.H:
                if (event.altKey && !event.ctrlKey) {
                    this.hideShell();
                    return true;
                }

                break;
            }

            return false;
        }
    },

    focusPrevBlock: function() {
        var blocks = $(".sympy-live-block").toArray();

        var last = this.lastFocusedBlock;
        var prev = blocks[blocks.indexOf(last)-1];

        if (prev) {
            prev.focus();
        } else {
            blocks[blocks.length-1].focus();
        }
    },

    focusNextBlock: function() {
        var blocks = $(".sympy-live-block").toArray();

        var last = this.lastFocusedBlock;
        var next = blocks[blocks.indexOf(last)+1];

        if (next) {
            next.focus();
        } else {
            blocks[0].focus();
        }
    },

    focusLastBlock: function() {
        if (!this.lastFocusedBlock) {
            this.lastFocusedBlock = $(".sympy-live-block:first")[0];
        }

        $(this.lastFocusedBlock).focus();
    },

    evaluateLastBlock: function() {
        if (this.lastFocusedBlock) {
            var last = this.lastFocusedBlock;
            var code = this.codes[last.id];
            this.evaluateCode(code);
        }
    },

    editLastBlock: function() {
        if (this.lastFocusedBlock) {
            var last = $(this.lastFocusedBlock);

            if (!last.hasClass("sympy-live-editing")) {
                last.addClass("sympy-live-editing");
                last.hide();

                var code = this.codes[this.lastFocusedBlock.id];

                var edit = Ext.DomHelper.insertAfter(this.lastFocusedBlock, {
                    tag: "textarea",
                    cls: 'sympy-live-edit',
                    rows: code.split("\n").length
                });

                $(edit).blur(function(event) {
                    last.removeClass("sympy-live-editing").show();
                    $(this).remove();
                }, this);

                $(edit).val(code);
                $(edit).focus();
            }
        }
    },

    processBlocks: function(node) {
        var children = node.childNodes;
        var that = this;

        function isPrompt(obj) {
            return SymPy.getDOMText(obj).indexOf('>>>') === 0;
        }

        function isContinuation(obj) {
            return SymPy.getDOMText(obj).indexOf('...') === 0;
        }

        var counter = 0;

        function createBlock() {
            var el = document.createElement('a');
            el.href = "javascript://"

            // XXX: this hack is required in Google Chrome because
            // focus on click of <a> elements doesn't work at all.
            $(el).click(function(event) {
                if (!$('*:focus').length) {
                    $(this).trigger('focus');
                }
            });

            $(el).focus(function(event) {
                that.lastFocusedBlock = this;
            });

            return el;
        }

        var blocks = [];

        if ((children.length > 0) && isPrompt(children[0])) {
            var lines = [];
            var line = [];

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                line.push(child);

                if (/\n+$/.test(SymPy.getDOMText(child))) {
                    lines.push(line);
                    line = [];
                }
            }

            if (line.length) {
                lines.push(line);
            }

            var elements = [];
            var content = null;

            function cloneNodes(line) {
                for (var i = 0; i < line.length; i++) {
                    content.appendChild(line[i].cloneNode(true));
                }
            }

            function copyNodes(line) {
                for (var i = 0; i < line.length; i++) {
                    elements.push(line[i]);
                }
            }

            function pushContent() {
                var child = content.lastChild,
                    postfix = null;

                if (SymPy.isTextNode(child)) {
                    var text = SymPy.getDOMText(child);

                    if (/(\n+)$/.test(text)) {
                        var newlines = RegExp.$1;

                        if (newlines.length > 1) {
                            content.removeChild(child);

                            var i = text.length - newlines.length + 1;

                            var textPrefix = text.substring(0, i);
                            var textPostfix = text.substring(i);

                            content.appendChild(document.createTextNode(textPrefix));
                            postfix = document.createTextNode(textPostfix);
                        }
                    }
                }

                elements.push(content);

                if (postfix) {
                    elements.push(postfix);
                }
            }

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];

                if (isPrompt(line[0])) {
                    if (content) {
                        pushContent();
                        content = null;
                    }

                    content = createBlock();
                    blocks.push(content);
                    cloneNodes(line);
                } else if (isContinuation(line[0])) {
                    if (content) {
                        cloneNodes(line);
                    } else {
                        copyNodes(line);
                    }
                } else {
                    if (content) {
                        pushContent();
                        content = null;
                    }

                    copyNodes(line);
                }
            }

            if (content) {
                elements.push(content);
            }

            while (node.childNodes.length >= 1) {
                node.removeChild(node.firstChild);
            }

            for (var i = 0; i < elements.length; i++) {
                node.appendChild(elements[i]);
            }
        } else {
            var block = createBlock();

            while (node.childNodes.length >= 1) {
                var child = node.firstChild;
                block.appendChild(child.cloneNode(true));
                node.removeChild(child);
            }

            node.appendChild(block);
            blocks = [block]
        }

        Ext.each(blocks, function(block) {
            Ext.get(block).addClass('sympy-live-block');
        });

        return blocks;
    },

    processElements: function() {
        var selector = 'div.highlight-python pre';
        var nodes = Ext.DomQuery.select(selector);

        this.codes = {};

        Ext.each(nodes, function(node) {
            var el = Ext.get(node);
            var blocks;

            if (el.hasClass('sympy-live-element')) {
                blocks = Ext.DomQuery.select('.sympy-live-block', node);
            } else {
                blocks = this.processBlocks(node);
            }

            Ext.each(blocks, function(block) {
                var code = SymPy.getDOMText(block);
                var prompt = null;

                if (code.indexOf(">>> ") === 0) {
                    var lines = code.split('\n');

                    for (var j = 0; j < lines.length; j++) {
                        lines[j] = lines[j].substr(4);
                    }

                    code = lines.join('\n');
                    prompt = block.firstChild;
                }

                code = code.replace(/\n+$/, "");
                this.codes[block.id] = code;

                if (prompt) {
                    var el = Ext.get(prompt);

                    el.addClass('sympy-live-python-prompt');
                    el.on('click', function(event) {
                        this.evaluateCode(code);
                    }, this);
                }

                var toolbar = Ext.DomHelper.append(block, {
                    tag: 'div',
                    cls: 'sympy-live-block-toolbar'
                }, true);

                Ext.DomHelper.append(toolbar, {
                    tag: 'span',
                    html: 'Evaluate'
                }, true).on('click', function(event) {
                    this.evaluateCode(code);
                }, this);

                Ext.DomHelper.append(toolbar, {
                    tag: 'span',
                    html: 'Copy'
                }, true).on('click', function(event) {
                    this.copyCode(code);
                }, this);

                Ext.get(block).on('click', function(event) {
                    if (!event.shiftKey && event.ctrlKey && !event.altKey) {
                        event.stopEvent();
                        this.editLastBlock();
                    }
                }, this);
            }, this);
        }, this);
    },

    evaluateCode: function(code) {
        this.copyCode(code);
        this.evaluate();
    },

    copyCode: function(code) {
        this.setValue(code);
        this.updateHistory(code);
        this.updatePrompt();
        this.showShell();
    }
});

if (!window.MathJax) {
    SymPy.loadScript(SymPy.MATHJAX_CDN, function() {
        if (!window.MathJax) {
            console.warning("MathJax in not available");
        }
    });
}

Ext.onReady(function() {
    var shell = new SymPy.SphinxShell({baseName: 'live-sphinx.js'});
    shell.render();
    shell.processElements();
});
