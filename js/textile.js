
function jsToolBar(textarea) {
	if (!document.createElement) { return; }
	
	if (!textarea) { return; }
	
	if ((typeof(document["selection"]) == "undefined")
	&& (typeof(textarea["setSelectionRange"]) == "undefined")) {
		return;
	}
	
	this.textarea = textarea;
	
	this.editor = document.createElement('div');
	this.editor.className = 'jstEditor';
	
	this.textarea.parentNode.insertBefore(this.editor,this.textarea);
	this.editor.appendChild(this.textarea);
	
	this.toolbar = document.createElement("div");
	this.toolbar.className = 'jstElements';
	this.editor.parentNode.insertBefore(this.toolbar,this.editor);
	
	// Dragable resizing (only for gecko)
	if (this.editor.addEventListener)
	{
		this.handle = document.createElement('div');
		this.handle.className = 'jstHandle';
		var dragStart = this.resizeDragStart;
		var This = this;
		this.handle.addEventListener('mousedown',function(event) { dragStart.call(This,event); },false);
		// fix memory leak in Firefox (bug #241518)
		window.addEventListener('unload',function() { 
				var del = This.handle.parentNode.removeChild(This.handle);
				delete(This.handle);
		},false);
		
		this.editor.parentNode.insertBefore(this.handle,this.editor.nextSibling);
	}
	
	this.context = null;
	this.toolNodes = {}; // lorsque la toolbar est dessinée , cet objet est garni 
					// de raccourcis vers les éléments DOM correspondants aux outils.
}

function jsButton(title, fn, scope, className) {
    if(typeof jsToolBar.strings == 'undefined') {
      this.title = title || null;
    } else {
      this.title = jsToolBar.strings[title] || title || null;
    }
	this.fn = fn || function(){};
	this.scope = scope || null;
	this.className = className || null;
}

jsButton.prototype.draw = function() {
	if (!this.scope) return null;
	
	var button = document.createElement('button');
	button.setAttribute('type','button');
	button.tabIndex = 200;
	if (this.className) button.className = this.className;
	button.title = this.title;
	var span = document.createElement('span');
	span.appendChild(document.createTextNode(this.title));
	button.appendChild(span);
	
	if (this.icon != undefined) {
		button.style.backgroundImage = 'url('+this.icon+')';
	}
	if (typeof(this.fn) == 'function') {
		var This = this;
		button.onclick = function() { try { This.fn.apply(This.scope, arguments) } catch (e) {} return false; };
	}
	return button;
}


jsToolBar.prototype = {
	base_url: '',
	mode: 'wiki',
	elements: {},
	help_link: '',
	
	getMode: function() {
		return this.mode;
	},
	
	setMode: function(mode) {
		this.mode = mode || 'wiki';
	},
	
	switchMode: function(mode) {
		mode = mode || 'wiki';
		this.draw(mode);
	},
	
	setHelpLink: function(link) {
		this.help_link = link;
	},
	
	button: function(toolName) {
		var tool = this.elements[toolName];
		if (typeof tool.fn[this.mode] != 'function') return null;
		var b = new jsButton(tool.title, tool.fn[this.mode], this, 'jstb_'+toolName);
		if (tool.icon != undefined) b.icon = tool.icon;
		return b;
	},
	space: function(toolName) {
		var tool = new jsSpace(toolName)
		if (this.elements[toolName].width !== undefined)
			tool.width = this.elements[toolName].width;
		return tool;
	},
	combo: function(toolName) {
		var tool = this.elements[toolName];
		var length = tool[this.mode].list.length;

		if (typeof tool[this.mode].fn != 'function' || length == 0) {
			return null;
		} else {
			var options = {};
			for (var i=0; i < length; i++) {
				var opt = tool[this.mode].list[i];
				options[opt] = tool.options[opt];
			}
			return new jsCombo(tool.title, options, this, tool[this.mode].fn);
		}
	},
	draw: function(mode) {
		this.setMode(mode);
		
		// Empty toolbar
		while (this.toolbar.hasChildNodes()) {
			this.toolbar.removeChild(this.toolbar.firstChild)
		}
		this.toolNodes = {}; // vide les raccourcis DOM/**/

		var h = document.createElement('div');
		h.className = 'help'
		h.innerHTML = this.help_link;
		'<a href="/help/wiki_syntax.html" onclick="window.open(\'/help/wiki_syntax.html\', \'\', \'resizable=yes, location=no, width=300, height=640, menubar=no, status=no, scrollbars=yes\'); return false;">Aide</a>';
		this.toolbar.appendChild(h);

		// Draw toolbar elements
		var b, tool, newTool;
		
		for (var i in this.elements) {
			b = this.elements[i];

			var disabled =
			b.type == undefined || b.type == ''
			|| (b.disabled != undefined && b.disabled)
			|| (b.context != undefined && b.context != null && b.context != this.context);
			
			if (!disabled && typeof this[b.type] == 'function') {
				tool = this[b.type](i);
				if (tool) newTool = tool.draw();
				if (newTool) {
					this.toolNodes[i] = newTool; //mémorise l'accès DOM pour usage éventuel ultérieur
					this.toolbar.appendChild(newTool);
				}
			}
		}
	},
	
	singleTag: function(stag,etag) {
		stag = stag || null;
		etag = etag || stag;
		
		if (!stag || !etag) { return; }
		
		this.encloseSelection(stag,etag);
	},
	
	encloseLineSelection: function(prefix, suffix, fn) {
		this.textarea.focus();
		
		prefix = prefix || '';
		suffix = suffix || '';
		
		var start, end, sel, scrollPos, subst, res;
		
		if (typeof(document["selection"]) != "undefined") {
			sel = document.selection.createRange().text;
		} else if (typeof(this.textarea["setSelectionRange"]) != "undefined") {
			start = this.textarea.selectionStart;
			end = this.textarea.selectionEnd;
			scrollPos = this.textarea.scrollTop;
			// go to the start of the line
			start = this.textarea.value.substring(0, start).replace(/[^\r\n]*$/g,'').length;
			// go to the end of the line
            end = this.textarea.value.length - this.textarea.value.substring(end, this.textarea.value.length).replace(/^[^\r\n]*/, '').length;
			sel = this.textarea.value.substring(start, end);
		}
		
		if (sel.match(/ $/)) { // exclude ending space char, if any
			sel = sel.substring(0, sel.length - 1);
			suffix = suffix + " ";
		}
		
		if (typeof(fn) == 'function') {
			res = (sel) ? fn.call(this,sel) : fn('');
		} else {
			res = (sel) ? sel : '';
		}
		
		subst = prefix + res + suffix;
		
		if (typeof(document["selection"]) != "undefined") {
			document.selection.createRange().text = subst;
			var range = this.textarea.createTextRange();
			range.collapse(false);
			range.move('character', -suffix.length);
			range.select();
		} else if (typeof(this.textarea["setSelectionRange"]) != "undefined") {
			this.textarea.value = this.textarea.value.substring(0, start) + subst +
			this.textarea.value.substring(end);
			if (sel) {
				this.textarea.setSelectionRange(start + subst.length, start + subst.length);
			} else {
				this.textarea.setSelectionRange(start + prefix.length, start + prefix.length);
			}
			this.textarea.scrollTop = scrollPos;
		}
	},
	
	encloseSelection: function(prefix, suffix, fn) {
		this.textarea.focus();
		
		prefix = prefix || '';
		suffix = suffix || '';
		
		var start, end, sel, scrollPos, subst, res;
		
		if (typeof(document["selection"]) != "undefined") {
			sel = document.selection.createRange().text;
		} else if (typeof(this.textarea["setSelectionRange"]) != "undefined") {
			start = this.textarea.selectionStart;
			end = this.textarea.selectionEnd;
			scrollPos = this.textarea.scrollTop;
			sel = this.textarea.value.substring(start, end);
		}
		
		if (sel.match(/ $/)) { // exclude ending space char, if any
			sel = sel.substring(0, sel.length - 1);
			suffix = suffix + " ";
		}
		
		if (typeof(fn) == 'function') {
			res = (sel) ? fn.call(this,sel) : fn('');
		} else {
			res = (sel) ? sel : '';
		}
		
		subst = prefix + res + suffix;
		
		if (typeof(document["selection"]) != "undefined") {
			document.selection.createRange().text = subst;
			var range = this.textarea.createTextRange();
			range.collapse(false);
			range.move('character', -suffix.length);
			range.select();
//			this.textarea.caretPos -= suffix.length;
		} else if (typeof(this.textarea["setSelectionRange"]) != "undefined") {
			this.textarea.value = this.textarea.value.substring(0, start) + subst +
			this.textarea.value.substring(end);
			if (sel) {
				this.textarea.setSelectionRange(start + subst.length, start + subst.length);
			} else {
				this.textarea.setSelectionRange(start + prefix.length, start + prefix.length);
			}
			this.textarea.scrollTop = scrollPos;
		}
	},
	

};

jsToolBar.prototype.elements.strong = {
	type: 'button',
	title: 'Strong',
	fn: {
	wiki: function() { this.singleTag('*') }
	}
}

jsToolBar.prototype.elements.em = {
	type: 'button',
	title: 'Italic',
	fn: {
		wiki: function() { this.singleTag("_") }
	}
}

jsToolBar.prototype.elements.ins = {
	type: 'button',
	title: 'Underline',
	fn: {
		wiki: function() { this.singleTag('+') }
	}
}

jsToolBar.prototype.elements.h = {
	type: 'button',
	title: 'Heading',
	fn: {
	    wiki: function() { this.singleTag('<h>', '</h>') }
	}	
    }

jsToolBar.prototype.elements.ul = {
	type: 'button',
	title: 'Unordered list',
	fn: {
		wiki: function() {
			this.encloseLineSelection('','',function(str) {
				str = str.replace(/\r/g,'');
				return str.replace(/(\n|^)[#-]?\s*/g,"$1* ");
			});
		}
	}
}

jsToolBar.prototype.elements.rails_code = {
	type: 'button',
	title: 'rails_code',
	fn: {
		wiki: function() { this.singleTag('[code:ruby]\n', '\n[/code]') }
	}
}

jsToolBar.prototype.elements.other_code = {
	type: 'button',
	title: 'other_code',
	fn: {
		wiki: function() { this.singleTag('[code:lisp]\n', '\n[/code]') }
	}
}

jsToolBar.prototype.elements.link = {
	type: 'button',
	title: 'link',
	fn: {
		wiki: function() { this.singleTag("[link:", "]  [/link]") }
	}
}

jsToolBar.prototype.elements.img = {
	type: 'button',
	title: 'Image',
	fn: {
		wiki: function() { this.singleTag("[img]", "[/img]") }
	}
}

    jsToolBar.prototype.elements.green = {
	type: 'button',
	title: 'green',
	fn: {
	    wiki: function() { this.singleTag('[green]', '[/green]') }
	}
    }

jsToolBar.prototype.elements.blue = {
	type: 'button',
	title: 'blue',
	fn: {
	    wiki: function() { this.singleTag('[blue]', '[/blue]') }
	}
    }

jsToolBar.prototype.elements.red = {
	type: 'button',
	title: 'red',
	fn: {
	    wiki: function() { this.singleTag('[red]', '[/red]') }
	}
    }

jsToolBar.prototype.elements.purple = {
	type: 'button',
	title: 'purple',
	fn: {
	    wiki: function() { this.singleTag('[purple]', '[/purple]') }
	}
    }
